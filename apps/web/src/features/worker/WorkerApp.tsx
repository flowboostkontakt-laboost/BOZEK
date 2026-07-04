import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { ProgressRing } from "../../components/ProgressRing";
import {
  IconArrowLeft,
  IconBarcode,
  IconCamera,
  IconCheck,
  IconClock,
  IconKeypad,
  IconMenu,
  IconMinus,
  IconPlus,
} from "../../components/icons";
import {
  workerFixture,
  findByLast4,
  catalog,
  type CatalogProduct,
  type RecentEntry,
} from "../../lib/fixtures";

type Screen = "dashboard" | "method" | "manual" | "scan" | "photo" | "confirm" | "task";

export function WorkerApp() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const [qty, setQty] = useState(1);
  const [photo, setPhoto] = useState<string | null>(null);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [recent, setRecent] = useState<RecentEntry[]>(workerFixture.recent);

  const toConfirm = (p: CatalogProduct, score: number | null = null) => {
    setSelected(p);
    setQty(1);
    setAiScore(score);
    setScreen("confirm");
  };

  const reset = () => {
    setSelected(null);
    setQty(1);
    setPhoto(null);
    setAiScore(null);
  };

  const save = () => {
    if (selected) {
      const time = new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
      setRecent([{ name: selected.name, qty, time }, ...recent].slice(0, 6));
    }
    reset();
    setScreen("dashboard");
  };

  return (
    <PhoneFrame>
      {screen === "dashboard" && (
        <Dashboard recent={recent} onAdd={() => setScreen("method")} onTask={() => setScreen("task")} />
      )}
      {screen === "method" && (
        <MethodPicker
          onBack={() => setScreen("dashboard")}
          onManual={() => setScreen("manual")}
          onScan={() => setScreen("scan")}
          onPhoto={() => setScreen("photo")}
        />
      )}
      {screen === "manual" && (
        <ManualEntry onBack={() => setScreen("method")} onNext={(p) => toConfirm(p)} />
      )}
      {screen === "scan" && (
        <ScanEntry onBack={() => setScreen("method")} onFound={(p) => toConfirm(p)} />
      )}
      {screen === "photo" && (
        <PhotoEntry
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
          onSave={save}
        />
      )}
      {screen === "task" && <TaskEntry onBack={() => setScreen("dashboard")} onSent={() => setScreen("dashboard")} />}
    </PhoneFrame>
  );
}

// ─── Ramka telefonu ───────────────────────────────────────────────────
function PhoneFrame({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="grid min-h-screen place-items-center bg-black/60 p-4">
      <div className="relative h-[812px] w-[390px] overflow-hidden rounded-[2.75rem] border-[10px] border-[#111019] bg-bg shadow-2xl">
        <div className="absolute left-1/2 top-0 z-10 h-6 w-36 -translate-x-1/2 rounded-b-2xl bg-[#111019]" />
        <div className="h-full overflow-y-auto">{children}</div>
      </div>
      <button
        onClick={() => navigate("/")}
        className="mt-4 text-xs text-ink-faint underline underline-offset-4 hover:text-ink-muted"
      >
        ← wróć do strony głównej
      </button>
    </div>
  );
}

function TopBar({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 pb-2 pt-8">
      {onBack ? (
        <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-surface-2">
          <IconArrowLeft className="h-5 w-5" />
        </button>
      ) : (
        <button className="grid h-9 w-9 place-items-center rounded-xl hover:bg-surface-2">
          <IconMenu className="h-5 w-5" />
        </button>
      )}
      <p className="text-sm font-semibold tracking-wide">{title}</p>
      {right ?? <div className="h-9 w-9 rounded-full bg-surface-3" />}
    </div>
  );
}

