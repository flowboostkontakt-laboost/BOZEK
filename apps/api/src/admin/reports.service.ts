import { Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { PrismaService } from "../prisma/prisma.service";

export interface ReportFilter {
  from?: Date;
  to?: Date;
  employeeId?: string;
  category?: string;
}

const HEADERS = ["Data", "Pracownica", "Kategoria", "Szt.", "Cena (PLN)", "Wartość (PLN)"];

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async rows(f: ReportFilter) {
    const entries = await this.prisma.productionEntry.findMany({
      where: {
        status: "CONFIRMED",
        ...(f.from || f.to
          ? { createdAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } }
          : {}),
        ...(f.employeeId ? { employeeId: f.employeeId } : {}),
        ...(f.category ? { product: { category: { name: f.category } } } : {}),
      },
      include: { employee: { select: { name: true } }, product: { include: { category: true } } },
      orderBy: { createdAt: "desc" },
    });
    return entries.map((e) => ({
      date: e.createdAt.toLocaleDateString("pl-PL"),
      name: e.employee.name,
      category: e.product?.category.name ?? "—",
      units: e.quantity,
      cena: Number(e.product?.pricePln ?? 0),
      wartosc: Number(e.normValuePln ?? 0),
    }));
  }

  async csv(f: ReportFilter): Promise<Buffer> {
    const rows = await this.rows(f);
    const esc = (v: string | number) => {
      const s = String(v);
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [HEADERS, ...rows.map((r) => [r.date, r.name, r.category, r.units, r.cena, r.wartosc])].map(
      (r) => r.map(esc).join(";"),
    );
    await this.log("csv", f);
    return Buffer.from("﻿" + lines.join("\n"), "utf8");
  }

  async xlsx(f: ReportFilter): Promise<Buffer> {
    const rows = await this.rows(f);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Raport");
    ws.addRow(HEADERS);
    ws.getRow(1).font = { bold: true };
    rows.forEach((r) => ws.addRow([r.date, r.name, r.category, r.units, r.cena, r.wartosc]));
    await this.log("xlsx", f);
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  previous() {
    return this.prisma.exportLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 });
  }

  private async log(format: string, f: ReportFilter) {
    await this.prisma.exportLog.create({
      data: {
        fileName: `raport_${new Date().toISOString().slice(0, 10)}.${format}`,
        format,
        rangeFrom: f.from ?? null,
        rangeTo: f.to ?? null,
      },
    });
  }
}
