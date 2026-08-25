import { useEffect, useState } from "react";

/**
 * Suwak % normy dla węzła drzewa (kategoria, podkategoria albo produkt).
 *
 * Puste ustawienie (`value === null`) znaczy „dziedziczę po gałęzi wyżej" —
 * pokazujemy wtedy odziedziczoną wartość na szaro. Zapis leci przy puszczeniu
 * suwaka (albo z pola liczbowego), a nie przy każdym pikselu przeciągnięcia.
 */
export function NormSlider({
  value,
  effectivePct,
  inheritedPct,
  onSave,
  disabled,
}: {
  /** Własne ustawienie tego poziomu; null = dziedziczy. */
  value: number | null;
  /** Wartość obowiązująca (własna albo odziedziczona). */
  effectivePct: number;
  /** Ile wyjdzie po wyczyszczeniu własnego ustawienia. */
  inheritedPct: number;
  onSave: (v: number | null) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(effectivePct);
  const [stan, setStan] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Po odświeżeniu danych z serwera (np. zmiana % wyżej w drzewie) suwak ma
  // pokazywać nową wartość obowiązującą, a nie starą pozycję sprzed zapisu.
  useEffect(() => setDraft(effectivePct), [effectivePct]);

  const zapisz = async (v: number | null) => {
    setStan("saving");
    try {
      await onSave(v);
      setStan("saved");
      setTimeout(() => setStan((s) => (s === "saved" ? "idle" : s)), 1500);
    } catch {
      setStan("error");
    }
  };

  const wlasny = value != null;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={200}
          step={5}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(+e.target.value)}
          onMouseUp={() => zapisz(draft)}
          onTouchEnd={() => zapisz(draft)}
          onKeyUp={(e) => ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) && zapisz(draft)}
          className="h-2 flex-1 accent-accent disabled:opacity-40"
          aria-label="Procent normy"
        />
        <div className="flex shrink-0 items-center gap-1">
          <input
            type="number"
            min={0}
            max={1000}
            value={draft}
            disabled={disabled}
            onChange={(e) => setDraft(Math.max(0, Math.min(1000, +e.target.value)))}
            onBlur={() => draft !== (value ?? effectivePct) && zapisz(draft)}
            onKeyDown={(e) => e.key === "Enter" && zapisz(draft)}
            className="w-[4.5rem] rounded-lg border border-line bg-surface-1 px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-accent"
            aria-label="Procent normy — wpis ręczny"
          />
          <span className="text-sm text-ink-faint">%</span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {wlasny ? (
          <>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent-300">ustawione tutaj</span>
            <button
              onClick={() => zapisz(null)}
              disabled={disabled}
              className="text-ink-faint underline-offset-2 hover:text-ink hover:underline disabled:opacity-40"
            >
              wyczyść (dziedzicz {inheritedPct}%)
            </button>
          </>
        ) : (
          <span className="text-ink-faint">dziedziczy z góry: {inheritedPct}%</span>
        )}
        {stan === "saving" && <span className="text-ink-faint">zapisywanie…</span>}
        {stan === "saved" && <span className="text-ok">zapisano</span>}
        {stan === "error" && <span className="text-bad">błąd zapisu</span>}
      </div>
    </div>
  );
}
