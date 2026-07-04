import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { Role } from "@prisma/client";
import { premiaZaMiesiac } from "@sep/shared";
import { Roles } from "../auth/decorators/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { NormsService } from "../production/norms.service";
import { BonusTierDto } from "./dto";

/** System premiowy — konfiguracja progów i podgląd naliczonych premii (tylko admin). */
@Roles(Role.ADMIN)
@Controller("admin/bonus")
export class BonusController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly norms: NormsService,
  ) {}

  @Get("tiers")
  tiers() {
    return this.prisma.bonusTier.findMany({ orderBy: { thresholdPct: "asc" } });
  }

  @Post("tiers")
  create(@Body() dto: BonusTierDto) {
    return this.prisma.bonusTier.create({
      data: { thresholdPct: dto.thresholdPct, amountPln: dto.amountPln, label: dto.label },
    });
  }

  @Delete("tiers/:id")
  remove(@Param("id") id: string) {
    return this.prisma.bonusTier.delete({ where: { id } });
  }

  /** Automatyczny podgląd premii na podstawie realizacji normy miesięcznej. */
  @Get("preview")
  async preview() {
    const tiers = await this.prisma.bonusTier.findMany({ where: { active: true } });
    const shaped = tiers.map((t) => ({ thresholdPct: t.thresholdPct, amountPln: Number(t.amountPln) }));
    const employees = await this.prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } });

    const out: { name: string; monthPct: number; premiaPln: number }[] = [];
    for (const e of employees) {
      const m = await this.norms.monthProgress(e.id);
      out.push({ name: e.name, monthPct: m.pct, premiaPln: premiaZaMiesiac(m.pct, shaped) });
    }
    return out;
  }
}
