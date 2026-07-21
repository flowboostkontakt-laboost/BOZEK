import { Body, Controller, Delete, ForbiddenException, Get, Post, Query } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { NormsService } from "./norms.service";
import { CreateEntryDto, CreateTaskDto, WorkerAttendanceDto } from "./dto";

/**
 * Endpointy pracownicy. ZASADA: żadna odpowiedź nie zawiera kwot, cen ani premii
 * — pracownica widzi wyłącznie własne procentowe postępy (spec 2.1).
 */
@Roles(Role.WORKER)
@Controller("worker")
export class WorkerController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly norms: NormsService,
  ) {}

  private emp(user: AuthUser): string {
    if (!user.employeeId) throw new ForbiddenException("Konto bez przypisanej pracownicy");
    return user.employeeId;
  }

  /** Tylko procenty — do pierścieni postępu. Tydzień = ruchome ostatnie 7 dni. */
  @Get("me/progress")
  async progress(@CurrentUser() user: AuthUser) {
    const employeeId = this.emp(user);
    const [day, week, month] = await Promise.all([
      this.norms.dayProgress(employeeId),
      this.norms.weekProgress(employeeId),
      this.norms.monthProgress(employeeId),
    ]);
    return { dayPct: day.pct, weekPct: week.pct, monthPct: month.pct };
  }

  /** Katalog produktów dla pracownicy (bez cen — dyskrecja). Do wyszukiwania po 4 cyfrach i skanu. */
  @Get("products")
  async products() {
    const list = await this.prisma.product.findMany({
      where: { active: true },
      include: { category: { select: { name: true } } },
      orderBy: { name: "asc" },
      take: 1000,
    });
    return list.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category.name,
      last4: p.last4 ?? "",
      barcode: p.barcode ?? "",
    }));
  }

  @Get("entries/recent")
  async recent(@CurrentUser() user: AuthUser) {
    const list = await this.prisma.productionEntry.findMany({
      where: { employeeId: this.emp(user) },
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    return list.map((e) => ({
      name: e.product?.name ?? e.customLabel ?? "Zadanie",
      qty: e.quantity,
      time: e.createdAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
    }));
  }

  /** Zapis wykonanego produktu. Wartość normy liczona po stronie serwera i ukryta. */
  @Post("entries")
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateEntryDto) {
    const value = await this.norms.entryValue(dto.productId, dto.quantity);
    const entry = await this.prisma.productionEntry.create({
      data: {
        employeeId: this.emp(user),
        productId: dto.productId,
        quantity: dto.quantity,
        method: dto.method,
        status: "CONFIRMED",
        normValuePln: value.toFixed(2),
      },
    });
    return { id: entry.id, ok: true };
  }

  /** Zadanie niestandardowe → kolejka „Do sprawdzenia" (wycena przez admina). */
  @Post("tasks")
  async task(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    const entry = await this.prisma.productionEntry.create({
      data: {
        employeeId: this.emp(user),
        customLabel: dto.label,
        quantity: 1,
        method: "MANUAL_ID",
        status: "PENDING_REVIEW",
      },
    });
    return { id: entry.id, status: "PENDING_REVIEW" };
  }

  // ─── Czas pracy („Zaczęłam pracę") ──────────────────────────────────

  @Get("shift/current")
  async shiftCurrent(@CurrentUser() user: AuthUser) {
    const s = await this.prisma.workSession.findFirst({
      where: { employeeId: this.emp(user), endedAt: null },
      orderBy: { startedAt: "desc" },
    });
    return { active: !!s, startedAt: s?.startedAt ?? null };
  }

  @Post("shift/start")
  async shiftStart(@CurrentUser() user: AuthUser) {
    const employeeId = this.emp(user);
    await this.autoMarkWorkToday(employeeId);
    const open = await this.prisma.workSession.findFirst({ where: { employeeId, endedAt: null } });
    if (open) return { startedAt: open.startedAt, alreadyActive: true };
    const s = await this.prisma.workSession.create({ data: { employeeId } });
    return { startedAt: s.startedAt };
  }

  /**
   * „Start pracy" automatycznie oznacza dziś jako dzień pracy w kalendarzu.
   * Nie nadpisuje ręcznego wpisu (np. gdyby dziś był oznaczony urlop) —
   * tworzy WORK tylko, gdy dnia jeszcze nie ma.
   */
  private async autoMarkWorkToday(employeeId: string): Promise<void> {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    const existing = await this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date } },
    });
    if (existing) return;
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    await this.prisma.attendance.create({
      data: { employeeId, date, type: "WORK", hours: emp ? Number(emp.defaultHours) : 8 },
    });
  }

  @Post("shift/stop")
  async shiftStop(@CurrentUser() user: AuthUser) {
    const employeeId = this.emp(user);
    const open = await this.prisma.workSession.findFirst({
      where: { employeeId, endedAt: null },
      orderBy: { startedAt: "desc" },
    });
    if (!open) return { ok: false, minutes: 0 };
    const endedAt = new Date();
    await this.prisma.workSession.update({ where: { id: open.id }, data: { endedAt } });
    return { ok: true, minutes: Math.round((endedAt.getTime() - open.startedAt.getTime()) / 60000) };
  }

  // ─── Statystyki pracownicy (tylko procenty i sztuki — dyskrecja) ────

  @Get("me/stats")
  async stats(@CurrentUser() user: AuthUser) {
    const employeeId = this.emp(user);
    const [day, week, month] = await Promise.all([
      this.norms.dayProgress(employeeId),
      this.norms.weekProgress(employeeId),
      this.norms.monthProgress(employeeId),
    ]);
    const now = new Date();
    const startDay = new Date(now);
    startDay.setHours(0, 0, 0, 0);
    // Ruchome 7 dni: dziś + 6 poprzednich (spójne z weekProgress).
    const startWeek = new Date(startDay);
    startWeek.setDate(startWeek.getDate() - 6);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [today, weekAgg, monthAgg] = await Promise.all([
      this.prisma.productionEntry.aggregate({
        _sum: { quantity: true },
        where: { employeeId, status: "CONFIRMED", createdAt: { gte: startDay } },
      }),
      this.prisma.productionEntry.aggregate({
        _sum: { quantity: true },
        where: { employeeId, status: "CONFIRMED", createdAt: { gte: startWeek } },
      }),
      this.prisma.productionEntry.aggregate({
        _sum: { quantity: true },
        where: { employeeId, status: "CONFIRMED", createdAt: { gte: startMonth } },
      }),
    ]);
    return {
      dayPct: day.pct,
      weekPct: week.pct,
      monthPct: month.pct,
      todayUnits: today._sum.quantity ?? 0,
      weekUnits: weekAgg._sum.quantity ?? 0,
      monthUnits: monthAgg._sum.quantity ?? 0,
    };
  }

  // ─── Kalendarz pracownicy (własne urlopy / chorobowe / praca) ───────

  /** Obecności pracownicy w danym miesiącu (domyślnie bieżący). */
  @Get("me/attendance")
  async attendance(@CurrentUser() user: AuthUser, @Query("month") month?: string) {
    const employeeId = this.emp(user);
    const ref = month ? new Date(`${month}-01T00:00:00`) : new Date();
    const from = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const to = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
    const list = await this.prisma.attendance.findMany({
      where: { employeeId, date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
    });
    return list.map((a) => ({ date: a.date.toISOString().slice(0, 10), type: a.type, hours: Number(a.hours) }));
  }

  /** Oznaczenie własnego dnia (urlop/chorobowe/praca). */
  @Post("me/attendance")
  async setAttendance(@CurrentUser() user: AuthUser, @Body() dto: WorkerAttendanceDto) {
    const employeeId = this.emp(user);
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    const hours = dto.type === "WORK" ? (emp ? Number(emp.defaultHours) : 8) : 0;
    const saved = await this.prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date } },
      update: { type: dto.type, hours },
      create: { employeeId, date, type: dto.type, hours },
    });
    return { date: saved.date.toISOString().slice(0, 10), type: saved.type };
  }

  /** Wyczyszczenie oznaczenia własnego dnia. */
  @Delete("me/attendance")
  async clearAttendance(@CurrentUser() user: AuthUser, @Query("date") dateStr: string) {
    const employeeId = this.emp(user);
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    await this.prisma.attendance.deleteMany({ where: { employeeId, date } });
    return { ok: true };
  }
}