// ─── Ekran 1: Główny Dashboard ────────────────────────────────────────
function Dashboard({
  recent,
  onAdd,
  onTask,
}: {
  recent: RecentEntry[];
  onAdd: () => void;
  onTask: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <TopBar
        title={`${workerFixture.dateLabel} · ${workerFixture.dayLabel}`}
        right={<div className="grid h-9 w-9 place-items-center rounded-full bg-accent text-xs font-semibold text-white">A</div>}
      />

      <div className="flex items-center justify-between px-5 pb-2 pt-2">
        <p className="text-lg font-semibold">Profil: {workerFixture.name}</p>
        <span className="text-xs text-ink-faint">{workerFixture.monthLabel}</span>
      </div>

      <div className="mx-4 mt-2 flex items-center justify-around rounded-2xl border border-line bg-surface-1 py-5">
        <ProgressRing pct={workerFixture.dayPct} label="Dziś" size={104} />
        <ProgressRing pct={workerFixture.monthPct} label="Miesiąc" size={104} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 px-4">
        <button onClick={onAdd} className="flex flex-col items-center gap-2 rounded-2xl bg-accent px-4 py-6 font-semibold text-white transition active:scale-[0.98]">
          <IconPlus className="h-7 w-7" />
          Dodaj produkt
        </button>
        <button onClick={onTask} className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface-1 px-4 py-6 font-semibold transition active:scale-[0.98]">
          <IconClock className="h-7 w-7 text-accent-300" />
          Zadanie inne
        </button>
      </div>

      <div className="mx-4 mt-4 flex-1 rounded-2xl border border-line bg-surface-1 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">Ostatnio dodane</p>
        <ul className="space-y-3">
          {recent.map((r, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-surface-3 text-xs font-semibold text-accent-300">
                {r.qty}×
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-ink-faint">{r.qty} szt.</p>
              </div>
              <span className="text-xs text-ink-faint">{r.time}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="h-4" />
    </div>
  );
}

// ─── Ekran 2: Wybór metody ────────────────────────────────────────────
function MethodPicker({
  onBack,
  onManual,
  onScan,
  onPhoto,
}: {
  onBack: () => void;
  onManual: () => void;
  onScan: () => void;
  onPhoto: () => void;
}) {
  const methods = [
    { icon: IconKeypad, title: "1. Ręczne ID", sub: "Wpisz 4 ostatnie cyfry", on: onManual },
    { icon: IconBarcode, title: "2. Skanuj kod", sub: "Zeskanuj aparatem", on: onScan },
    { icon: IconCamera, title: "3. Zdjęcie (AI)", sub: "Zrób zdjęcie produktu", on: onPhoto },
  ];
  return (
    <div className="flex h-full flex-col">
      <TopBar title="Nowy wpis" onBack={onBack} right={<span className="text-xs text-ink-faint">{workerFixture.monthLabel}</span>} />
      <div className="space-y-4 px-4 pt-4">
        {methods.map((m) => (
          <button
            key={m.title}
            onClick={m.on}
            className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface-1 p-5 text-left transition hover:border-accent/50 hover:bg-surface-2 active:scale-[0.99]"
          >
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-300">
              <m.icon className="h-7 w-7" />
            </div>
            <div>
              <p className="font-semibold">{m.title}</p>
              <p className="text-sm text-ink-muted">{m.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Ekran: Ręczne ID ─────────────────────────────────────────────────
function ManualEntry({ onBack, onNext }: { onBack: () => void; onNext: (p: CatalogProduct) => void }) {
  const [val, setVal] = useState("");
  const match = val.length === 4 ? findByLast4(val) : undefined;
  return (
    <div className="flex h-full flex-col">
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
        <p className="mt-3 text-center text-xs text-ink-faint">np. 0921, 1015, 3307</p>

        {val.length === 4 &&
          (match ? (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent-soft p-4">
              <div className="h-12 w-12 rounded-xl" style={{ background: match.color }} />
              <div>
                <p className="font-medium">{match.name}</p>
                <p className="text-xs text-ink-muted">Kat: {match.category}</p>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-center text-sm text-bad">Nie znaleziono produktu o tym ID.</p>
          ))}
      </div>
      <div className="mt-auto p-5">
        <button
          disabled={!match}
          onClick={() => match && onNext(match)}
          className="w-full rounded-2xl bg-accent py-4 font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          Dalej
        </button>
      </div>
    </div>
  );
}

// ─── Ekran: Skanowanie kodu ───────────────────────────────────────────
function ScanEntry({ onBack, onFound }: { onBack: () => void; onFound: (p: CatalogProduct) => void }) {
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
            const p = findByLast4(code.slice(-4)) ?? catalog[0];
            controls?.stop();
            onFound(p);
          }
        });
      } catch {
        setCamError(true);
      }
    })();
    return () => controls?.stop();
  }, [onFound]);

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Skanowanie…" onBack={onBack} />
      <div className="px-5 pt-4">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-accent/70" />
        </div>
        {camError ? (
          <p className="mt-3 text-center text-xs text-ink-faint">Brak dostępu do kamery — użyj symulacji poniżej.</p>
        ) : (
          <p className="mt-3 text-center text-xs text-ink-faint">Skieruj aparat na kod kreskowy / QR.</p>
        )}
      </div>
      <div className="mt-auto space-y-3 p-5">
        <button onClick={() => onFound(catalog[0])} className="w-full rounded-2xl border border-line bg-surface-1 py-3 text-sm font-medium">
          Symuluj skan: {catalog[0].name}
        </button>
      </div>
    </div>
  );
}

