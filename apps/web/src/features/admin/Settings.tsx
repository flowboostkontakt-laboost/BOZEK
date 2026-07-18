import { useState } from "react";
import { PageShell } from "./PageShell";
import { IconPlus, IconMinus, IconRefresh } from "../../components/icons";
import { useApiData, apiPost, apiDelete } from "../../lib/api";

interface TierRow {
  id: string;
  thresholdPct: number;
  amountPln: number | string; // Prisma Decimal przychodzi jako string
  label?: string | null;
  employeeId?: string | null;
}

interface EmployeeRow {
  id: string;
  name: string;
  active: boolean;
}

interface PreviewRow {
  employeeId: string;
  name: string;
  monthPct: number;
  premiaPln: number;
  indywidualne: boolean;
}

const zl = (v: number | string) => Number(v).toLocaleString("pl-PL", { maximumFractionDigits: 2 });

export function Settings() {
  // "" = progi domyślne (globalne), inaczej id pracownicy
  const [scope, setScope] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [prog, setProg] = useState(100);
  const [kwota, setKwota] = useState(300);
  const [busy, setBusy] = useState(false);

  const [employees] = useApiData<EmployeeRow[]>("/admin/employees", []);
  const [tiers] = useApiData<TierRow[]>(
    scope
      ? `/admin/bonus/tiers?employeeId=${scope}&v=${refreshKey}`
      : `/admin/bonus/tiers?v=${refreshKey}`,
    [],
  );
  const [preview] = useApiData<PreviewRow[]>(`/admin/bonus/preview?v=${refreshKey}`, []);

  const refresh = () => setRefreshKey((v) => v + 1);
  const scopeName = scope ? employees.find((e) => e.id === scope)?.name ?? "Pracownica" : null;

  const add = async () => {
    setBusy(true);
    try {
      await apiPost("/admin/bonus/tiers", {
        thresholdPct: prog,
        amountPln: kwota,
        employeeId: scope || null,
      });
      refresh();
    } catch {
      /* brak backendu — lista zostaje bez zmian */
    }
    setBusy(false);
  };

  const removeTier = async (id: string) => {
    setBusy(true);
    try {
      await apiDelete(`/admin/bonus/tiers/${id}`);
      refresh();
    } catch {
      void 0;
    }
    setBusy(false);
  };

  const resetToDefault = async () => {
    if (!scope) return;
    setBusy(true);
    try {
      await apiDelete(`/admin/bonus/tiers/employee/${scope}`);
      refresh();
    } catch {
      void 0;
    }
    setBusy(false);
  };

  const usesDefaults = Boolean(scope) && tiers.length === 0;

  return (
    <PageShell
      title="Ustawienia — System premiowy"
      subtitle="Progi domyślne i indywidualne dla pracownic (widoczne tylko dla administratora)"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Dla kogo ustawiasz progi</h2>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setScope("")}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                !scope ? "bg-accent text-white" : "border border-line text-ink-muted hover:bg-surface-2"
              }`}
            >
              Domyślne (wszystkie)
            </button>
            {employees
              .filter((e) => e.active)
              .map((e) => (
                <button
                  key={e.id}
                  onClick={() => setScope(e.id)}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${
                    scope === e.id
                      ? "bg-accent text-white"
                      : "border border-line text-ink-muted hover:bg-surface-2"
                  }`}
                >
                  {e.name}
                </button>
              ))}
          </div>

          <p className="mt-3 text-xs text-ink-faint">
            {scope
              ? usesDefaults
                ? `${scopeName} nie ma własnych progów — obowiązują domyślne. Dodaj próg, aby je nadpisać.`
                : `${scopeName} ma własne progi — całkowicie nadpisują domyślne.`
              : "Progi domyślne obowiązują każdą pracownicę, która nie ma własnych."}
          </p>

          <h3 className="mb-2 mt-5 text-sm font-medium text-ink-muted">
            {scope ? `Progi: ${scopeName}` : "Progi domyślne"}
          </h3>

          <div className="space-y-2">
            {tiers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-faint">
                {scope ? "Brak własnych progów — działają domyślne." : "Brak progów domyślnych."}
              </p>
            ) : (
              tiers.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-1 px-4 py-3"
                >
                  <span>
                    ≥ <b className="text-accent-300">{t.thresholdPct}%</b> normy miesięcznej
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-ok">{zl(t.amountPln)} zł</span>
                    <button
                      onClick={() => removeTier(t.id)}
                      disabled={busy}
                      title="Usuń próg"
                      className="rounded-lg border border-line p-1.5 text-ink-faint transition hover:bg-surface-2 hover:text-bad disabled:opacity-50"
                    >
                      <IconMinus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-1 block text-xs text-ink-muted">Próg (%)</span>
              <input type="number" value={prog} onChange={(e) => setProg(+e.target.value)} className="inp" />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-xs text-ink-muted">Premia (zł)</span>
              <input type="number" value={kwota} onChange={(e) => setKwota(+e.target.value)} className="inp" />
            </label>
            <button
              onClick={add}
              disabled={busy}
              className="btn-primary flex items-center justify-center gap-2 !py-2.5 disabled:opacity-50"
            >
              <IconPlus className="h-4 w-4" /> Dodaj
            </button>
          </div>

          {scope && !usesDefaults && (
            <button
              onClick={resetToDefault}
              disabled={busy}
              className="mt-3 flex items-center gap-2 text-xs text-ink-faint transition hover:text-ink disabled:opacity-50"
            >
              <IconRefresh className="h-4 w-4" />
              Usuń progi indywidualne — wróć do domyślnych
            </button>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-sm font-medium text-ink-muted">Podgląd naliczonych premii</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="py-2 font-medium">Pracownica</th>
                <th className="py-2 font-medium">Progi</th>
                <th className="py-2 font-medium">% Miesiąca</th>
                <th className="py-2 text-right font-medium">Premia</th>
              </tr>
            </thead>
            <tbody>
              {preview.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-ink-faint">
                    Brak danych do podglądu.
                  </td>
                </tr>
              ) : (
                preview.map((p) => (
                  <tr key={p.employeeId ?? p.name} className="border-t border-line/70">
                    <td className="py-2.5 font-medium">{p.name}</td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.indywidualne ? "bg-accent-soft text-accent-300" : "bg-surface-3 text-ink-muted"
                        }`}
                      >
                        {p.indywidualne ? "indywidualne" : "domyślne"}
                      </span>
                    </td>
                    <td className="py-2.5 tabular-nums">{p.monthPct}%</td>
                    <td
                      className={`py-2.5 text-right font-semibold tabular-nums ${
                        p.premiaPln > 0 ? "text-ok" : "text-ink-faint"
                      }`}
                    >
                      {zl(p.premiaPln)} zł
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-ink-faint">
            Premia = kwota najwyższego osiągniętego progu z kompletu obowiązującego daną pracownicę.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
