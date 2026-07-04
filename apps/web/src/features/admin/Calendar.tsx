import { useState } from "react";
import { PageShell } from "./PageShell";
import { useApiData, apiPost } from "../../lib/api";
import { employeesFixture, type EmployeeRow } from "../../lib/fixtures";

type DayType = "WORK" | "VACATION" | "SICK_LEAVE" | null;

const CYCLE: Record<string, DayType> = { "": "WORK", WORK: "VACATION", VACATION: "SICK_LEAVE", SICK_LEAVE: null };
const STYLE: Record<string, string> = {
  WORK: "bg-accent text-white",
  VACATION: "bg-warn/25 text-warn",
  SICK_LEAVE: "bg-bad/25 text-bad",
};

export function Calendar() {
  const [employees] = useApiData<EmployeeRow[]>("/admin/employees", employeesFixture);
  const [empId, setEmpId] = useState(employees[0]?.id ?? "1");
  const [days, setDays] = useState<Record<number, DayType>>({});

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthLabel = now.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (new Date(year, month, 1).getDay() + 6) % 7; // offset dla tygodnia od poniedziałku

  const cycle = (d: number) => {
    const next = CYCLE[days[d] ?? ""] ?? null;
    setDays({ ...days, [d]: next });
    if (next) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      apiPost("/admin/attendance", { employeeId: empId, date, type: next, hours: next === "WORK" ? 8 : 0 }).catch(() => void 0);
    }
  };

  return (
    <PageShell
      title="Kalendarz i obecności"
      subtitle="Urlop / chorobowe nie obniżają wyniku miesięcznego"
      actions={
        <select
          value={empId}
          onChange={(e) => setEmpId(e.target.value)}
          className="rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm"
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      }
    >
      <section className="card mx-auto max-w-md p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-medium capitalize text-ink-muted">{monthLabel}</h2>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-ink-faint">
          {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d) => (
            <div key={d} className="py-1">{d}</div>
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
      </section>
    </PageShell>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded ${cls}`} /> {label}
    </span>
  );
}