// ─── Ekran: Zdjęcie (AI) — Wariant A ──────────────────────────────────
function PhotoEntry({
  onBack,
  onRecognized,
}: {
  onBack: () => void;
  onRecognized: (p: CatalogProduct, score: number, dataUrl: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setBusy(true);
    // W realnej aplikacji: POST zdjęcia → backend liczy embedding (CLIP) i szuka
    // najbliższego sąsiada w pgvector. Poniżej symulacja dopasowania.
    setTimeout(() => onRecognized(catalog[0], 0.94, url), 1200);
  };

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Zdjęcie produktu (AI)" onBack={onBack} />
      <div className="px-5 pt-6">
        {!busy ? (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line bg-surface-1 text-ink-muted">
            <IconCamera className="h-12 w-12 text-accent-300" />
            <span className="text-sm">Zrób lub wybierz zdjęcie</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        ) : (
          <div className="flex aspect-square flex-col items-center justify-center gap-4 rounded-2xl border border-line bg-surface-1">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm text-ink-muted">Rozpoznaję produkt…</p>
          </div>
        )}
        <p className="mt-3 text-center text-xs text-ink-faint">
          Silnik AI dopasuje zdjęcie do katalogu PrestaShop.
        </p>
      </div>
    </div>
  );
}

// ─── Ekran 3: Potwierdzenie (ilość + zapis) ───────────────────────────
function ConfirmEntry({
  product,
  qty,
  photo,
  aiScore,
  onQty,
  onBack,
  onSave,
}: {
  product: CatalogProduct;
  qty: number;
  photo: string | null;
  aiScore: number | null;
  onQty: (n: number) => void;
  onBack: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <TopBar title={aiScore ? "Skanowanie…" : "Potwierdź wpis"} onBack={onBack} />
      <div className="px-5 pt-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line">
          {photo ? (
            <img src={photo} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: product.color }} />
          )}
          {aiScore !== null && (
            <span className="absolute right-3 top-3 rounded-lg bg-black/60 px-2 py-1 text-xs font-medium text-ok">
              AI {Math.round(aiScore * 100)}%
            </span>
          )}
        </div>

        <p className="mt-5 text-center text-xs font-medium uppercase tracking-wide text-ink-faint">
          Wpisz ilość sztuk
        </p>
        <div className="mt-2 flex items-center justify-center gap-6">
          <button
            onClick={() => onQty(Math.max(1, qty - 1))}
            className="grid h-12 w-12 place-items-center rounded-full border border-line bg-surface-1 active:scale-95"
          >
            <IconMinus className="h-5 w-5" />
          </button>
          <span className="w-12 text-center text-4xl font-semibold">{qty}</span>
          <button
            onClick={() => onQty(qty + 1)}
            className="grid h-12 w-12 place-items-center rounded-full bg-accent text-white active:scale-95"
          >
            <IconPlus className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-surface-1 p-4">
          <div className="h-12 w-12 rounded-xl" style={{ background: product.color }} />
          <div>
            <p className="font-medium">{product.name}</p>
            <p className="text-xs text-ink-muted">Kat: {product.category}</p>
          </div>
        </div>
      </div>

      <div className="mt-auto p-5">
        <button
          onClick={onSave}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 font-semibold text-white transition active:scale-[0.98]"
        >
          <IconCheck className="h-5 w-5" /> Zapisz wynik
        </button>
      </div>
    </div>
  );
}

// ─── Ekran: Zadanie inne (do weryfikacji) ─────────────────────────────
function TaskEntry({ onBack, onSent }: { onBack: () => void; onSent: () => void }) {
  const [text, setText] = useState("");
  return (
    <div className="flex h-full flex-col">
      <TopBar title="Zadanie inne" onBack={onBack} />
      <div className="px-5 pt-6">
        <label className="text-sm text-ink-muted">Opis zadania / poprawki / pracy porządkowej</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="np. Poprawka szwu — turban zamówienie #482"
          className="mt-2 w-full resize-none rounded-2xl border border-line bg-surface-1 px-4 py-3 outline-none focus:border-accent"
        />
        <p className="mt-3 rounded-xl bg-surface-1 p-3 text-xs text-ink-faint">
          Zgłoszenie trafi do administratora ze statusem <b className="text-ink-muted">„Do weryfikacji"</b> i zostanie wycenione ręcznie.
        </p>
      </div>
      <div className="mt-auto p-5">
        <button
          disabled={!text.trim()}
          onClick={onSent}
          className="w-full rounded-2xl bg-accent py-4 font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          Wyślij do weryfikacji
        </button>
      </div>
    </div>
  );
}
