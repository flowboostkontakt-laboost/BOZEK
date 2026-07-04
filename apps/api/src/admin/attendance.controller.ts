import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { AttendanceDto } from "./dto";

/** Kalendarz i obecności — urlopy/chorobowe nie obniżają wyniku miesięcznego. */
@Roles(Role.ADMIN)
@Controller("admin/attendance")
export class AttendanceController {
  constructor(private readonly prisma: PrismaService) {}

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
}
