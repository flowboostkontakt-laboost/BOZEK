import { useState } from "react";
import { PageShell } from "./PageShell";
import { IconCheck } from "../../components/icons";
import { useApiData, apiPost } from "../../lib/api";
import { reviewFixture, type ReviewItem } from "../../lib/fixtures";

export function Review() {
  const [items, setItems] = useApiData<ReviewItem[]>("/admin/review", reviewFixture);

  const remove = (id: string) => setItems(items.filter((i) => i.id !== id));

  return (
    <PageShell title="Do sprawdzenia" subtitle={`${items.length} pozycji do wyceny`}>
      {items.length === 0 ? (
        <div className="card grid place-items-center p-16 text-center text-ink-muted">
          Brak zgłoszeń do weryfikacji.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((it) => (
            <ReviewCard
              key={it.id}
              item={it}
              onApprove={(price) => {
                apiPost(`/admin/review/${it.id}/approve`, { normValuePln: price }).catch(() => void 0);
                remove(it.id);
              }}
              onReject={() => {
                apiPost(`/admin/review/${it.id}/reject`).catch(() => void 0);
                remove(it.id);
              }}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function ReviewCard({
  item,
  onApprove,
  onReject,
}: {
  item: ReviewItem;
  onApprove: (price: number) => void;
  onReject: () => void;
}) {
  const [price, setPrice] = useState(0);
  return (
    <section className="card flex items-center gap-4 p-5">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-surface-3 text-xs font-semibold text-accent-300">
        {item.employee.name[0]}
      </div>
      <div className="flex-1">
        <p className="font-medium">{item.customLabel}</p>
        <p className="text-xs text-ink-faint">
          {item.employee.name} · {item.createdAt}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-muted">Wycena normy (zł)</span>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(+e.target.value)}
          className="w-24 rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      <button
        disabled={price <= 0}
        onClick={() => onApprove(price)}
        className="flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        <IconCheck className="h-4 w-4" /> Zatwierdź
      </button>
      <button onClick={onReject} className="rounded-lg border border-line px-3 py-2 text-sm text-bad hover:bg-surface-2">
        Odrzuć
      </button>
    </section>
  );
}
