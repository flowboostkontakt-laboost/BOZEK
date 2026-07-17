import { useCallback, useEffect, useState } from "react";
import { PageShell } from "./PageShell";
import { IconRefresh, IconCheck, IconClock } from "../../components/icons";
import { apiGet, apiPost } from "../../lib/api";

interface SyncStatus {
  status: string; // SUCCESS | FAILED | RUNNING | NONE
  productsCount?: number | null;
  agoText: string;
  finishedAt?: string | null;
  message?: string | null;
}

type Phase = "loading" | "ready" | "unreachable";

const TONES: Record<string, { label: string; dot: string; pill: string }> = {
  SUCCESS: { label: "Połączenie sprawne", dot: "bg-ok", pill: "bg-ok/15 text-ok" },
  FAILED: { label: "Błąd synchronizacji", dot: "bg-bad", pill: "bg-bad/15 text-bad" },
  RUNNING: { label: "Synchronizacja w toku", dot: "bg-warn animate-pulse", pill: "bg-warn/15 text-warn" },
  NONE: { label: "Brak synchronizacji", dot: "bg-ink-faint", pill: "bg-surface-3 text-ink-muted" },
  UNREACHABLE: { label: "API niedostępne", dot: "bg-bad", pill: "bg-bad/15 text-bad" },
  LOADING: { label: "Ładowanie…", dot: "bg-ink-faint animate-pulse", pill: "bg-surface-3 text-ink-muted" },
};

export function ApiStatus() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await apiGet<SyncStatus>("/admin/sync/status");
      setStatus(d);
      setPhase("ready");
    } catch {
      setPhase("unreachable");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sync = async () => {
    setBusy(true);
    setStatus((s) => (s ? { ...s, status: "RUNNING", agoText: "w toku", message: null } : s));
    try {
      await apiPost("/admin/sync/run");
    } catch {
      /* szczegóły błędu odczytamy z /status (pole message) po odświeżeniu */
    } finally {
      await load();
      setBusy(false);
    }
  };

  const key = phase === "unreachable" ? "UNREACHABLE" : phase === "loading" ? "LOADING" : (status?.status ?? "NONE");
  const tone = TONES[key] ?? TONES.NONE;
  const failed = key === "FAILED" || key === "UNREACHABLE";
  const count = status?.productsCount ?? null;

  return (
    <PageShell title="API Status" subtitle="Synchronizacja katalogu PrestaShop">
      <section className="card max-w-lg p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 shrink-0 rounded-full ${tone.dot}`} />
            <span className="text-lg font-semibold">{tone.label}</span>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone.pill}`}>{key}</span>
        </div>

        <dl className="mt-5 space-y-3 text-sm">
          <Row k="Ostatnia synchronizacja" v={phase === "ready" ? status?.agoText ?? "—" : "—"} />
          <Row k="Zsynchronizowane produkty" v={count != null ? String(count) : "—"} />
          <Row k="Harmonogram" v="Codziennie o 03:00 (cron)" />
        </dl>

        {failed && (
          <div className="mt-5 rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm">
            <p className="font-medium text-bad">
              {key === "UNREACHABLE" ? "Nie można połączyć się z API" : "Ostatnia synchronizacja nie powiodła się"}
            </p>
            {status?.message && <p className="mt-1 break-words text-ink-muted">{status.message}</p>}
            {key === "UNREACHABLE" && (
              <p className="mt-1 text-ink-muted">Sprawdź, czy jesteś zalogowany jako administrator i czy backend działa.</p>
            )}
          </div>
        )}

        {key === "SUCCESS" && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-ok/25 bg-ok/10 p-3 text-sm text-ok">
            <IconCheck className="h-[18px] w-[18px] shrink-0" />
            <span>Katalog zsynchronizowany z PrestaShop.</span>
          </div>
        )}

        <button
          onClick={sync}
          disabled={busy || phase === "loading"}
          className="btn-primary mt-6 flex items-center gap-2 disabled:opacity-50"
        >
          <IconRefresh className={`h-[18px] w-[18px] ${busy ? "animate-spin" : ""}`} />
          {busy ? "Synchronizacja…" : "Wymuś synchronizację"}
        </button>

        {busy && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint">
            <IconClock className="h-4 w-4" />
            Pobieranie pełnego katalogu może potrwać kilkadziesiąt sekund.
          </p>
        )}
      </section>
    </PageShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-line/60 pb-2">
      <dt className="text-ink-muted">{k}</dt>
      <dd className="font-medium tabular-nums">{v}</dd>
    </div>
  );
}
