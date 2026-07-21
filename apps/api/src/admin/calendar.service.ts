import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface CalendarRow {
  employeeId: string;
  name: string;
  active: boolean;
  workedDays: number;
  hoursWorked: number;
  hoursPlanned: number;
  hoursBalance: number; // + nadgodziny / − niedogodziny
  vacationPerYear: number;
  vacationUsed: number;
  vacationLeft: number;
  sickDays: number;
}

/** Zestawienia kalendarzowe pracownic dla panelu admina (rok kalendarzowy). */
@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  private yearRange(year: number) {
    return {
      from: new Date(year, 0, 1),
      to: new Date(year, 11, 31, 23, 59, 59, 999),
    };
  }

  /** Wiersz per aktywna pracownica: godziny +/−, dni, urlop do końca roku, chorobowe. */
  async overview(year: number): Promise<CalendarRow[]> {
    const { from, to } = this.yearRange(year);
    const employees = await this.prisma.employee.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });

    const rows: CalendarRow[] = [];
    for (const e of employees) {
      const attendance = await this.prisma.attendance.findMany({
        where: { employeeId: e.id, date: { gte: from, lte: to } },
      });
      const workDays = attendance.filter((a) => a.type === "WORK");
      const workedDays = workDays.length;
      const vacationUsed = attendance.filter((a) => a.type === "VACATION").length;
      const sickDays = attendance.filter((a) => a.type === "SICK_LEAVE").length;
      const hoursPlanned = round1(workDays.reduce((acc, a) => acc + Number(a.hours), 0));

      // Godziny faktyczne z sesji „Start/Stop pracy" (otwarta sesja liczona do teraz).
      const sessions = await this.prisma.workSession.findMany({
        where: { employeeId: e.id, startedAt: { gte: from, lte: to } },
      });
      const now = new Date();
      const hoursWorked = round1(
        sessions.reduce((acc, s) => acc + ((s.endedAt ?? now).getTime() - s.startedAt.getTime()) / 3_600_000, 0),
      );

      const vacationPerYear = e.vacationDaysPerYear;
      rows.push({
        employeeId: e.id,
        name: e.name,
        active: e.active,
        workedDays,
        hoursWorked,
        hoursPlanned,
        hoursBalance: round1(hoursWorked - hoursPlanned),
        vacationPerYear,
        vacationUsed,
        vacationLeft: vacationPerYear - vacationUsed,
        sickDays,
      });
    }
    return rows;
  }

  /** Konkretne daty urlopu i chorobowego pracownicy (po wejściu w osobę). */
  async dates(employeeId: string, year: number) {
    const { from, to } = this.yearRange(year);
    const list = await this.prisma.attendance.findMany({
      where: { employeeId, date: { gte: from, lte: to }, type: { in: ["VACATION", "SICK_LEAVE"] } },
      orderBy: { date: "asc" },
    });
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return {
      vacation: list.filter((a) => a.type === "VACATION").map((a) => iso(a.date)),
      sick: list.filter((a) => a.type === "SICK_LEAVE").map((a) => iso(a.date)),
    };
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
