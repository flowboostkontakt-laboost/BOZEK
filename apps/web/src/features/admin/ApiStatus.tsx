import { useState } from "react";
import { PageShell } from "./PageShell";
import { IconRefresh } from "../../components/icons";
import { useApiData, apiPost } from "../../lib/api";

interface SyncStatus {
  status: string;
  productsCount?: number;
  agoText: string;
  message?: string;
}

export function ApiStatus() {
  const [status, setStatus] = useApiData<SyncStatus>("/admin/sync/status", {
    status: "SUCCESS",
    productsCount: 128,
    agoText: "10s temu",
  });
  const [busy, setBusy] = useState(false);

  const sync = async () => {
    setBusy(true);
    try {
      await apiPost("/admin/sync/run");
      setStatus({ ...status, agoText: "przed chwilą", message: undefined });
    } catch {
      /* fallback UI nadal pokazuje status z API */
    }
    setBusy(false);
  };

  const ok = status.status === "SUCCESS";
  return (
    <PageShell title="API Status" subtitle="Synchronizacja katalogu PrestaShop">
      <section className="card max-w-lg p-6">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${ok ? "bg-ok" : "bg-bad"}`} />
          <span className="text-lg font-semibold">{ok ? "Połączenie sprawne" : "Błąd synchronizacji"}</span>
        </div>
        <dl className="mt-5 space-y-3 text-sm">
          <Row k="Ostatnia synchronizacja" v={status.agoText} />
          <Row k="Zsynchronizowane produkty" v={String(status.productsCount ?? "—")} />
          <Row k="Harmonogram" v="Codziennie o 03:00 (cron)" />
          {status.message && <Row k="Błąd" v={status.message} />}
        </dl>
        <button onClick={sync} disabled={busy} className="btn-primary mt-6 flex items-center gap-2 disabled:opacity-50">
          <IconRefresh className={`h-[18px] w-[18px] ${busy ? "animate-spin" : ""}`} /> Wymuś synchronizację
        </button>
      </section>
    </PageShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-line/60 pb-2">
      <dt className="text-ink-muted">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}