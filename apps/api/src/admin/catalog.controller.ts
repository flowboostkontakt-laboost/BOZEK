import { Body, Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { ProductOverrideDto, UpdateCategoryDto } from "./dto";

@Roles(Role.ADMIN)
@Controller("admin/catalog")
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("categories")
  categories() {
    return this.prisma.category.findMany({ orderBy: { name: "asc" } });
  }

  /** Domyślny przelicznik % dla kategorii (Opaski 50%, Turbany 100% itd.). */
  @Patch("categories/:id")
  updateCategory(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.prisma.category.update({ where: { id }, data: { normPct: dto.normPct } });
  }

  @Get("products")
  products(@Query("q") q?: string) {
    return this.prisma.product.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : {},
      include: { category: true },
      orderBy: { name: "asc" },
      take: 100,
    });
  }

  /** Nadpisanie przelicznika normy dla pojedynczego produktu. */
  @Patch("products/:id/override")
  override(@Param("id") id: string, @Body() dto: ProductOverrideDto) {
    return this.prisma.product.update({
      where: { id },
      data: { normPctOverride: dto.normPctOverride ?? null },
    });
  }
}
