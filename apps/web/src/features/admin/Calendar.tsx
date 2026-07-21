import { Fragment, useCallback, useEffect, useState } from "react";
import { PageShell } from "./PageShell";
import { apiGet, apiPost, apiDelete } from "../../lib/api";

type DayType = "WORK" | "VACATION" | "SICK_LEAVE" | null;

const CYCLE: Record<string, DayType> = { "": "WORK", WORK: "VACATION", VACATION: "SICK_LEAVE", SICK_LEAVE: null };
const STYLE: Record<string, string> = {
  WORK: "bg-accent text-white",
  VACATION: "bg-warn/25 text-warn",
  SICK_LEAVE: "bg-bad/25 text-bad",
};

interface OverviewRow {
  employeeId: string;
  name: string;
  workedDays: number;
  hoursBalance: number;
  vacationPerYear: number;
  vacationUsed: number;
  vacationLeft: number;
  sickDays: number;
}
interface EmployeeRow {
  id: string;
  name: string;
}

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" });

export function Calendar() {
  const year = new Date().getFullYear();
  const [rows, setRows] = useState<OverviewRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);

  const loadOverview = useCallback(() => {
    apiGet<OverviewRow[]>(`/admin/attendance/overview?year=${year}`).then(setRows).catch(() => void 0);
  }, [year]);

  useEffect(() => {
    loadOverview();
    apiGet<EmployeeRow[]>("/admin/employees").then(setEmployees).catch(() => void 0);
  }, [loadOverview]);

  return (
    <PageShell title="Kalendarz i obecności" subtitle={`Zestawienie roczne ${year} — urlop / chorobowe nie obniżają wyniku miesięcznego`}>
      <div className="space-y-5">
        <OverviewTable rows={rows} year={year} />
        <MonthEditor employees={employees} onChanged={loadOverview} />
      </div>
    </PageShell>
  );
}

