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
import { dashboardFixture, type DashboardData, type OperationalRow } from "../../lib/fixtures";
import { apiGet, apiPost } from "../../lib/api";

const zl = (n: number) => n.toLocaleString("pl-PL");
const GRID = "#241f22";
const AXIS_A = "#b0a6a9";
const AXIS_B = "#79706f";
const TIP = { background: "#1e1a1c", border: "1px solid #2c2528", borderRadius: 12, color: "#f4f0f1" };

export function Dashboard() {
  const [data, setData] = useState<DashboardData>(dashboardFixture);

  useEffect(() => {
    apiGet<DashboardData>("/admin/dashboard").then(setData).catch(() => void 0);
  }, []);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold sm:text-xl">Dzisiaj · {data.dateLabel}</h1>
        <span className="flex items-center gap-2 rounded-full border border-line bg-surface-1 px-3 py-1.5 text-xs">
          <span className={`h-2 w-2 rounded-full ${data.lastSync.ok ? "bg-ok" : "bg-bad"}`} />
          Synchro <span className="text-ink-faint">{data.lastSync.agoText}</span>
        </span>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Produkcja dziś" value={String(data.todayUnits)} sub="sztuk" />
          <Kpi label="Aktywne" value={data.activeWorkers} sub="pracownic" />
          <Kpi label="Norma dzienna" value={`${data.norm.dailyPct}%`} accent />
          <Kpi label="Norma miesięczna" value={`${data.norm.monthlyPct}%`} accent />
        </div>

        {/* Wykresy */}
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <Card title="Realizacja normy">
            <div className="flex items-center justify-around py-1">
              <ProgressRing pct={data.norm.dailyPct} label="Dzienna" size={104} />
              <ProgressRing pct={data.norm.monthlyPct} label="Miesięczna" size={104} />
            </div>
          </Card>
          <EmployeesCard data={data} />
          <CategoriesCard data={data} />
        </div>

        {/* Lista operacyjna */}
        <div className="mt-4">
          <OperationalList data={data} />
        </div>

        {/* Szybkie akcje */}
        <div className="mt-4">
          <QuickActions />
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-1 p-4">
      <p className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent ? "text-accent-300" : "text-ink"}`}>{value}</p>
      {sub && <p className="text-xs text-ink-faint">{sub}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="mb-4 text-sm font-medium text-ink-muted">{title}</h2>
      {children}
    </section>
  );
}

function EmployeesCard({ data }: { data: DashboardData }) {
  return (
    <Card title="Dzienny progres pracownic">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data.employeesDaily} barGap={4} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="name" tick={{ fill: AXIS_A, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: AXIS_B, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "rgba(168,38,74,0.10)" }} contentStyle={TIP} formatter={(v: number) => `${zl(v)} zł`} />
          <Bar dataKey="norma" name="Norma" fill="#3a2c30" radius={[4, 4, 0, 0]} />
          <Bar dataKey="wykonano" name="Wykonano" fill="#a8264a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function CategoriesCard({ data }: { data: DashboardData }) {
  const points = data.categories.map((c, i) => ({ x: i + 1, y: c.udzialPct, z: c.sztuki, name: c.name }));
  return (
    <Card title="Produkcja wg kategorii">
      <ResponsiveContainer width="100%" height={180}>
        <ScatterChart margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={GRID} />
          <XAxis type="number" dataKey="x" domain={[0, 4]} hide />
          <YAxis type="number" dataKey="y" tick={{ fill: AXIS_B, fontSize: 11 }} axisLine={false} tickLine={false} />
          <ZAxis type="number" dataKey="z" range={[200, 1600]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: "#a8264a" }}
            contentStyle={TIP}
            formatter={(v: number, _k, p: any) => [`${p?.payload?.z} szt. · ${v}% normy`, p?.payload?.name]}
          />
          <Scatter data={points}>
            {points.map((_, i) => (
              <Cell key={i} fill={["#a8264a", "#c33a5e", "#e07089"][i % 3]} fillOpacity={0.85} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </Card>
  );
}

function OperationalList({ data }: { data: DashboardData }) {
  return (
    <section className="card overflow-hidden">
      <h2 className="border-b border-line px-4 py-4 text-sm font-medium text-ink-muted sm:px-5">Pełna lista pracownic</h2>

      {/* Desktop: tabela */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-3 font-medium">Pracownica</th>
              <th className="px-3 py-3 font-medium">Godz.</th>
              <th className="px-3 py-3 font-medium">Norma</th>
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
                <td className="px-5 py-3 font-medium">{r.name}</td>
                <td className="px-3 py-3 tabular-nums text-ink-muted">{r.hours.toFixed(1)}</td>
                <td className="px-3 py-3 tabular-nums text-ink-muted">{zl(r.normaBaza)} zł</td>
                <td className="px-3 py-3 tabular-nums">{zl(r.wykonano)} zł</td>
                <td className="px-3 py-3">
                  <PctBadge pct={r.pctDay} trend={r.trend} premia={r.premia} />
                </td>
                <td className="px-3 py-3 tabular-nums text-ink-muted">{r.pctMonth}%</td>
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

      {/* Mobile: karty */}
      <div className="divide-y divide-line/60 lg:hidden">
        {data.rows.map((r) => (
          <RowCard key={r.id} r={r} />
        ))}
      </div>
    </section>
  );
}

function RowCard({ r }: { r: OperationalRow }) {
  const color = r.pctDay >= 100 ? "#34d399" : "#a8264a";
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-3 text-sm font-semibold text-accent-300">
            {r.name.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{r.name}</p>
            <p className="text-xs text-ink-faint">{r.hours.toFixed(1)} h · norma {zl(r.normaBaza)} zł</p>
          </div>
        </div>
        <div className="text-right">
          <span className="flex items-center justify-end gap-1">
            <span className="text-xl font-semibold tabular-nums" style={{ color }}>{r.pctDay}%</span>
            {r.trend === "up" ? <IconTrendUp className="h-4 w-4 text-ok" /> : <IconTrendDown className="h-4 w-4 text-bad" />}
          </span>
          <p className="text-xs text-ink-faint">mies. {r.pctMonth}%</p>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.pctDay)}%`, background: color }} />
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs">
        <span className="text-ink-muted">
          Wykonano <b className="tabular-nums text-ink">{zl(r.wykonano)} zł</b>
        </span>
        {r.premia && <span className="rounded-md bg-accent-soft px-2 py-0.5 font-medium text-accent-300">Premia!</span>}
      </div>
      <p className="mt-1 truncate text-xs text-ink-faint">Ostatnio: {r.lastAction}</p>
    </div>
  );
}

function PctBadge({ pct, trend, premia }: { pct: number; trend: "up" | "down"; premia: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`tabular-nums ${pct >= 100 ? "text-ok" : "text-ink"}`}>{pct}%</span>
      {trend === "up" ? <IconTrendUp className="h-3.5 w-3.5 text-ok" /> : <IconTrendDown className="h-3.5 w-3.5 text-bad" />}
      {premia && <span className="ml-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent-300">Premia!</span>}
    </span>
  );
}

function QuickActions() {
  const [busy, setBusy] = useState(false);
  const sync = async () => {
    setBusy(true);
    await apiPost("/admin/sync/run").catch(() => void 0);
    setBusy(false);
  };
  return (
    <Card title="Szybkie akcje">
      <div className="grid gap-3 sm:grid-cols-2">
        <button className="btn-primary flex items-center justify-center gap-2">
          <IconPlus className="h-[18px] w-[18px]" /> Dodaj pracownicę
        </button>
        <button onClick={sync} disabled={busy} className="btn-ghost flex items-center justify-center gap-2 disabled:opacity-50">
          <IconRefresh className={`h-[18px] w-[18px] ${busy ? "animate-spin" : ""}`} /> Wymuś synchro
        </button>
      </div>
    </Card>
  );
}
