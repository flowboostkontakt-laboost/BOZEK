import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { CalendarService } from "./calendar.service";
import { AttendanceDto } from "./dto";

/** Kalendarz i obecności — urlopy/chorobowe nie obniżają wyniku miesięcznego. */
@Roles(Role.ADMIN)
@Controller("admin/attendance")
export class AttendanceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: CalendarService,
  ) {}

  /** Zestawienie roczne pracownic: godziny +/−, dni, urlop do końca roku, chorobowe. */
  @Get("overview")
  overview(@Query("year") year?: string) {
    return this.calendar.overview(year ? Number(year) : new Date().getFullYear());
  }

  /** Daty urlopu i chorobowego pracownicy (po wejściu w osobę). */
  @Get("dates/:employeeId")
  dates(@Param("employeeId") employeeId: string, @Query("year") year?: string) {
    return this.calendar.dates(employeeId, year ? Number(year) : new Date().getFullYear());
  }

  @Get()
  list(@Query("employeeId") employeeId: string, @Query("month") month?: string) {
    const ref = month ? new Date(`${month}-01T00:00:00`) : new Date();
    const from = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const to = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
    return this.prisma.attendance.findMany({
      where: { employeeId, date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
    });
  }

  @Post()
  upsert(@Body() dto: AttendanceDto) {
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);
    const hours = dto.hours ?? 8;
    return this.prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: dto.employeeId, date } },
      update: { type: dto.type, hours },
      create: { employeeId: dto.employeeId, date, type: dto.type, hours },
    });
  }

  /** Wyczyszczenie oznaczenia dnia (korekta admina). */
  @Delete()
  async clear(@Query("employeeId") employeeId: string, @Query("date") dateStr: string) {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    await this.prisma.attendance.deleteMany({ where: { employeeId, date } });
    return { ok: true };
  }
}
