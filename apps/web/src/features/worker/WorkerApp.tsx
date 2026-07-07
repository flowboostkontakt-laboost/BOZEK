import { useEffect, useRef, useState, type ReactNode } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { ProgressRing } from "../../components/ProgressRing";
import {
  IconArrowLeft,
  IconBarcode,
  IconCamera,
  IconChart,
  IconCheck,
  IconClock,
  IconKeypad,
  IconMenu,
  IconMinus,
  IconPlus,
} from "../../components/icons";
import { kolorPostepu } from "@sep/shared";
import { useAuth } from "../../lib/auth";
import { apiGet, apiPost, apiUpload } from "../../lib/api";
import { catalog as fixtureCatalog, type RecentEntry } from "../../lib/fixtures";

interface Prod {
  id?: string;
  name: string;
  category: string;
  last4: string;
  color: string;
}

type Screen = "dashboard" | "method" | "manual" | "scan" | "photo" | "confirm" | "task" | "stats";

const PALETTE = ["#8c3048", "#a8556b", "#7a3b46", "#a8264a", "#8a5a52", "#b08968"];
const colorFor = (s: string) => PALETTE[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

export function WorkerApp() {
  const { user, logout } = useAuth();
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [menu, setMenu] = useState(false);
  const [selected, setSelected] = useState<Prod | null>(null);
  const [qty, setQty] = useState(1);
  const [photo, setPhoto] = useState<string | null>(null);
  const [aiScore, setAiScore] = useState<number | null>(null);

  const [products, setProducts] = useState<Prod[]>(
    fixtureCatalog.map((c) => ({ name: c.name, category: c.category, last4: c.last4, color: c.color })),
  );
  const [progress, setProgress] = useState({ dayPct: 0, monthPct: 0 });
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [shiftStart, setShiftStart] = useState<Date | null>(null);

  const load = () => {
    apiGet<{ id: string; name: string; category: string; last4: string }[]>("/worker/products")
      .then((list) =>
        setProducts(list.map((p) => ({ ...p, color: colorFor(p.name) }))),
      )
      .catch(() => void 0);
    apiGet<{ dayPct: number; monthPct: number }>("/worker/me/progress").then(setProgress).catch(() => void 0);
    apiGet<RecentEntry[]>("/worker/entries/recent").then(setRecent).catch(() => void 0);
    apiGet<{ active: boolean; startedAt: string | null }>("/worker/shift/current")
      .then((r) => setShiftStart(r.startedAt ? new Date(r.startedAt) : null))
      .catch(() => void 0);
  };
  useEffect(load, []);

  const startShift = async () => {
    try {
      const r = await apiPost<{ startedAt: string }>("/worker/shift/start");
      setShiftStart(new Date(r.startedAt));
    } catch {
      setShiftStart(new Date());
    }
  };
  const stopShift = async () => {
    apiPost("/worker/shift/stop").catch(() => void 0);
    setShiftStart(null);
  };

  const toConfirm = (p: Prod, score: number | null = null) => {
    setSelected(p);
    setQty(1);
    setAiScore(score);
    setScreen("confirm");
  };

  const save = async (method: string) => {
    if (selected?.id) {
      try {
        await apiPost("/worker/entries", { productId: selected.id, quantity: qty, method });
        load();
      } catch {
        /* offline — pokaż lokalnie */
      }
    }
    if (selected && !selected.id) {
      const time = new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
      setRecent((r) => [{ name: selected.name, qty, time }, ...r].slice(0, 8));
    }
    setSelected(null);
    setQty(1);
    setPhoto(null);
    setAiScore(null);
    setScreen("dashboard");
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg text-ink">
      {screen === "dashboard" && (
        <Dashboard
          name={user?.name ?? "—"}
          progress={progress}
          recent={recent}
          shiftStart={shiftStart}
          onStartShift={startShift}
          onStopShift={stopShift}
          onMenu={() => setMenu(true)}
          onAdd={() => setScreen("method")}
          onTask={() => setScreen("task")}
        />
      )}
      {screen === "stats" && <StatsScreen onBack={() => setScreen("dashboard")} />}
      {screen === "method" && (
        <MethodPicker
          onBack={() => setScreen("dashboard")}
          onManual={() => setScreen("manual")}
          onScan={() => setScreen("scan")}
          onPhoto={() => setScreen("photo")}
        />
      )}
      {screen === "manual" && (
        <ManualEntry products={products} onBack={() => setScreen("method")} onNext={(p) => toConfirm(p)} />
      )}
      {screen === "scan" && (
        <ScanEntry products={products} onBack={() => setScreen("method")} onFound={(p) => toConfirm(p)} />
      )}
      {screen === "photo" && (
        <PhotoEntry
          products={products}
          onBack={() => setScreen("method")}
          onRecognized={(p, score, dataUrl) => {
            setPhoto(dataUrl);
            toConfirm(p, score);
          }}
        />
      )}
      {screen === "confirm" && selected && (
        <ConfirmEntry
          product={selected}
          qty={qty}
          photo={photo}
          aiScore={aiScore}
          onQty={setQty}
          onBack={() => setScreen("method")}
          onSave={() => save(aiScore !== null ? "PHOTO_AI" : "MANUAL_ID")}
        />
      )}
      {screen === "task" && <TaskEntry onBack={() => setScreen("dashboard")} onSent={() => setScreen("dashboard")} />}

      {menu && (
        <Menu
          name={user?.name ?? ""}
          onClose={() => setMenu(false)}
          onStats={() => { setMenu(false); setScreen("stats"); }}
          onRefresh={load}
          onLogout={logout}
        />
      )}
    </div>
  );
}

const safeTop = { paddingTop: "calc(env(safe-area-inset-top) + 14px)" };
const safeBottom = { paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" };

function TopBar({ title, onBack, onMenu, right }: { title: string; onBack?: () => void; onMenu?: () => void; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 pb-3" style={safeTop}>
      <button
        onClick={onBack ?? onMenu}
        className="grid h-11 w-11 place-items-center rounded-xl hover:bg-surface-2 active:scale-95"
        aria-label={onBack ? "Wróć" : "Menu"}
      >
        {onBack ? <IconArrowLeft className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
      </button>
      <p className="text-sm font-semibold tracking-wide">{title}</p>
      {right ?? <div className="h-11 w-11" />}
    </div>
  );
}

function Menu({
  name,
  onClose,
  onStats,
  onRefresh,
  onLogout,
}: {
  name: string;
  onClose: () => void;
  onStats: () => void;
  onRefresh: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative ml-0 flex h-full w-72 max-w-[80%] flex-col bg-surface-1 p-5"
        style={{ ...safeTop, ...safeBottom }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-accent font-semibold text-white">
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{name}</p>
            <p className="text-xs text-ink-faint">Pracownica</p>
          </div>
        </div>
        <button onClick={onStats} className="mb-3 flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 text-left font-medium hover:bg-surface-2">
          <IconChart className="h-5 w-5 text-accent-300" /> Statystyki
        </button>
        <button onClick={() => { onRefresh(); onClose(); }} className="btn-ghost mb-3 w-full text-left">
          Odśwież dane
        </button>
        <button onClick={onLogout} className="mt-auto w-full rounded-xl bg-bad/15 py-3 font-medium text-bad">
          Wyloguj
        </button>
      </div>
    </div>
  );
}

function Dashboard({
  name,
  progress,
  recent,
  shiftStart,
  onStartShift,
  onStopShift,
  onMenu,
  onAdd,
  onTask,
}: {
  name: string;
  progress: { dayPct: number; monthPct: number };
  recent: RecentEntry[];
  shiftStart: Date | null;
  onStartShift: () => void;
  onStopShift: () => void;
  onMenu: () => void;
  onAdd: () => void;
  onTask: () => void;
}) {
  const now = new Date();
  const dateLabel = now.toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
  const monthLabel = now.toLocaleDateString("pl-PL", { month: "long", year: "numeric" }).toUpperCase();

  return (
    <div className="flex flex-1 flex-col" style={safeBottom}>
      <TopBar
        title={dateLabel}
        onMenu={onMenu}
        right={<div className="grid h-11 w-11 place-items-center rounded-full bg-accent text-sm font-semibold text-white">{name.slice(0, 1).toUpperCase()}</div>}
      />

      <div className="flex items-center justify-between px-4 pb-2 pt-1">
        <p className="text-2xl font-semibold">Cześć, {name}</p>
        <span className="text-xs text-ink-faint">{monthLabel}</span>
      </div>

      <WorkTimer start={shiftStart} onStart={onStartShift} onStop={onStopShift} />

      <div className="mx-4 mt-3 flex items-center justify-around rounded-2xl border border-line bg-surface-1 py-6">
        <ProgressRing pct={progress.dayPct} label="Dziś" size={108} />
        <ProgressRing pct={progress.monthPct} label="Miesiąc" size={108} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 px-4">
        <button onClick={onAdd} className="flex flex-col items-center gap-2 rounded-2xl bg-accent px-4 py-7 text-lg font-semibold text-white transition active:scale-[0.98]">
          <IconPlus className="h-8 w-8" />
          Dodaj produkt
        </button>
        <button onClick={onTask} className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface-1 px-4 py-7 text-lg font-semibold transition active:scale-[0.98]">
          <IconClock className="h-8 w-8 text-accent-300" />
          Zadanie inne
        </button>
      </div>

      <div className="mx-4 mt-4 flex-1 rounded-2xl border border-line bg-surface-1 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">Ostatnio dodane</p>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-faint">Brak wpisów. Dodaj pierwszy produkt.</p>
        ) : (
          <ul className="divide-y divide-line/50">
            {recent.map((r, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-surface-3 text-sm font-semibold tabular-nums text-accent-300">{r.qty}×</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-ink-faint">{r.qty} szt.</p>
                </div>
                <span className="text-xs tabular-nums text-ink-faint">{r.time}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MethodPicker({ onBack, onManual, onScan, onPhoto }: { onBack: () => void; onManual: () => void; onScan: () => void; onPhoto: () => void }) {
  const methods = [
    { icon: IconKeypad, title: "Ręczne ID", sub: "Wpisz 4 ostatnie cyfry", on: onManual },
    { icon: IconBarcode, title: "Skanuj kod", sub: "Zeskanuj aparatem", on: onScan },
    { icon: IconCamera, title: "Zdjęcie (AI)", sub: "Zrób zdjęcie produktu", on: onPhoto },
  ];
  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Nowy wpis" onBack={onBack} />
      <div className="space-y-4 px-4 pt-4">
        {methods.map((m, i) => (
          <button
            key={m.title}
            onClick={m.on}
            className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface-1 p-5 text-left transition hover:border-accent/50 active:scale-[0.99]"
          >
            <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-300">
              <m.icon className="h-7 w-7" />
              <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-semibold text-white">{i + 1}</span>
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold">{m.title}</p>
              <p className="text-sm text-ink-muted">{m.sub}</p>
            </div>
            <IconArrowLeft className="ml-auto h-5 w-5 rotate-180 text-ink-faint" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ManualEntry({ products, onBack, onNext }: { products: Prod[]; onBack: () => void; onNext: (p: Prod) => void }) {
  const [val, setVal] = useState("");
  const match = val.length === 4 ? products.find((p) => p.last4 === val) : undefined;
  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Ręczne ID" onBack={onBack} />
      <div className="px-5 pt-6">
        <label className="text-sm text-ink-muted">4 ostatnie cyfry ID produktu</label>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          placeholder="0000"
          className="mt-2 w-full rounded-2xl border border-line bg-surface-1 px-5 py-4 text-center text-3xl tracking-[0.5em] outline-none focus:border-accent"
        />
        {val.length === 4 &&
          (match ? (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent-soft p-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl text-lg font-bold text-white/80" style={{ background: match.color }}>
                {match.name.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{match.name}</p>
                <p className="text-xs text-ink-muted">Kat: {match.category}</p>
              </div>
              <IconCheck className="ml-auto h-6 w-6 text-ok" />
            </div>
          ) : (
            <p className="mt-6 text-center text-sm text-bad">Nie znaleziono produktu o tym ID.</p>
          ))}
      </div>
      <div className="mt-auto px-4 pt-5" style={safeBottom}>
        <button
          disabled={!match}
          onClick={() => match && onNext(match)}
          className="w-full rounded-2xl bg-accent py-4 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          Dalej
        </button>
      </div>
    </div>
  );
}

function ScanEntry({ products, onBack, onFound }: { products: Prod[]; onBack: () => void; onFound: (p: Prod) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camError, setCamError] = useState(false);

  useEffect(() => {
    let controls: { stop: () => void } | undefined;
    const reader = new BrowserMultiFormatReader();
    (async () => {
      try {
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
          if (result) {
            const code = result.getText();
            const p = products.find((x) => x.last4 === code.slice(-4)) ?? products[0];
            controls?.stop();
            if (p) onFound(p);
          }
        });
      } catch {
        setCamError(true);
      }
    })();
    return () => controls?.stop();
  }, [onFound, products]);

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Skanowanie…" onBack={onBack} />
      <div className="px-5 pt-4">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-accent/70" />
        </div>
        <p className="mt-3 text-center text-xs text-ink-faint">
          {camError ? "Brak dostępu do kamery — użyj przycisku poniżej." : "Skieruj aparat na kod kreskowy / QR."}
        </p>
      </div>
      <div className="mt-auto px-4 pt-5" style={safeBottom}>
        {products[0] && (
          <button onClick={() => onFound(products[0])} className="w-full rounded-2xl border border-line bg-surface-1 py-3 text-sm font-medium">
            Wpisz ręcznie zamiast skanu
          </button>
        )}
      </div>
    </div>
  );
}

function PhotoEntry({ products, onBack, onRecognized }: { products: Prod[]; onBack: () => void; onRecognized: (p: Prod, score: number, dataUrl: string) => void }) {
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      const res = await apiUpload<{ product?: { id: string; name: string; category: string }; score?: number }>(
        "/worker/entries/recognize",
        form,
      );
      const match = res?.product;
      if (match) {
        const p = products.find((x) => x.id === match.id) ?? { ...match, last4: "", color: colorFor(match.name) };
        onRecognized(p, res.score ?? 0.9, url);
        return;
      }
    } catch {
      /* fallback poniżej */
    }
    if (products[0]) onRecognized(products[0], 0.9, url);
    setBusy(false);
  };

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Zdjęcie produktu (AI)" onBack={onBack} />
      <div className="px-5 pt-6">
        {!busy ? (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line bg-surface-1 text-ink-muted">
            <IconCamera className="h-12 w-12 text-accent-300" />
            <span className="text-sm">Zrób lub wybierz zdjęcie</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
        ) : (
          <div className="flex aspect-square flex-col items-center justify-center gap-4 rounded-2xl border border-line bg-surface-1">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm text-ink-muted">Rozpoznaję produkt…</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmEntry({
  product,
  qty,
  photo,
  aiScore,
  onQty,
  onBack,
  onSave,
}: {
  product: Prod;
  qty: number;
  photo: string | null;
  aiScore: number | null;
  onQty: (n: number) => void;
  onBack: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Potwierdź wpis" onBack={onBack} />
      <div className="px-5 pt-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line">
          {photo ? (
            <img src={photo} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-6xl font-bold text-white/80" style={{ background: product.color }}>
              {product.name.slice(0, 1)}
            </div>
          )}
          {aiScore !== null && <span className="absolute right-3 top-3 rounded-lg bg-black/60 px-2 py-1 text-xs font-medium text-ok">AI {Math.round(aiScore * 100)}%</span>}
        </div>

        <p className="mt-5 text-center text-xs font-medium uppercase tracking-wide text-ink-faint">Wpisz ilość sztuk</p>
        <div className="mt-2 flex items-center justify-center gap-6">
          <button onClick={() => onQty(Math.max(1, qty - 1))} className="grid h-14 w-14 place-items-center rounded-full border border-line bg-surface-1 active:scale-95">
            <IconMinus className="h-6 w-6" />
          </button>
          <span className="w-14 text-center text-5xl font-semibold">{qty}</span>
          <button onClick={() => onQty(qty + 1)} className="grid h-14 w-14 place-items-center rounded-full bg-accent text-white active:scale-95">
            <IconPlus className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-surface-1 p-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl text-lg font-bold text-white/80" style={{ background: product.color }}>
            {product.name.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{product.name}</p>
            <p className="text-xs text-ink-muted">Kat: {product.category}</p>
          </div>
        </div>
      </div>

      <div className="mt-auto px-4 pt-5" style={safeBottom}>
        <button onClick={onSave} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-base font-semibold text-white transition active:scale-[0.98]">
          <IconCheck className="h-5 w-5" /> Zapisz wynik
        </button>
      </div>
    </div>
  );
}

function TaskEntry({ onBack, onSent }: { onBack: () => void; onSent: () => void }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const send = async () => {
    setState("sending");
    try {
      await apiPost("/worker/tasks", { label: text.trim() });
      setState("done");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="flex flex-1 flex-col">
        <TopBar title="Zadanie inne" />
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-ok/15">
            <IconCheck className="h-10 w-10 text-ok" />
          </div>
          <p className="mt-5 text-xl font-semibold">Zgłoszenie wysłane</p>
          <p className="mt-1 text-sm text-ink-muted">Trafiło do administratora „Do sprawdzenia".</p>
        </div>
        <div className="mt-auto px-4 pt-5" style={safeBottom}>
          <button onClick={onSent} className="w-full rounded-2xl bg-accent py-4 text-base font-semibold text-white active:scale-[0.98]">
            Gotowe
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Zadanie inne" onBack={onBack} />
      <div className="px-4 pt-6">
        <label className="text-sm text-ink-muted">Opis zadania / poprawki / pracy porządkowej</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="np. Poprawka szwu — turban zamówienie #482"
          className="mt-2 w-full resize-none rounded-2xl border border-line bg-surface-1 px-4 py-3 text-base outline-none focus:border-accent"
        />
        <p className="mt-3 rounded-xl bg-surface-1 p-3 text-xs text-ink-faint">
          Zgłoszenie trafi do administratora ze statusem <b className="text-ink-muted">„Do sprawdzenia"</b> i zostanie wycenione.
        </p>
        {state === "error" && (
          <p className="mt-3 text-sm text-bad">Nie udało się wysłać — sprawdź połączenie i spróbuj ponownie.</p>
        )}
      </div>
      <div className="mt-auto px-4 pt-5" style={safeBottom}>
        <button
          disabled={!text.trim() || state === "sending"}
          onClick={send}
          className="w-full rounded-2xl bg-accent py-4 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          {state === "sending" ? "Wysyłanie…" : "Wyślij do weryfikacji"}
        </button>
      </div>
    </div>
  );
}

// ─── Licznik czasu pracy ──────────────────────────────────────────────
function WorkTimer({ start, onStart, onStop }: { start: Date | null; onStart: () => void; onStop: () => void }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!start) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [start]);

  if (!start) {
    return (
      <button
        onClick={onStart}
        className="mx-4 mt-3 flex items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-lg font-semibold text-white transition active:scale-[0.98]"
      >
        <IconClock className="h-6 w-6" /> Zacznij pracę
      </button>
    );
  }
  const secs = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  const label = `${p(Math.floor(secs / 3600))}:${p(Math.floor((secs % 3600) / 60))}:${p(secs % 60)}`;
  return (
    <div className="mx-4 mt-3 flex items-center justify-between rounded-2xl border border-accent/40 bg-accent-soft p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-faint">Czas pracy</p>
        <p className="text-3xl font-semibold tabular-nums">{label}</p>
      </div>
      <button onClick={onStop} className="rounded-xl bg-bad/20 px-4 py-2.5 font-medium text-bad">
        Zakończ
      </button>
    </div>
  );
}

// ─── Ekran Statystyki ─────────────────────────────────────────────────
function StatsScreen({ onBack }: { onBack: () => void }) {
  const [s, setS] = useState({ dayPct: 0, monthPct: 0, todayUnits: 0, monthUnits: 0 });
  useEffect(() => {
    apiGet<typeof s>("/worker/me/stats").then(setS).catch(() => void 0);
  }, []);
  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Statystyki" onBack={onBack} />
      <div className="space-y-5 px-4 pt-5" style={safeBottom}>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Norma dziś" value={`${s.dayPct}%`} accent />
          <StatCard label="Norma w miesiącu" value={`${s.monthPct}%`} accent />
          <StatCard label="Sztuki dziś" value={String(s.todayUnits)} />
          <StatCard label="Sztuki w miesiącu" value={String(s.monthUnits)} />
        </div>
        <div className="rounded-2xl border border-line bg-surface-1 p-4">
          <StatBar label="Realizacja dzienna" pct={s.dayPct} />
          <div className="h-4" />
          <StatBar label="Realizacja miesięczna" pct={s.monthPct} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-1 p-4">
      <p className="text-xs uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${accent ? "text-accent-300" : ""}`}>{value}</p>
    </div>
  );
}

const BAR_COLOR = { danger: "#fb7185", warning: "#fbbf24", ok: "#c33a5e", success: "#34d399" } as const;
function StatBar({ label, pct }: { label: string; pct: number }) {
  const color = BAR_COLOR[kolorPostepu(pct)];
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-ink-muted">{label}</span>
        <span className="font-medium" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
    </div>
  );
}
