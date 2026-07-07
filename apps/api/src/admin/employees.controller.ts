import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { Roles } from "../auth/decorators/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEmployeeDto, UpdateEmployeeDto } from "./dto";

@Roles(Role.ADMIN)
@Controller("admin/employees")
export class EmployeesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.employee.findMany({
      orderBy: { name: "asc" },
      include: { user: { select: { login: true, active: true } } },
    });
  }

  /** Wpisy pracownicy z dziś (produkty + zadania) — do rozwinięcia karty na dashboardzie. */
  @Get(":id/entries")
  async entries(@Param("id") id: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const list = await this.prisma.productionEntry.findMany({
      where: { employeeId: id, createdAt: { gte: start } },
      include: { product: { include: { category: true } } },
      orderBy: { createdAt: "desc" },
    });
    return list.map((e) => ({
      name: e.product?.name ?? e.customLabel ?? "Zadanie",
      qty: e.quantity,
      category: e.product?.category.name ?? null,
      pricePln: Number(e.product?.pricePln ?? 0),
      valuePln: Number(e.normValuePln ?? 0),
      isTask: !e.productId,
      status: e.status,
    }));
  }

  @Post()
  async create(@Body() dto: CreateEmployeeDto) {
    const employee = await this.prisma.employee.create({
      data: { name: dto.name, baseNormPln: dto.baseNormPln, defaultHours: dto.defaultHours ?? 8 },
    });
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.create({
      data: { login: dto.login, passwordHash, role: Role.WORKER, employeeId: employee.id },
    });
    return { id: employee.id };
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateEmployeeDto) {
    return this.prisma.employee.update({
      where: { id },
      data: {
        baseNormPln: dto.baseNormPln,
        defaultHours: dto.defaultHours,
        active: dto.active,
      },
    });
  }

  /** Blokowanie / odblokowanie konta pracownicy. */
  @Patch(":id/toggle-active")
  async toggle(@Param("id") id: string) {
    const emp = await this.prisma.employee.findUnique({ where: { id } });
    const active = !emp?.active;
    await this.prisma.employee.update({ where: { id }, data: { active } });
    await this.prisma.user.updateMany({ where: { employeeId: id }, data: { active } });
    return { id, active };
  }
}
