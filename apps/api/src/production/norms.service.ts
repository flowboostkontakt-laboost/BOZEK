import { Injectable } from "@nestjs/common";
import { normaEfektywnaDnia, normaMiesieczna, procentNormy, wartoscPozycji } from "@sep/shared";
import type { AttendanceDay } from "@sep/shared";
import { PrismaService } from "../prisma/prisma.service";

function num(d: unknown): number {
  return d == null ? 0 : Number(d);
}

export interface Progress {
  done: number;
  norm: number;
  pct: number;
}

/** Agregacja postępów norm — łączy dane z bazy z silnikiem @sep/shared. */
@Injectable()
export class NormsService {
  constructor(private readonly prisma: PrismaService) {}

  private startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  private endOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  /** Wartość pozycji produktowej w przeliczeniu na normę. */
  async entryValue(productId: string, quantity: number): Promise<number> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });
    if (!product) return 0;
    return wartoscPozycji(
      num(product.pricePln),
      product.category.normPct,
      quantity,
      product.normPctOverride ?? undefined,
    );
  }

  async dayProgress(employeeId: string, date: Date = new Date()): Promise<Progress> {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return { done: 0, norm: 0, pct: 0 };

    const att = await this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: this.startOfDay(date) } },
    });
    const hours = att ? num(att.hours) : num(employee.defaultHours);
    const norm = normaEfektywnaDnia(num(employee.baseNormPln), hours);

    const agg = await this.prisma.productionEntry.aggregate({
      _sum: { normValuePln: true },
      where: {
        employeeId,
        status: "CONFIRMED",
        createdAt: { gte: this.startOfDay(date), lte: this.endOfDay(date) },
      },
    });
    const done = num(agg._sum.normValuePln);
    return { done, norm, pct: procentNormy(done, norm) };
  }

  async monthProgress(employeeId: string, ref: Date = new Date()): Promise<Progress> {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return { done: 0, norm: 0, pct: 0 };

    const from = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const to = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);

    const attendance = await this.prisma.attendance.findMany({
      where: { employeeId, date: { gte: from, lte: to } },
    });
    const days: AttendanceDay[] = attendance.map((a) => ({
      date: a.date.toISOString().slice(0, 10),
      type: a.type,
      hours: num(a.hours),
    }));
    const norm = normaMiesieczna(num(employee.baseNormPln), days);

    const agg = await this.prisma.productionEntry.aggregate({
      _sum: { normValuePln: true },
      where: { employeeId, status: "CONFIRMED", createdAt: { gte: from, lte: to } },
    });
    const done = num(agg._sum.normValuePln);
    return { done, norm, pct: procentNormy(done, norm) };
  }
}
