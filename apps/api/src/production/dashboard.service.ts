import { Injectable } from "@nestjs/common";
import { obowiazujaceProgi, premiaZaMiesiac, procentNormy } from "@sep/shared";
import { PrismaService } from "../prisma/prisma.service";
import { SyncService } from "../sync/sync.service";
import { NormsService } from "./norms.service";

interface DashRow {
  id: number;
  name: string;
  hours: number;
  normaBaza: number;
  wykonano: number;
  pctDay: number;
  pctMonth: number;
  trend: "up" | "down";
  premia: boolean;
  lastAction: string;
  employeeId: string;
  workedMinutes: number;
}

/** Buduje komplet danych dla Dashboardu admina (kształt zgodny z frontendem). */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly norms: NormsService,
    private readonly sync: SyncService,
  ) {}

  async build() {
    const now = new Date();
    const startDay = new Date(now);
    startDay.setHours(0, 0, 0, 0);

    const employees = await this.prisma.employee.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });

    // Progi premiowe: domyślne + indywidualne. Komplet własny nadpisuje domyślny.
    const bonusTiers = await this.prisma.bonusTier.findMany({ where: { active: true } });
    const shapeTier = (t: (typeof bonusTiers)[number]) => ({
      thresholdPct: t.thresholdPct,
      amountPln: Number(t.amountPln),
    });
    const domyslneProgi = bonusTiers.filter((t) => t.employeeId === null).map(shapeTier);

    const rows: DashRow[] = [];
    let dDone = 0,
      dNorm = 0,
      mDone = 0,
      mNorm = 0;

    for (let i = 0; i < employees.length; i++) {
      const e = employees[i];
      const [day, month, last, sessions] = await Promise.all([
        this.norms.dayProgress(e.id, now),
        this.norms.monthProgress(e.id, now),
        this.prisma.productionEntry.findFirst({
          where: { employeeId: e.id, status: "CONFIRMED" },
          include: { product: true },
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.workSession.findMany({
          where: { employeeId: e.id, startedAt: { gte: startDay } },
        }),
      ]);
      dDone += day.done;
      dNorm += day.norm;
      mDone += month.done;
      mNorm += month.norm;

      const workedMs = sessions.reduce(
        (a, s) => a + ((s.endedAt ?? now).getTime() - s.startedAt.getTime()),
        0,
      );

      rows.push({
        id: 101 + i,
        employeeId: e.id,
        name: e.name,
        hours: Number(e.defaultHours),
        workedMinutes: Math.max(0, Math.round(workedMs / 60000)),
        normaBaza: Math.round(day.norm),
        wykonano: Math.round(day.done),
        pctDay: day.pct,
        pctMonth: month.pct,
        trend: day.pct >= 100 ? "up" : "down",
        premia:
          premiaZaMiesiac(
            month.pct,
            obowiazujaceProgi(
              bonusTiers.filter((t) => t.employeeId === e.id).map(shapeTier),
              domyslneProgi,
            ).progi,
          ) > 0,
        lastAction: last
          ? `${last.product?.name ?? last.customLabel ?? "Zadanie"} (${last.quantity} szt.)`
          : "—",
      });
    }

    const todays = await this.prisma.productionEntry.findMany({
      where: { status: "CONFIRMED", createdAt: { gte: startDay } },
      include: { product: { include: { category: true } } },
    });
    const todayUnits = todays.reduce((a, e) => a + e.quantity, 0);

    const catMap = new Map<string, { udzialPct: number; sztuki: number }>();
    for (const e of todays) {
      const cat = e.product?.category;
      if (!cat) continue;
      const cur = catMap.get(cat.name) ?? { udzialPct: cat.normPct, sztuki: 0 };
      cur.sztuki += e.quantity;
      catMap.set(cat.name, cur);
    }
    const categories = [...catMap.entries()].map(([name, v]) => ({ name, ...v }));

    const activeToday = await this.prisma.attendance.count({
      where: { date: startDay, type: "WORK" },
    });
    const sync = await this.sync.status();

    return {
      dateLabel: now.toLocaleDateString("pl-PL"),
      activeWorkers: `${activeToday}/${employees.length}`,
      todayUnits,
      lastSync: { ok: sync.status === "SUCCESS", agoText: sync.agoText },
      norm: { dailyPct: procentNormy(dDone, dNorm), monthlyPct: procentNormy(mDone, mNorm) },
      employeesDaily: rows.map((r) => ({ name: r.name, wykonano: r.wykonano, norma: r.normaBaza })),
      categories,
      rows,
    };
  }
}
