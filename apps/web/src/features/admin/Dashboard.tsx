import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ProgressRing } from "../../components/ProgressRing";
import { IconEdit, IconPlus, IconRefresh, IconTrendDown, IconTrendUp } from "../../components/icons";
import { dashboardFixture, type DashboardData } from "../../lib/fixtures";
import { apiGet } from "../../lib/api";

const zl = (n: number) => n.toLocaleString("pl-PL");

export function Dashboard() {
  const [data, setData] = useState<DashboardData>(dashboardFixture);

  useEffect(() => {
    // Gdy backend żyje — pobierz realne dane; w przeciwnym razie zostają fixture'y z mockupu.
    apiGet<DashboardData>("/admin/dashboard")
      .then(setData)
      .catch(() => void 0);
  }, []);

  return (
    <>
      <Topbar data={data} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-5 xl:grid-cols-3">
          <NormCard daily={data.norm.dailyPct} monthly={data.norm.monthlyPct} />
          <EmployeesCard data={data} />
          <CategoriesCard data={data} />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <OperationalTable data={data} />
          </div>
          <QuickActions />
        </div>
      </div>
    </>
  );
}

function Topbar({ data }: { data: DashboardData }) {
  return (
    <header className="flex items-center justify-between border-b border-line px-6 py-4">
      <div>
        <h1 className="text-xl font-semibold">Dzisiaj ({data.dateLabel})</h1>
        <p className="text-sm text-ink-faint">Łączna produkcja: {data.todayUnits} szt.</p>
      </div>
      <div className="flex items-center gap-4">
        <span className="rounded-xl border border-line bg-surface-1 px-3 py-2 text-sm">
          Aktywne pracownice <b className="text-ink">{data.activeWorkers}</b>
        </span>
        <span className="flex items-center gap-2 rounded-xl border border-line bg-surface-1 px-3 py-2 text-sm">
          <span className="h-2 w-2 rounded-full bg-ok" />
          API Synchro: <b className="text-ok">Sukces</b>
          <span className="text-ink-faint">({data.lastSync.agoText})</span>
        </span>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-surface-3 text-xs font-semibold">
          A
        </div>
      </div>
    </header>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 text-sm font-medium text-ink-muted">{title}</h2>
      {children}
    </section>
  );
}

function NormCard({ daily, monthly }: { daily: number; monthly: number }) {
  return (
    <Card title="Norma chart">
      <div className="flex items-center justify-around py-2">
        <ProgressRing pct={daily} label="Ogólna norma dzienna" />
        <ProgressRing pct={monthly} label="Progres miesiąca" />
      </div>
    </Card>
  );
}

function EmployeesCard({ data }: { data: DashboardData }) {
  return (
    <Card title="Dzienny progres pracownic">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data.employeesDaily} barGap={4} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#2a2637" />
          <XAxis dataKey="name" tick={{ fill: "#a39fb3", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#6f6b7e", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(124,92,255,0.08)" }}
            contentStyle={{ background: "#1e1b29", border: "1px solid #2a2637", borderRadius: 12, color: "#f2f0f7" }}
            formatter={(v: number) => `${zl(v)} zł`}
          />
          <Bar dataKey="norma" name="Norma" fill="#3a3350" radius={[4, 4, 0, 0]} />
          <Bar dataKey="wykonano" name="Wykonano" fill="#7c5cff" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function CategoriesCard({ data }: { data: DashboardData }) {
  const points = data.categories.map((c, i) => ({ x: i + 1, y: c.udzialPct, z: c.sztuki, name: c.name }));
  return (
    <Card title="Produkcja by kategorii">
      <ResponsiveContainer width="100%" height={180}>
        <ScatterChart margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#2a2637" />
          <XAxis type="number" dataKey="x" domain={[0, 4]} hide />
          <YAxis type="number" dataKey="y" tick={{ fill: "#6f6b7e", fontSize: 11 }} axisLine={false} tickLine={false} />
          <ZAxis type="number" dataKey="z" range={[200, 1600]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: "#7c5cff" }}
            contentStyle={{ background: "#1e1b29", border: "1px solid #2a2637", borderRadius: 12, color: "#f2f0f7" }}
            formatter={(v: number, _k, p: any) => [`${p?.payload?.z} szt. · ${v}% normy`, p?.payload?.name]}
          />
          <Scatter data={points}>
            {points.map((_, i) => (
              <Cell key={i} fill={["#7c5cff", "#9276ff", "#a78bff"][i % 3]} fillOpacity={0.75} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </Card>
  );
}

function OperationalTable({ data }: { data: DashboardData }) {
  return (
    <section className="card overflow-hidden">
      <h2 className="border-b border-line px-5 py-4 text-sm font-medium text-ink-muted">Pełna lista</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-3 font-medium">ID</th>
              <th className="px-3 py-3 font-medium">Pracownica</th>
              <th className="px-3 py-3 font-medium">Godz.</th>
              <th className="px-3 py-3 font-medium">Norma baza</th>
              <th className="px-3 py-3 font-medium">Wykonano</th>
              <th className="px-3 py-3 font-medium">% Dzień</th>
              <th className="px-3 py-3 font-medium">% Mies.</th>
              <th className="px-3 py-3 font-medium">Ostatnia akcja</th>
              <th className="px-3 py-3 font-medium">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id} className="border-t border-line/70">
                <td className="px-5 py-3 text-ink-faint">{r.id}</td>
                <td className="px-3 py-3 font-medium">{r.name}</td>
                <td className="px-3 py-3 text-ink-muted">{r.hours.toFixed(1)}</td>
                <td className="px-3 py-3 text-ink-muted">{zl(r.normaBaza)} zł</td>
                <td className="px-3 py-3">{zl(r.wykonano)} zł</td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center gap-1">
                    <span className={r.pctDay >= 100 ? "text-ok" : "text-ink"}>{r.pctDay}%</span>
                    {r.trend === "up" ? (
                      <IconTrendUp className="h-3.5 w-3.5 text-ok" />
                    ) : (
                      <IconTrendDown className="h-3.5 w-3.5 text-bad" />
                    )}
                    {r.premia && (
                      <span className="ml-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent-300">
                        Premia!
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-3 py-3 text-ink-muted">{r.pctMonth}%</td>
                <td className="px-3 py-3 text-ink-muted">{r.lastAction}</td>
                <td className="px-3 py-3">
                  <button className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-ink-muted transition hover:bg-surface-2">
                    <IconEdit className="h-3.5 w-3.5" /> Edytuj
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-center gap-1 border-t border-line px-5 py-3 text-sm text-ink-muted">
        <button className="rounded-md px-2 py-1 hover:bg-surface-2">‹</button>
        <button className="rounded-md bg-accent px-3 py-1 text-white">1</button>
        <button className="rounded-md px-3 py-1 hover:bg-surface-2">2</button>
        <button className="rounded-md px-3 py-1 hover:bg-surface-2">3</button>
        <button className="rounded-md px-2 py-1 hover:bg-surface-2">›</button>
      </div>
    </section>
  );
}

function QuickActions() {
  return (
    <Card title="Szybkie akcje">
      <div className="space-y-3">
        <button className="btn-primary flex w-full items-center justify-center gap-2">
          <IconPlus className="h-[18px] w-[18px]" /> Dodaj pracownicę
        </button>
        <button className="btn-ghost flex w-full items-center justify-center gap-2">
          <IconRefresh className="h-[18px] w-[18px]" /> Wymuś synchro Presta
        </button>
      </div>
    </Card>
  );
}
