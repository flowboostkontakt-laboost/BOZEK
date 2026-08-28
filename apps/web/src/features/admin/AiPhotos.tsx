import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "../../lib/api";

interface AiStatus {
  provider: string;
  model: string | null;
  keyConfigured: boolean;
  enabled: boolean;
  threshold: number;
  products: number;
  withPhoto: number;
  indexed: number;
  remaining: number;
}

interface ReindexResult {
  indexed: number;
  failed: number;
  remaining: number;
  note: string | null;
}

/** Ile zdjęć przeliczamy w jednym żądaniu — tyle, żeby nie zabić timeoutu. */
const PARTIA = 100;

/**
 * Rozpoznawanie produktów ze zdjęć — stan i przeliczanie katalogu.
 *
 * Każde zdjęcie to jedno płatne zapytanie do dostawcy, dlatego przeliczamy
 * partiami, pomijamy to, co już policzone, i mówimy wprost, ile zostało.
 */
export function AiPhotos() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [postep, setPostep] = useState<string | null>(null);
  const [blad, setBlad] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await apiGet<AiStatus>("/admin/ai/status"));
      setBlad(null);
    } catch (e) {
      setBlad(`Nie udało się pobrać stanu modułu AI: ${(e as Error).message}`);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const przelicz = async () => {
    setBusy(true);
    setBlad(null);
    let razem = 0;
    let bledy = 0;
    try {
      // Kolejne partie aż do wyczerpania — z twardym limitem obiegów,
      // żeby błąd po stronie dostawcy nie zapętlił przeglądarki.
      for (let i = 0; i < 40; i++) {
        const res = await apiPost<ReindexResult>("/admin/ai/reindex", { limit: PARTIA });
        razem += res.indexed;
        bledy += res.failed;
        setPostep(`Przeliczono ${razem} zdjęć${bledy ? `, błędów: ${bledy}` : ""}. Zostało ${res.remaining}.`);
        if (res.note) setBlad(res.note);
        if (res.remaining === 0 || res.indexed === 0) break;
      }
    } catch (e) {
      setBlad(`Przeliczanie przerwane: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      void load();
    }
  };

  if (!status) {
    return (
      <section className="card p-4 sm:p-5">
        <h2 className="text-sm font-medium text-ink-muted">Rozpoznawanie ze zdjęć</h2>
        <p className="mt-2 text-sm text-ink-faint">{blad ?? "Wczytywanie…"}</p>
      </section>
    );
  }

  const proc = status.withPhoto > 0 ? Math.round((status.indexed / status.withPhoto) * 100) : 0;

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-ink-muted">Rozpoznawanie ze zdjęć</h2>
          <p className="mt-1 text-sm">
            {status.enabled ? (
              <>
                Aktywne — dostawca <span className="text-ink-muted">{status.provider}</span>, model{" "}
                <span className="text-ink-muted">{status.model}</span>, próg pewności{" "}
                <span className="tabular-nums">{Math.round(status.threshold * 100)}%</span>
              </>
            ) : (
              <span className="text-warn">
                Wyłączone — brakuje klucza AI_API_KEY w konfiguracji serwera (Render → Environment).
              </span>
            )}
          </p>
        </div>
        <button
          onClick={przelicz}
          disabled={busy || !status.enabled || status.remaining === 0}
          className="btn-primary disabled:opacity-50"
        >
          {busy ? "Przeliczanie…" : status.remaining === 0 ? "Wszystko przeliczone" : "Przelicz zdjęcia"}
        </button>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-ink-faint">
          <span>
            Przeliczone zdjęcia: {status.indexed} z {status.withPhoto}
          </span>
          <span className="tabular-nums">{proc}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${proc}%` }} />
        </div>
        {status.products > status.withPhoto && (
          <p className="mt-2 text-xs text-ink-faint">
            {status.products - status.withPhoto} produktów nie ma zdjęcia w sklepie — tych AI nie rozpozna.
          </p>
        )}
      </div>

      {postep && <p className="mt-3 text-sm text-ok">{postep}</p>}
      {blad && <p className="mt-2 text-sm text-bad">{blad}</p>}

      <p className="mt-3 text-xs text-ink-faint">
        Każde zdjęcie to jedno płatne zapytanie do dostawcy. Przeliczanie pomija to, co już policzone, więc po
        synchronizacji katalogu dopłacasz wyłącznie za nowe produkty. Poniżej progu pewności aplikacja niczego nie
        proponuje — pracownica wpisuje ID albo zgłasza zdjęcie do sprawdzenia.
      </p>
    </section>
  );
}
