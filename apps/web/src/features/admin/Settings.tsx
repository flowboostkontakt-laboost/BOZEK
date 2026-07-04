import { useState } from "react";
import { PageShell } from "./PageShell";
import { IconPlus } from "../../components/icons";
import { useApiData, apiPost } from "../../lib/api";
import { bonusFixture, bonusPreviewFixture, type BonusTierRow } from "../../lib/fixtures";

export function Settings() {
  const [tiers, setTiers] = useApiData<BonusTierRow[]>("/admin/bonus/tiers", bonusFixture);
  const [preview] = useApiData("/admin/bonus/preview", bonusPreviewFixture);
  const [prog, setProg] = useState(100);
  const [kwota, setKwota] = useState(300);

  const add = () => {
    const t = { id: crypto.randomUUID(), thresholdPct: prog, amountPln: kwota, label: `Próg ${tiers.length + 1}` };
    setTiers([...tiers, t].sort((a, b) => a.thresholdPct - b.thresholdPct));
    apiPost("/admin/bonus/tiers", t).catch(() => void 0);
  };

  return (
    <PageShell title="Ustawienia — System premiowy" subtitle="Progi premii i podgląd naliczeń (widoczne tylko dla administratora)">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-medium text-ink-muted">Progi premiowe</h2>
          <div className="space-y-2">
            {tiers.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-line bg-surface-1 px-4 py-3">
                <span>≥ <b className="text-accent-300">{t.thresholdPct}%</b> normy miesięcznej</span>
                <span className="font-semibold text-ok">{t.amountPln.toLocaleString("pl-PL")} zł</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1"><span className="mb-1 block text-xs text-ink-muted">Próg (%)</span>
              <input type="number" value={prog} onChange={(e) => setProg(+e.target.value)} className="inp" /></label>
            <label className="flex-1"><span className="mb-1 block text-xs text-ink-muted">Premia (zł)</span>
              <input type="number" value={kwota} onChange={(e) => setKwota(+e.target.value)} className="inp" /></label>
            <button onClick={add} className="btn-primary flex items-center justify-center gap-2 !py-2.5"><IconPlus className="h-4 w-4" /> Dodaj</button>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-sm font-medium text-ink-muted">Podgląd naliczonych premii</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="py-2 font-medium">Pracownica</th>
                <th className="py-2 font-medium">% Miesiąca</th>
                <th className="py-2 text-right font-medium">Premia</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((p) => (
                <tr key={p.name} className="border-t border-line/70">
                  <td className="py-2.5 font-medium">{p.name}</td>
                  <td className="py-2.5">{p.monthPct}%</td>
                  <td className={`py-2.5 text-right font-semibold ${p.premiaPln > 0 ? "text-ok" : "text-ink-faint"}`}>
                    {p.premiaPln.toLocaleString("pl-PL")} zł
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </PageShell>
  );
}
