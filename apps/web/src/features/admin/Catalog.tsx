import { PageShell } from "./PageShell";
import { useApiData, apiPost } from "../../lib/api";
import { categoriesFixture, type CategoryRow } from "../../lib/fixtures";

export function Catalog() {
  const [cats, setCats] = useApiData<CategoryRow[]>("/admin/catalog/categories", categoriesFixture);

  const setPct = (id: string, pct: number) => {
    setCats(cats.map((c) => (c.id === id ? { ...c, normPct: pct } : c)));
  };
  const save = (c: CategoryRow) => {
    apiPost(`/admin/catalog/categories/${c.id}`, { normPct: c.normPct }).catch(() => void 0);
  };

  return (
    <PageShell title="Katalog Produktów" subtitle="Przeliczniki % normy dla kategorii (synchronizacja z PrestaShop)">
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-medium text-ink-muted">Kategorie i przeliczniki</h2>
        <div className="space-y-3">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-4 rounded-xl border border-line bg-surface-1 p-4">
              <span className="w-40 font-medium">{c.name}</span>
              <input
                type="range"
                min={0}
                max={200}
                value={c.normPct}
                onChange={(e) => setPct(c.id, +e.target.value)}
                onMouseUp={() => save(c)}
                className="flex-1 accent-accent"
              />
              <span className="w-16 text-right font-semibold text-accent-300">{c.normPct}%</span>
              <button onClick={() => save(c)} className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-surface-2">
                Zapisz
              </button>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-faint">
          Opaski 50% · Turbany 100% — wartość produktu = cena × przelicznik. Nadpisanie per produkt dostępne przez API.
        </p>
      </section>
    </PageShell>
  );
}