// ─── Zestawienie roczne (jak w raporcie) ──────────────────────────────
function OverviewTable({ rows, year }: { rows: OverviewRow[]; year: number }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="card overflow-hidden">
      <h2 className="border-b border-line px-5 py-3 text-sm font-medium text-ink-muted">Pracownice — {year}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-3 font-medium">Pracownica</th>
              <th className="px-3 py-3 font-medium">Godziny +/−</th>
              <th className="px-3 py-3 font-medium">Dni pracy</th>
              <th className="px-3 py-3 font-medium">Urlop do końca roku</th>
              <th className="px-3 py-3 font-medium">Chorobowe</th>
              <th className="px-3 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-ink-faint">
                  Brak danych obecności w tym roku.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <Fragment key={r.employeeId}>
                  <tr className="border-t border-line/70">
                    <td className="px-5 py-3 font-medium">{r.name}</td>
                    <td className="px-3 py-3 tabular-nums">
                      <span className={r.hoursBalance > 0 ? "text-ok" : r.hoursBalance < 0 ? "text-bad" : "text-ink-muted"}>
                        {r.hoursBalance > 0 ? "+" : ""}
                        {r.hoursBalance} h
                      </span>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-ink-muted">{r.workedDays}</td>
                    <td className="px-3 py-3 tabular-nums">
                      <b className={r.vacationLeft <= 0 ? "text-bad" : "text-ink"}>{r.vacationLeft}</b>
                      <span className="text-ink-faint"> / {r.vacationPerYear} dni</span>
                      <span className="ml-1 text-xs text-ink-faint">(wyk. {r.vacationUsed})</span>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-ink-muted">{r.sickDays} dni</td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => setOpenId(openId === r.employeeId ? null : r.employeeId)}
                        className="rounded-lg border border-line px-2 py-1 text-xs text-ink hover:bg-surface-2"
                      >
                        {openId === r.employeeId ? "Ukryj daty" : "Pokaż daty"}
                      </button>
                    </td>
                  </tr>
                  {openId === r.employeeId && (
                    <tr className="border-t border-line/40 bg-surface-1/40">
                      <td colSpan={6} className="px-5 py-3">
                        <DatesDetail employeeId={r.employeeId} year={year} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DatesDetail({ employeeId, year }: { employeeId: string; year: number }) {
  const [data, setData] = useState<{ vacation: string[]; sick: string[] } | null>(null);
  useEffect(() => {
    apiGet<{ vacation: string[]; sick: string[] }>(`/admin/attendance/dates/${employeeId}?year=${year}`)
      .then(setData)
      .catch(() => void 0);
  }, [employeeId, year]);

  if (!data) return <p className="text-xs text-ink-faint">Ładowanie…</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <DateList title="Urlop" color="text-warn" dates={data.vacation} />
      <DateList title="Chorobowe" color="text-bad" dates={data.sick} />
    </div>
  );
}

function DateList({ title, color, dates }: { title: string; color: string; dates: string[] }) {
  return (
    <div>
      <p className={`mb-2 text-xs font-medium uppercase tracking-wide ${color}`}>
        {title} ({dates.length})
      </p>
      {dates.length === 0 ? (
        <p className="text-xs text-ink-faint">brak</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {dates.map((d) => (
            <span key={d} className="rounded-md border border-line bg-surface-1 px-2 py-0.5 text-xs tabular-nums">
              {fmtDate(d)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Edytor miesięczny per pracownica (korekty admina) ────────────────
function MonthEditor({ employees, onChanged }: { employees: EmployeeRow[]; onChanged: () => void }) {
  const [empId, setEmpId] = useState("");
  const [days, setDays] = useState<Record<number, DayType>>({});

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthLabel = now.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;

  useEffect(() => {
    if (!empId && employees[0]) setEmpId(employees[0].id);
  }, [employees, empId]);

  useEffect(() => {
    if (!empId) return;
    const m = `${year}-${String(month + 1).padStart(2, "0")}`;
    apiGet<{ date: string; type: DayType }[]>(`/admin/attendance?employeeId=${empId}&month=${m}`)
      .then((list) => {
        const map: Record<number, DayType> = {};
        for (const a of list) map[new Date(`${a.date}T00:00:00`).getDate()] = a.type;
        setDays(map);
      })
      .catch(() => setDays({}));
  }, [empId, year, month]);

  const cycle = (d: number) => {
    const next = CYCLE[days[d] ?? ""] ?? null;
    setDays((prev) => ({ ...prev, [d]: next }));
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const req = next
      ? apiPost("/admin/attendance", { employeeId: empId, date, type: next, hours: next === "WORK" ? 8 : 0 })
      : apiDelete(`/admin/attendance?employeeId=${empId}&date=${date}`);
    Promise.resolve(req).then(onChanged).catch(() => void 0);
  };

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-ink-muted">Edytor miesiąca (korekty)</h2>
        <select
          value={empId}
          onChange={(e) => setEmpId(e.target.value)}
          className="rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm"
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mx-auto max-w-md">
        <h3 className="mb-4 text-sm font-medium capitalize text-ink-muted">{monthLabel}</h3>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-ink-faint">
          {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
          {Array.from({ length: leading }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
            const t = days[d] ?? "";
            return (
              <button
                key={d}
                onClick={() => cycle(d)}
                className={`grid aspect-square place-items-center rounded-lg text-sm transition hover:bg-surface-2 ${STYLE[t] ?? "text-ink-muted"}`}
              >
                {d}
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap gap-4 text-xs text-ink-muted">
          <Legend cls="bg-accent" label="Praca" />
          <Legend cls="bg-warn" label="Urlop" />
          <Legend cls="bg-bad" label="Chorobowe" />
        </div>
        <p className="mt-3 text-xs text-ink-faint">Dotknij dzień, aby zmienić status: Praca → Urlop → Chorobowe → brak.</p>
      </div>
    </section>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded ${cls}`} /> {label}
    </span>
  );
}
