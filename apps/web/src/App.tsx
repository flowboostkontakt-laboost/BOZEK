import { Link, Route, Routes } from "react-router-dom";
import { ProgressRing } from "./components/ProgressRing";
import { AdminLayout } from "./features/admin/AdminLayout";
import { Dashboard } from "./features/admin/Dashboard";
import { Reports } from "./features/admin/Reports";
import { Employees } from "./features/admin/Employees";
import { Catalog } from "./features/admin/Catalog";
import { Review } from "./features/admin/Review";
import { Calendar } from "./features/admin/Calendar";
import { Settings } from "./features/admin/Settings";
import { ApiStatus } from "./features/admin/ApiStatus";
import { WorkerApp } from "./features/worker/WorkerApp";

function Landing() {
  return (
    <div className="min-h-full">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent font-bold text-white">
            M
          </div>
          <div>
            <p className="text-sm font-semibold">Handmade Micro-Workshop</p>
            <p className="text-xs text-ink-faint">System Ewidencji Produkcji · Wariant A</p>
          </div>
        </div>
        <span className="rounded-lg border border-line px-3 py-1 text-xs text-ink-muted">
          v0.1 · szkielet
        </span>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Cyfrowa ewidencja produkcji bez papieru</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Lekka aplikacja PWA dla pracownic oraz panel analityczny dla administratora — z pełną
          integracją PrestaShop i automatycznym systemem premiowym.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <Link to="/admin" className="card group p-6 transition hover:shadow-glow">
            <p className="text-lg font-semibold">Panel Administratora</p>
            <p className="mt-1 text-sm text-ink-muted">
              Dashboard „Dzisiaj", normy, katalog, weryfikacja, raporty i eksport.
            </p>
            <span className="mt-4 inline-block text-sm text-accent-300 group-hover:underline">
              Otwórz panel →
            </span>
          </Link>
          <Link to="/app" className="card group p-6 transition hover:shadow-glow">
            <p className="text-lg font-semibold">Aplikacja Pracownicy</p>
            <p className="mt-1 text-sm text-ink-muted">
              Szybkie dodawanie produkcji: ID, skan kodu lub zdjęcie (AI). Postęp normy.
            </p>
            <span className="mt-4 inline-block text-sm text-accent-300 group-hover:underline">
              Otwórz aplikację →
            </span>
          </Link>
        </div>

        <div className="card mt-8 flex items-center gap-10 p-6">
          <div>
            <p className="text-sm font-medium">Podgląd wskaźnika postępu (gamifikacja)</p>
            <p className="mt-1 text-sm text-ink-muted">
              Kolor od czerwonego do zielonego — logika z pakietu <code>@sep/shared</code>.
            </p>
          </div>
          <div className="ml-auto flex gap-6">
            <ProgressRing pct={38} label="Start" />
            <ProgressRing pct={73} label="Dziś" />
            <ProgressRing pct={107} label="Premia" />
          </div>
        </div>
      </main>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="grid min-h-full place-items-center p-10 text-center">
      <div>
        <p className="text-2xl font-semibold">{title}</p>
        <p className="mt-2 text-ink-muted">Moduł w budowie — kolejne kroki planu.</p>
        <Link to="/" className="btn-ghost mt-6 inline-block">
          ← Powrót
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="pracownice" element={<Employees />} />
        <Route path="katalog" element={<Catalog />} />
        <Route path="weryfikacja" element={<Review />} />
        <Route path="kalendarz" element={<Calendar />} />
        <Route path="raporty" element={<Reports />} />
        <Route path="ustawienia" element={<Settings />} />
        <Route path="api-status" element={<ApiStatus />} />
      </Route>
      <Route path="/app" element={<WorkerApp />} />
    </Routes>
  );
}

function PanelPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-10 text-center">
      <div>
        <p className="text-2xl font-semibold">{title}</p>
        <p className="mt-2 text-ink-muted">Moduł w budowie — kolejne kroki planu.</p>
      </div>
    </div>
  );
}
