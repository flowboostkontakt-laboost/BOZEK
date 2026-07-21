import { useCallback, useEffect, useState } from "react";
import { IconPlus, IconMinus, IconRefresh } from "../../components/icons";
import { apiGet, apiPost, apiDelete } from "../../lib/api";

interface TierRow {
  id: string;
  thresholdPct: number;
  amountPln: number | string;
  employeeId?: string | null;
}

const zl = (v: number | string) => Number(v).toLocaleString("pl-PL", { maximumFractionDigits: 2 });

/**
 * Edytor progów premiowych dla zadanego zakresu:
 *   employeeId undefined → progi DOMYŚLNE (globalne)
 *   employeeId ustawione → progi INDYWIDUALNE tej pracownicy (nadpisują domyślne)
 */
export function BonusTiersEditor({ employeeId }: { employeeId?: string }) {
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [prog, setProg] = useState(100);
  const [kwota, setKwota] = useState(300);
  const [busy, setBusy] = useState(false);

  const path = employeeId ? `/admin/bonus/tiers?employeeId=${employeeId}` : "/admin/bonus/tiers";
  const load = useCallback(() => {
    apiGet<TierRow[]>(path).then(setTiers).catch(() => void 0);
  }, [path]);
  useEffect(() => load(), [load]);

  const add = async () => {
    setBusy(true);
    try {
      await apiPost("/admin/bonus/tiers", { thresholdPct: prog, amountPln: kwota, employeeId: employeeId ?? null });
      load();
    } catch {
      void 0;
    }
    setBusy(false);
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await apiDelete(`/admin/bonus/tiers/${id}`);
      load();
    } catch {
      void 0;
    }
    setBusy(false);
  };

  const reset = async () => {
    if (!employeeId) return;
    setBusy(true);
    try {
      await apiDelete(`/admin/bonus/tiers/employee/${employeeId}`);
      load();
    } catch {
      void 0;
    }
    setBusy(false);
  };

  const usesDefaults = Boolean(employeeId) && tiers.length === 0;

  return (
    <div>
      {employeeId && (
        <p className="mb-3 text-xs text-ink-faint">
          {usesDefaults
            ? "Brak własnych progów — obowiązują domyślne. Dodaj próg, aby je nadpisać dla tej pracownicy."
            : "Własne progi tej pracownicy — całkowicie nadpisują domyślne."}
        </p>
      )}

      <div className="space-y-2">
        {tiers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-ink-faint">
            {employeeId ? "Brak własnych progów — działają domyślne." : "Brak progów domyślnych."}
          </p>
        ) : (
          tiers.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-1 px-4 py-3">
              <span>
                ≥ <b className="text-accent-300">{t.thresholdPct}%</b> normy miesięcznej
              </span>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-ok">{zl(t.amountPln)} zł</span>
                <button
                  onClick={() => remove(t.id)}
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
        <button onClick={add} disabled={busy} className="btn-primary flex items-center justify-center gap-2 !py-2.5 disabled:opacity-50">
          <IconPlus className="h-4 w-4" /> Dodaj
        </button>
      </div>

      {employeeId && !usesDefaults && (
        <button
          onClick={reset}
          disabled={busy}
          className="mt-3 flex items-center gap-2 text-xs text-ink-faint transition hover:text-ink disabled:opacity-50"
        >
          <IconRefresh className="h-4 w-4" /> Usuń progi indywidualne — wróć do domyślnych
        </button>
      )}
    </div>
  );
}
