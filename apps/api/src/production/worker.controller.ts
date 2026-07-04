import { Body, Controller, ForbiddenException, Get, Post } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { NormsService } from "./norms.service";
import { CreateEntryDto, CreateTaskDto } from "./dto";

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

  /** Tylko procenty — do pierścieni postępu. */
  @Get("me/progress")
  async progress(@CurrentUser() user: AuthUser) {
    const employeeId = this.emp(user);
    const [day, month] = await Promise.all([
      this.norms.dayProgress(employeeId),
      this.norms.monthProgress(employeeId),
    ]);
    return { dayPct: day.pct, monthPct: month.pct };
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
}
