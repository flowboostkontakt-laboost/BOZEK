import { Body, ConflictException, Controller, Get, Param, Patch, Post } from "@nestjs/common";
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
    const login = dto.login.trim();
    const taken = await this.prisma.user.findUnique({ where: { login } });
    if (taken) throw new ConflictException("Login jest już zajęty");

    const employee = await this.prisma.employee.create({
      data: {
        name: dto.name.trim(),
        baseNormPln: dto.baseNormPln,
        defaultHours: dto.defaultHours ?? 8,
        vacationDaysPerYear: dto.vacationDaysPerYear ?? 26,
      },
    });
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.create({
      data: { login, passwordHash, role: Role.WORKER, employeeId: employee.id },
    });
    // Zwracamy pełny wiersz (jak w list) — front od razu podmienia dane bez zgadywania.
    return this.one(employee.id);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateEmployeeDto) {
    // Zmiana loginu/hasła dotyczy powiązanego konta User.
    if (dto.login !== undefined || dto.password) {
      const login = dto.login?.trim();
      if (login) {
        const taken = await this.prisma.user.findFirst({
          where: { login, employeeId: { not: id } },
        });
        if (taken) throw new ConflictException("Login jest już zajęty");
      }
      await this.prisma.user.updateMany({
        where: { employeeId: id },
        data: {
          ...(login ? { login } : {}),
          ...(dto.password ? { passwordHash: await bcrypt.hash(dto.password, 10) } : {}),
        },
      });
    }

    await this.prisma.employee.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        baseNormPln: dto.baseNormPln,
        defaultHours: dto.defaultHours,
        vacationDaysPerYear: dto.vacationDaysPerYear,
        active: dto.active,
      },
    });
    return this.one(id);
  }

  /** Pojedyncza pracownica w tym samym kształcie co lista. */
  private async one(id: string) {
    return this.prisma.employee.findUnique({
      where: { id },
      include: { user: { select: { login: true, active: true } } },
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
