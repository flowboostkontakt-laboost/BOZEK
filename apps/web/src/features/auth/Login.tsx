import { useState } from "react";
import { useAuth } from "../../lib/auth";

export function Login() {
  const { login } = useAuth();
  const [loginVal, setLoginVal] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await login(loginVal.trim(), password);
    } catch {
      setErr("Nieprawidłowy login lub hasło.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col justify-center bg-bg px-6 text-ink"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent text-2xl font-bold text-white">
            M
          </div>
          <h1 className="mt-4 text-xl font-semibold">Ewidencja Produkcji</h1>
          <p className="text-sm text-ink-faint">Zaloguj się swoim kontem</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-ink-muted">Login</label>
            <input
              value={loginVal}
              onChange={(e) => setLoginVal(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full rounded-xl border border-line bg-surface-1 px-4 py-3 text-base outline-none focus:border-accent"
              placeholder="np. ania"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink-muted">Hasło</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-1 px-4 py-3 text-base outline-none focus:border-accent"
              placeholder="••••••"
            />
          </div>

          {err && <p className="text-sm text-bad">{err}</p>}

          <button
            type="submit"
            disabled={busy || !loginVal || !password}
            className="w-full rounded-xl bg-accent py-3.5 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            {busy ? "Logowanie…" : "Zaloguj się"}
          </button>
        </form>
      </div>
    </div>
  );
}
