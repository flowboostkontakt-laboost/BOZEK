import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { Role } from "@prisma/client";
import { obowiazujaceProgi, premiaZaMiesiac } from "@sep/shared";
import { Roles } from "../auth/decorators/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { NormsService } from "../production/norms.service";
import { BonusTierDto } from "./dto";

/**
 * System premiowy — konfiguracja progów i podgląd naliczonych premii (tylko admin).
 *
 * Progi z employeeId = null są DOMYŚLNE (obowiązują wszystkie pracownice).
 * Pracownica z własnymi progami ma nimi NADPISANY cały komplet domyślny.
 */
@Roles(Role.ADMIN)
@Controller("admin/bonus")
export class BonusController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly norms: NormsService,
  ) {}

  /**
   * Progi dla wskazanego zakresu:
   *   /tiers                 → progi domyślne (globalne)
   *   /tiers?employeeId=xyz  → progi indywidualne tej pracownicy
   */
  @Get("tiers")
  tiers(@Query("employeeId") employeeId?: string) {
    return this.prisma.bonusTier.findMany({
      where: { employeeId: employeeId || null },
      orderBy: { thresholdPct: "asc" },
    });
  }

  @Post("tiers")
  create(@Body() dto: BonusTierDto) {
    return this.prisma.bonusTier.create({
      data: {
        thresholdPct: dto.thresholdPct,
        amountPln: dto.amountPln,
        label: dto.label,
        employeeId: dto.employeeId || null,
      },
    });
  }

  @Delete("tiers/:id")
  remove(@Param("id") id: string) {
    return this.prisma.bonusTier.delete({ where: { id } });
  }

  /** Kasuje wszystkie progi indywidualne pracownicy → wraca na progi domyślne. */
  @Delete("tiers/employee/:employeeId")
  async reset(@Param("employeeId") employeeId: string) {
    const { count } = await this.prisma.bonusTier.deleteMany({ where: { employeeId } });
    return { employeeId, removed: count };
  }

  /**
   * Podgląd premii: dla każdej pracownicy liczony jej obowiązującym kompletem progów.
   * `indywidualne` mówi UI, czy zadziałał komplet własny czy domyślny.
   */
  @Get("preview")
  async preview() {
    const all = await this.prisma.bonusTier.findMany({ where: { active: true } });
    const shape = (t: (typeof all)[number]) => ({
      thresholdPct: t.thresholdPct,
      amountPln: Number(t.amountPln),
    });
    const domyslne = all.filter((t) => t.employeeId === null).map(shape);

    const employees = await this.prisma.employee.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });

    const out: {
      employeeId: string;
      name: string;
      monthPct: number;
      premiaPln: number;
      indywidualne: boolean;
    }[] = [];

    for (const e of employees) {
      const wlasne = all.filter((t) => t.employeeId === e.id).map(shape);
      const { progi, indywidualne } = obowiazujaceProgi(wlasne, domyslne);
      const m = await this.norms.monthProgress(e.id);
      out.push({
        employeeId: e.id,
        name: e.name,
        monthPct: m.pct,
        premiaPln: premiaZaMiesiac(m.pct, progi),
        indywidualne,
      });
    }
    return out;
  }
}
