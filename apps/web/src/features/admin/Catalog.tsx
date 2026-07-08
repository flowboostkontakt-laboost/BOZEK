import { useState } from "react";
import { PageShell } from "./PageShell";
import { IconRefresh } from "../../components/icons";
import { apiPatch, apiPost, useApiData } from "../../lib/api";
import { categoriesFixture, type CategoryRow } from "../../lib/fixtures";

interface CatalogProductRow {
  id: string;
  name: string;
  last4: string | null;
  barcode: string | null;
  active: boolean;
  category: {
    id: string;
    name: string;
    normPct: number;
  };
}

export function Catalog() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [cats, setCats] = useApiData<CategoryRow[]>(`/admin/catalog/categories?v=${refreshKey}`, categoriesFixture);
  const [products, setProducts] = useApiData<CatalogProductRow[]>(`/admin/catalog/products?v=${refreshKey}`, []);

  const setPct = (id: string, pct: number) => {
    setCats(cats.map((c) => (c.id === id ? { ...c, normPct: pct } : c)));
  };

  const save = (c: CategoryRow) => {
    apiPatch(`/admin/catalog/categories/${c.id}`, { normPct: c.normPct }).catch(() => void 0);
  };

  const sync = async () => {
    setBusy(true);
    try {
      await apiPost("/admin/sync/run");
      setRefreshKey((v) => v + 1);
    } catch {
      void 0;
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      title="Katalog Produktow"
      subtitle="Przeliczniki % normy dla kategorii (synchronizacja z PrestaShop)"
      actions={
        <button onClick={sync} disabled={busy} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          <IconRefresh className={`h-[18px] w-[18px] ${busy ? "animate-spin" : ""}`} />
          {busy ? "Synchronizacja..." : "Synchro Presta"}
        </button>
      }
    >
      <div className="space-y-4">
        <section className="card p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-medium text-ink-muted">Kategorie i przeliczniki</h2>
          <div className="space-y-3">
            {cats.map((c) => (
              <div key={c.id} className="rounded-xl border border-line bg-surface-1 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{c.name}</span>
                  <span className="tabular-nums text-lg font-semibold text-accent-300">{c.normPct}%</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={200}
                    value={c.normPct}
                    onChange={(e) => setPct(c.id, +e.target.value)}
                    onMouseUp={() => save(c)}
                    onTouchEnd={() => save(c)}
                    className="h-2 flex-1 accent-accent"
                  />
                  <button onClick={() => save(c)} className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-surface-2">
                    Zapisz
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-faint">
            Opaski 50% · Turbany 100% - wartosc produktu = cena x przelicznik. Nadpisanie per produkt dostepne przez API.
          </p>
        </section>

        <section className="card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-ink-muted">Produkty pobrane z PrestaShop</h2>
            <span className="text-xs text-ink-faint">{products.length} rekordow</span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-faint">
                <tr className="border-b border-line">
                  <th className="pb-2 pr-4 font-medium">Nazwa</th>
                  <th className="pb-2 pr-4 font-medium">Kategoria</th>
                  <th className="pb-2 pr-4 font-medium">Last 4</th>
                  <th className="pb-2 pr-4 font-medium">Barcode</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-ink-faint">
                      Brak produktow. Uruchom synchronizacje z PrestaShop.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="border-b border-line/60 last:border-0">
                      <td className="py-3 pr-4 font-medium">{p.name}</td>
                      <td className="py-3 pr-4 text-ink-muted">{p.category?.name ?? "-"}</td>
                      <td className="py-3 pr-4 tabular-nums text-ink-muted">{p.last4 || "-"}</td>
                      <td className="py-3 pr-4 tabular-nums text-ink-muted">{p.barcode || "-"}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${p.active ? "bg-ok/15 text-ok" : "bg-bad/15 text-bad"}`}>
                          {p.active ? "Aktywny" : "Nieaktywny"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageShell>
  );
}