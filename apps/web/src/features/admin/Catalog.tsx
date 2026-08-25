import { useCallback, useEffect, useState } from "react";
import { PageShell } from "./PageShell";
import { NormSlider } from "./NormSlider";
import { IconArrowLeft, IconPackage, IconRefresh } from "../../components/icons";
import { apiGet, apiPatch, apiPost } from "../../lib/api";

interface TreeCategory {
  id: string;
  name: string;
  childCount: number;
  productCount: number;
  normPct: number | null;
  effectivePct: number;
  inherited: boolean;
  parentPct: number;
}

interface TreeProduct {
  id: string;
  name: string;
  last4: string | null;
  barcode: string | null;
  pricePln: number;
  normPctOverride: number | null;
  effectivePct: number;
  inherited: boolean;
  categoryPct: number;
  normValuePln: number;
  categoryPath?: string;
}

interface TreeResponse {
  path: { id: string; name: string }[];
  current: (TreeCategory & { parentId: string | null }) | null;
  categories: TreeCategory[];
  products: TreeProduct[];
}

interface SyncResult {
  status: string;
  count: number;
  message?: string;
}

const PUSTE: TreeResponse = { path: [], current: null, categories: [], products: [] };

/**
 * Katalog jako drzewo menu sklepu: kategoria → podkategoria → … → produkt.
 * Na każdym poziomie suwak ustawia % normy; poziom bez własnego ustawienia
 * dziedziczy wartość z gałęzi wyżej (kategoria 100 % → podkategoria 80 % →
 * pojedynczy produkt 60 %).
 */
