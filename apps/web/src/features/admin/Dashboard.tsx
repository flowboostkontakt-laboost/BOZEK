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
import { kolorPostepu } from "@sep/shared";

const zl = (n: number) => n.toLocaleString("pl-PL");
const fmtTime = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
const BAR_COLOR = { danger: "#fb7185", warning: "#fbbf24", ok: "#c33a5e", success: "#34d399" } as const;

interface DayEntry {
  name: string;
  qty: number;
  category: string | null;
  pricePln: number;
  valuePln: number;
  isTask: boolean;
  status: string;
}
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
    <section>
      <h2 className="mb-3 px-1 text-sm font-medium text-ink-muted">Pełna lista pracownic</h2>
      <div className="grid gap-3 xl:grid-cols-2">
        {data.rows.map((r) => (
          <EmployeeCard key={r.id} r={r} />
        ))}
      </div>
    </section>
  );
}

function EmployeeCard({ r }: { r: OperationalRow }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<DayEntry[] | null>(null);
  const color = BAR_COLOR[kolorPostepu(r.pctDay)];
  const worked = r.workedMinutes || 0;
  const balance = worked - Math.round(r.hours * 60);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && entries === null && r.employeeId) {
      apiGet<DayEntry[]>(`/admin/employees/${r.employeeId}/entries`)
        .then(setEntries)
        .catch(() => setEntries([]));
    }
  };

  return (
    <div className="card p-4">
      <button onClick={toggle} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-base font-semibold"
            style={{ background: r.pctDay >= 100 ? "#a8264a" : "#2a2325", color: r.pctDay >= 100 ? "#fff" : "#e07089" }}
          >
            {r.name.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-medium">{r.name}</p>
            <p className="text-xs text-ink-faint">Norma dnia</p>
          </div>
        </div>
        <div className="text-right">
          <span className="flex items-center justify-end gap-1">
            <span className="text-2xl font-semibold tabular-nums" style={{ color }}>{r.pctDay}%</span>
            {r.trend === "up" ? <IconTrendUp className="h-4 w-4 text-ok" /> : <IconTrendDown className="h-4 w-4 text-bad" />}
          </span>
          <p className="text-xs text-ink-muted">miesiąc {r.pctMonth}%</p>
        </div>
      </button>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.pctDay)}%`, background: color }} />
      </div>

      <div className="mt-3 flex gap-2">
        <div className="flex-1 rounded-xl bg-surface-2 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-ink-faint">Plan</p>
          <p className="tabular-nums text-sm font-medium">{r.hours}h · {zl(r.normaBaza)} zł</p>
        </div>
        <div className="flex-1 rounded-xl bg-surface-2 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-ink-faint">Wykonane</p>
          <p className="tabular-nums text-sm font-medium">{fmtTime(worked)} · {zl(r.wykonano)} zł</p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
        <span className="text-xs text-ink-muted">Bilans czasu</span>
        <span className="ml-auto tabular-nums text-sm font-semibold" style={{ color: balance >= 0 ? "#34d399" : "#fbbf24" }}>
          {balance >= 0 ? "+ " : "− "}{fmtTime(Math.abs(balance))}
        </span>
        <span className="text-[11px] text-ink-faint">{balance >= 0 ? "nadgodziny" : "do odrobienia"}</span>
      </div>

      {r.premia && (
        <div className="mt-2.5 rounded-lg bg-accent-soft px-3 py-1.5 text-center text-xs font-medium text-accent-300">
          Premia odblokowana
        </div>
      )}

      {open && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-faint">Uszyte / zgłoszone dziś</p>
          {entries === null ? (
            <p className="py-2 text-center text-xs text-ink-faint">Wczytuję…</p>
          ) : entries.length === 0 ? (
            <p className="py-2 text-center text-xs text-ink-faint">Brak wpisów dziś.</p>
          ) : (
            <ul className="space-y-2.5">
              {entries.map((en, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-semibold tabular-nums"
                    style={{ background: en.isTask ? "#2a2325" : "#8c3048", color: en.isTask ? "#e07089" : "#fff" }}
                  >
                    {en.isTask ? <IconEdit className="h-4 w-4" /> : `${en.qty}×`}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{en.name}</p>
                    {en.category && <p className="text-[11px] text-ink-faint">{en.category}</p>}
                  </div>
                  <div className="text-right text-xs">
                    {en.isTask ? (
                      <span className="text-warn">{en.status === "PENDING_REVIEW" ? "do wyceny" : "—"}</span>
                    ) : (
                      <>
                        <p className="tabular-nums">{en.qty} szt · {zl(en.pricePln * en.qty)} zł</p>
                        <p className="tabular-nums text-ink-faint">norma {zl(en.valuePln)} zł</p>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button onClick={toggle} className="mt-3 w-full rounded-xl border border-line py-2 text-xs text-ink-muted transition hover:bg-surface-2">
        {open ? "Zwiń" : "Pokaż produkty"}
      </button>
    </div>
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
