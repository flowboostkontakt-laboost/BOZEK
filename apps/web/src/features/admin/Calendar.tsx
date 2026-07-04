import { useState } from "react";
import { PageShell } from "./PageShell";
import { useApiData, apiPost } from "../../lib/api";
import { employeesFixture, type EmployeeRow } from "../../lib/fixtures";

type DayType = "WORK" | "VACATION" | "SICK_LEAVE" | null;

const CYCLE: Record<string, DayType> = { "": "WORK", WORK: "VACATION", VACATION: "SICK_LEAVE", SICK_LEAVE: "" as any };
const STYLE: Record<string, string> = {
  WORK: "bg-accent text-white",
  VACATION: "bg-warn/25 text-warn",
  SICK_LEAVE: "bg-bad/25 text-bad",
};

export function Calendar() {
  const [employees] = useApiData<EmployeeRow[]>("/admin/employees", employeesFixture);
  const [empId, setEmpId] = useState(employees[0]?.id ?? "1");
  const [days, setDays] = useState<Record<number, DayType>>({ 6: "VACATION", 7: "SICK_LEAVE" });

  const cycle = (d: number) => {
    const cur = days[d] ?? "";
    const next = CYCLE[cur] || null;
    setDays({ ...days, [d]: next });
    if (next) {
      const date = `2026-06-${String(d).padStart(2, "0")}`;
      apiPost("/admin/attendance", { employeeId: empId, date, type: next, hours: next === "WORK" ? 8 : 0 }).catch(() => void 0);
    }
  };

  return (
    <PageShell
      title="Kalendarz i obecności"
      subtitle="Urlop / chorobowe nie obniżają wyniku miesięcznego"
      actions={
        <select value={empId} onChange={(e) => setEmpId(e.target.value)} className="rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm">
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      }
    >
      <section className="card max-w-xl p-6">
        <h2 className="mb-4 text-sm font-medium text-ink-muted">Czerwiec 2026</h2>
        <div className="grid grid-cols-7 gap-2 text-center text-xs text-ink-faint">
          {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d) => <div key={d} className="py-1">{d}</div>)}
          <div /><div /><div /><div /> {/* 1 czerwca 2026 = poniedziałek → brak przesunięcia; przykładowe */}
          {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => {
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
        <div className="mt-5 flex gap-4 text-xs text-ink-muted">
          <Legend cls="bg-accent" label="Praca" />
          <Legend cls="bg-warn" label="Urlop" />
          <Legend cls="bg-bad" label="Chorobowe" />
        </div>
        <p className="mt-3 text-xs text-ink-faint">Kliknij dzień, aby zmienić status (Praca → Urlop → Chorobowe → brak).</p>
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
