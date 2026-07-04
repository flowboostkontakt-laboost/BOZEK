import { Controller, Get, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { Role } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { ReportsService, type ReportFilter } from "./reports.service";

@Roles(Role.ADMIN)
@Controller("admin/reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  private toFilter(q: Record<string, string>): ReportFilter {
    return {
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      employeeId: q.employeeId || undefined,
      category: q.category || undefined,
    };
  }

  @Get()
  data(@Query() q: Record<string, string>) {
    return this.reports.rows(this.toFilter(q));
  }

  @Get("previous")
  previous() {
    return this.reports.previous();
  }

  /** Eksport .xlsx / .csv z natychmiastowym pobraniem. */
  @Get("export")
  async export(@Query() q: Record<string, string>, @Res() res: Response) {
    const format = q.format === "csv" ? "csv" : "xlsx";
    const filter = this.toFilter(q);
    const buf = format === "csv" ? await this.reports.csv(filter) : await this.reports.xlsx(filter);
    const mime =
      format === "csv"
        ? "text/csv; charset=utf-8"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    res.set({ "Content-Type": mime, "Content-Disposition": `attachment; filename="raport.${format}"` });
    res.send(buf);
  }
}
