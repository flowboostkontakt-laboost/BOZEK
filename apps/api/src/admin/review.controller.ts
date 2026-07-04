import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { ApproveReviewDto } from "./dto";

/** Kolejka „Do sprawdzenia" — zadania niestandardowe i nierozpoznane produkty. */
@Roles(Role.ADMIN)
@Controller("admin/review")
export class ReviewController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  pending() {
    return this.prisma.productionEntry.findMany({
      where: { status: "PENDING_REVIEW" },
      include: { employee: { select: { name: true } }, product: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Akceptacja + ręczna wycena pozycji przez administratora. */
  @Post(":id/approve")
  approve(@Param("id") id: string, @Body() dto: ApproveReviewDto) {
    return this.prisma.productionEntry.update({
      where: { id },
      data: { status: "CONFIRMED", normValuePln: dto.normValuePln },
    });
  }

  @Delete(":id")
  reject(@Param("id") id: string) {
    return this.prisma.productionEntry.delete({ where: { id } });
  }
}