export function Catalog() {
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [szukaj, setSzukaj] = useState("");
  const [q, setQ] = useState("");
  const [data, setData] = useState<TreeResponse>(PUSTE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : nodeId ? `?parentId=${nodeId}` : "";
      setData(await apiGet<TreeResponse>(`/admin/catalog/tree${params}`));
      setError(null);
    } catch (e) {
      setError(`Nie udało się pobrać katalogu: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [nodeId, q]);

  useEffect(() => {
    void load();
  }, [load]);

  // Zapis % zmienia też wartości dziedziczone niżej — po zapisie czytamy poziom
  // od nowa, żeby liczby na ekranie zgadzały się z tym, co liczy serwer.
  const zapiszKategorie = async (id: string, pct: number | null) => {
    await apiPatch(`/admin/catalog/categories/${id}`, { normPct: pct });
    await load();
  };
  const zapiszProdukt = async (id: string, pct: number | null) => {
    await apiPatch(`/admin/catalog/products/${id}/override`, { normPctOverride: pct });
    await load();
  };

  const wejdz = (id: string) => {
    setQ("");
    setSzukaj("");
    setNodeId(id);
  };

  const sync = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await apiPost<SyncResult>("/admin/sync/run");
      setFeedback({ ok: true, text: res.message ?? `Zsynchronizowano ${res.count} produktów.` });
      setNodeId(null);
      await load();
    } catch (e) {
      setFeedback({ ok: false, text: `Synchronizacja nie powiodła się: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  const wSzukaniu = q.trim().length > 0;
  const rodzicId = data.path.length > 1 ? data.path[data.path.length - 2].id : null;

  return (
    <PageShell
      title="Katalog Produktów"
      subtitle="Drzewo menu sklepu — % normy ustawiasz na kategorii, podkategorii albo pojedynczym produkcie"
      actions={
        <button onClick={sync} disabled={busy} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          <IconRefresh className={`h-[18px] w-[18px] ${busy ? "animate-spin" : ""}`} />
          {busy ? "Synchronizacja..." : "Synchro Presta"}
        </button>
      }
    >
      <div className="space-y-4">
        {feedback && (
          <div
            className={`rounded-xl border p-3 text-sm ${
              feedback.ok ? "border-ok/25 bg-ok/10 text-ok" : "border-bad/30 bg-bad/10 text-bad"
            }`}
          >
            {feedback.text}
          </div>
        )}
        {error && <div className="rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-bad">{error}</div>}

        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm">
            <button
              onClick={() => {
                setQ("");
                setSzukaj("");
                setNodeId(null);
              }}
              className={`rounded-lg px-2 py-1 hover:bg-surface-2 ${nodeId || wSzukaniu ? "text-ink-muted" : "font-medium"}`}
            >
              Katalog
            </button>
            {data.path.map((p, i) => (
              <span key={p.id} className="flex items-center gap-1">
                <span className="text-ink-faint">›</span>
                <button
                  onClick={() => wejdz(p.id)}
                  className={`rounded-lg px-2 py-1 hover:bg-surface-2 ${
                    i === data.path.length - 1 ? "font-medium" : "text-ink-muted"
                  }`}
                >
                  {p.name}
                </button>
              </span>
            ))}
          </nav>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setQ(szukaj);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={szukaj}
              onChange={(e) => setSzukaj(e.target.value)}
              placeholder="Szukaj produktu (nazwa, 4 cyfry, kod)"
              className="inp w-64"
            />
            <button type="submit" className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-2">
              Szukaj
            </button>
            {wSzukaniu && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setSzukaj("");
                }}
                className="text-sm text-ink-faint hover:text-ink"
              >
                wyczyść
              </button>
            )}
          </form>
        </div>

        {(nodeId || wSzukaniu) && (
          <button
            onClick={() => (wSzukaniu ? (setQ(""), setSzukaj("")) : setNodeId(rodzicId))}
            className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink"
          >
            <IconArrowLeft className="h-4 w-4" />
            {wSzukaniu ? "Wróć do drzewa" : "Poziom wyżej"}
          </button>
        )}

        {/* Ustawienie % dla kategorii, w której właśnie jesteśmy. */}
        {data.current && (
          <section className="card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-faint">Norma dla całej kategorii</p>
                <h2 className="text-lg font-semibold">{data.current.name}</h2>
              </div>
              <span className="tabular-nums text-2xl font-semibold text-accent-300">{data.current.effectivePct}%</span>
            </div>
            <NormSlider
              value={data.current.normPct}
              effectivePct={data.current.effectivePct}
              inheritedPct={data.current.parentPct}
              onSave={(v) => zapiszKategorie(data.current!.id, v)}
            />
            <p className="mt-3 text-xs text-ink-faint">
              Ta wartość obowiązuje wszystkie podkategorie i produkty w tej gałęzi — chyba że niżej ustawisz własną.
            </p>
          </section>
        )}

        {loading && <p className="text-sm text-ink-faint">Wczytywanie…</p>}

        {data.categories.length > 0 && (
          <section className="card p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-medium text-ink-muted">
              {data.current ? "Podkategorie" : "Kategorie z menu sklepu"}
            </h2>
            <div className="space-y-3">
              {data.categories.map((c) => (
                <div key={c.id} className="rounded-xl border border-line bg-surface-1 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button onClick={() => wejdz(c.id)} className="min-w-0 text-left">
                      <span className="font-medium hover:underline">{c.name}</span>
                      <span className="ml-2 text-xs text-ink-faint">
                        {c.childCount > 0 && `${c.childCount} podkat. · `}
                        {c.productCount} prod.
                      </span>
                    </button>
                    <div className="flex items-center gap-3">
                      <span className={`tabular-nums text-lg font-semibold ${c.inherited ? "text-ink-muted" : "text-accent-300"}`}>
                        {c.effectivePct}%
                      </span>
                      <button
                        onClick={() => wejdz(c.id)}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-surface-2"
                      >
                        Wejdź →
                      </button>
                    </div>
                  </div>
                  <NormSlider
                    value={c.normPct}
                    effectivePct={c.effectivePct}
                    inheritedPct={c.parentPct}
                    onSave={(v) => zapiszKategorie(c.id, v)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {(data.products.length > 0 || (data.current && data.categories.length === 0) || wSzukaniu) && (
          <section className="card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-ink-muted">
                {wSzukaniu ? "Znalezione produkty" : "Produkty w tej kategorii"}
              </h2>
              <span className="text-xs text-ink-faint">{data.products.length} szt.</span>
            </div>
            <div className="mt-4 space-y-3">
              {data.products.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-faint">
                  {wSzukaniu ? "Nic nie znaleziono." : "W tej kategorii nie ma produktów."}
                </p>
              ) : (
                data.products.map((p) => (
                  <div key={p.id} className="rounded-xl border border-line bg-surface-1 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{p.name}</p>
                        <p className="mt-0.5 text-xs text-ink-faint">
                          {p.categoryPath && `${p.categoryPath} · `}
                          ID {p.last4 || "—"}
                          {p.barcode ? ` · kod ${p.barcode}` : ""} · cena {p.pricePln.toFixed(2)} zł
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`tabular-nums text-lg font-semibold ${p.inherited ? "text-ink-muted" : "text-accent-300"}`}>
                          {p.effectivePct}%
                        </span>
                        <p className="text-xs text-ink-faint">do normy: {p.normValuePln.toFixed(2)} zł/szt.</p>
                      </div>
                    </div>
                    <NormSlider
                      value={p.normPctOverride}
                      effectivePct={p.effectivePct}
                      inheritedPct={p.categoryPct}
                      onSave={(v) => zapiszProdukt(p.id, v)}
                    />
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {!loading && !error && data.categories.length === 0 && data.products.length === 0 && !wSzukaniu && (
          <div className="card flex flex-col items-center gap-3 p-10 text-center">
            <IconPackage className="h-8 w-8 text-ink-faint" />
            <p className="text-sm text-ink-muted">
              Katalog jest pusty. Kliknij „Synchro Presta”, żeby pobrać menu sklepu — kategorie, podkategorie
              i aktywne produkty.
            </p>
          </div>
        )}

        <p className="text-xs text-ink-faint">
          Pobierane są wyłącznie aktywne produkty z menu sklepu. Produkt włączony w PrestaShopie wskoczy tu przy
          najbliższej synchronizacji (codziennie o 3:00 albo po kliknięciu „Synchro Presta”).
        </p>
      </div>
    </PageShell>
  );
}
