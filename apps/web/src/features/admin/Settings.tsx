import { useCallback, useEffect, useState } from "react";
import { PageShell } from "./PageShell";
import { BonusTiersEditor } from "./BonusTiersEditor";
import { apiGet } from "../../lib/api";

interface PreviewRow {
  employeeId: string;
  name: string;
  monthPct: number;
  premiaPln: number;
  indywidualne: boolean;
}

const zl = (v: number) => v.toLocaleString("pl-PL", { maximumFractionDigits: 2 });

export function Settings() {
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const reload = useCallback(() => {
    apiGet<PreviewRow[]>("/admin/bonus/preview").then(setPreview).catch(() => void 0);
  }, []);
  useEffect(() => reload(), [reload]);

  return (
    <PageShell
      title="Ustawienia — System premiowy"
      subtitle="Progi domyślne dla wszystkich. Progi indywidualne ustawiasz w profilu pracownicy (Pracownice → Profil)."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-medium text-ink-muted">Progi domyślne (dla wszystkich)</h2>
          <BonusTiersEditor />
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-ink-muted">Podgląd naliczonych premii</h2>
            <button onClick={reload} className="text-xs text-ink-faint hover:text-ink">
              Odśwież
            </button>
          </div>
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
                    <td className={`py-2.5 text-right font-semibold tabular-nums ${p.premiaPln > 0 ? "text-ok" : "text-ink-faint"}`}>
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
