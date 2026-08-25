import { type ReactNode } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { ProgressRing } from "./components/ProgressRing";
import { AuthProvider, useAuth } from "./lib/auth";
import { Login } from "./features/auth/Login";
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

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}

/**
 * Konto trafiło na niewłaściwą sekcję (np. właścicielka zalogowana jako admin
 * otwiera link do aplikacji pracownicy). Wcześniej robiliśmy cichy redirect —
 * wyglądało to tak, jakby wejście do apki pracownicy było zablokowane.
 * Teraz mówimy wprost, co się dzieje, i dajemy przełączenie konta jednym kliknięciem.
 */
function ZlaSekcja({ chciano }: { chciano: "ADMIN" | "WORKER" }) {
  const { user, logout } = useAuth();
  const doPracownicy = chciano === "WORKER";
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6">
      <div className="card w-full max-w-md p-6 text-center">
        <p className="text-lg font-semibold">
          {doPracownicy ? "To jest aplikacja pracownicy" : "To jest panel administratora"}
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Jesteś zalogowana jako <span className="font-medium text-ink">{user?.name}</span>{" "}
          ({user?.role === "ADMIN" ? "administrator" : "pracownica"}).{" "}
          {doPracownicy
            ? "Żeby zobaczyć, co widzi pracownica, wyloguj się i zaloguj jej kontem."
            : "Panel administratora wymaga konta administratora."}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button onClick={logout} className="btn-primary">
            Wyloguj i zaloguj innym kontem
          </button>
          <Link to={user?.role === "WORKER" ? "/app" : "/admin"} className="btn-ghost">
            {user?.role === "WORKER" ? "Wróć do aplikacji pracownicy" : "Wróć do panelu administratora"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function RequireAuth({ role, children }: { role?: "ADMIN" | "WORKER"; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Login />;
  if (role && user.role !== role) return <ZlaSekcja chciano={role} />;
  return <>{children}</>;
}

function Landing() {
  return (
    <div className="min-h-full">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent font-bold text-white">M</div>
          <div>
            <p className="text-sm font-semibold">Handmade Micro-Workshop</p>
            <p className="text-xs text-ink-faint">System Ewidencji Produkcji</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Cyfrowa ewidencja produkcji bez papieru</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Aplikacja dla pracownic oraz panel analityczny dla administratora — z integracją PrestaShop
          i automatycznym systemem premiowym.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <Link to="/app" className="card group p-6 transition hover:shadow-glow">
            <p className="text-lg font-semibold">Aplikacja Pracownicy</p>
            <p className="mt-1 text-sm text-ink-muted">Dodawanie produkcji, postęp normy. Logowanie kontem pracownicy.</p>
            <span className="mt-4 inline-block text-sm text-accent-300 group-hover:underline">Otwórz →</span>
          </Link>
          <Link to="/admin" className="card group p-6 transition hover:shadow-glow">
            <p className="text-lg font-semibold">Panel Administratora</p>
            <p className="mt-1 text-sm text-ink-muted">Dashboard, normy, katalog, weryfikacja, raporty i eksport.</p>
            <span className="mt-4 inline-block text-sm text-accent-300 group-hover:underline">Otwórz →</span>
          </Link>
        </div>
        <div className="card mt-8 flex items-center gap-10 p-6">
          <div>
            <p className="text-sm font-medium">Wskaźnik postępu (gamifikacja)</p>
            <p className="mt-1 text-sm text-ink-muted">Kolor od czerwonego do zielonego wg realizacji normy.</p>
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

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/admin"
          element={
            <RequireAuth role="ADMIN">
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="pracownice" element={<Employees />} />
          <Route path="katalog" element={<Catalog />} />
          <Route path="weryfikacja" element={<Review />} />
          <Route path="kalendarz" element={<Calendar />} />
          <Route path="raporty" element={<Reports />} />
          <Route path="ustawienia" element={<Settings />} />
          <Route path="api-status" element={<ApiStatus />} />
        </Route>
        <Route
          path="/app"
          element={
            <RequireAuth role="WORKER">
              <WorkerApp />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
