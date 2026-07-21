import { useCallback, useEffect, useState } from "react";
import { PageShell } from "./PageShell";
import { IconPlus } from "../../components/icons";
import { BonusTiersEditor } from "./BonusTiersEditor";
import { apiGet, apiPost, apiPatch } from "../../lib/api";

interface EmployeeRow {
  id: string;
  name: string;
  baseNormPln: number | string;
  defaultHours: number | string;
  vacationDaysPerYear: number;
  active: boolean;
  user?: { login: string; active: boolean } | null;
}

const loginOf = (r: EmployeeRow) => r.user?.login ?? "";
const num = (v: number | string) => Number(v ?? 0);

export function Employees() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [open, setOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<EmployeeRow[]>("/admin/employees").then(setRows).catch(() => void 0);
  }, []);
  useEffect(() => load(), [load]);

  const toggle = async (id: string) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
    try {
      await apiPost(`/admin/employees/${id}/toggle-active`);
    } catch {
      load(); // cofnij optymistyczną zmianę, gdy serwer odmówił
    }
  };

  return (
    <PageShell
      title="Pracownice"
      subtitle={`${rows.filter((r) => r.active).length} aktywnych`}
      actions={
        <button
          onClick={() => {
            setProfileId(null);
            setOpen((o) => !o);
          }}
          className="btn-primary flex items-center gap-2 !py-2"
        >
          <IconPlus className="h-[18px] w-[18px]" /> Dodaj pracownicę
        </button>
      }
    >
      {open && (
        <AddForm
          onDone={() => {
            setOpen(false);
            load();
          }}
          onCancel={() => setOpen(false)}
        />
      )}

      <section className="card overflow-hidden">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3 font-medium">Imię</th>
                <th className="px-3 py-3 font-medium">Login</th>
                <th className="px-3 py-3 font-medium">Norma bazowa</th>
                <th className="px-3 py-3 font-medium">Etat</th>
                <th className="px-3 py-3 font-medium">Urlop/rok</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line/70">
                  <td className="px-5 py-3 font-medium">{r.name}</td>
                  <td className="px-3 py-3 text-ink-muted">@{loginOf(r)}</td>
                  <td className="px-3 py-3 tabular-nums">{num(r.baseNormPln).toLocaleString("pl-PL")} zł</td>
                  <td className="px-3 py-3 text-ink-muted">{num(r.defaultHours)}h</td>
                  <td className="px-3 py-3 tabular-nums text-ink-muted">{r.vacationDaysPerYear} dni</td>
                  <td className="px-3 py-3">
                    <StatusBadge active={r.active} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setProfileId(profileId === r.id ? null : r.id)}
                        className="rounded-lg border border-line px-2 py-1 text-xs text-ink hover:bg-surface-2"
                      >
                        {profileId === r.id ? "Zamknij" : "Profil"}
                      </button>
                      <button
                        onClick={() => toggle(r.id)}
                        className="rounded-lg border border-line px-2 py-1 text-xs text-ink-muted hover:bg-surface-2"
                      >
                        {r.active ? "Zablokuj" : "Odblokuj"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: karty */}
        <div className="divide-y divide-line/60 lg:hidden">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-3 text-sm font-semibold text-accent-300">
                  {r.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {r.name} <span className="text-xs font-normal text-ink-faint">@{loginOf(r)}</span>
                  </p>
                  <p className="text-xs text-ink-faint">
                    <span className="tabular-nums">{num(r.baseNormPln).toLocaleString("pl-PL")} zł</span> · {num(r.defaultHours)}h ·{" "}
                    {r.vacationDaysPerYear} dni urlopu
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <StatusBadge active={r.active} small />
                <div className="flex gap-2">
                  <button
                    onClick={() => setProfileId(profileId === r.id ? null : r.id)}
                    className="rounded-lg border border-line px-2.5 py-1 text-xs text-ink hover:bg-surface-2"
                  >
                    Profil
                  </button>
                  <button onClick={() => toggle(r.id)} className="rounded-lg border border-line px-2.5 py-1 text-xs text-ink-muted hover:bg-surface-2">
                    {r.active ? "Zablokuj" : "Odblokuj"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {profileId && (
        <Profile
          key={profileId}
          emp={rows.find((r) => r.id === profileId)!}
          onSaved={load}
          onClose={() => setProfileId(null)}
        />
      )}
    </PageShell>
  );
}

function StatusBadge({ active, small }: { active: boolean; small?: boolean }) {
  return (
    <span className={`rounded-md px-2 py-0.5 ${small ? "text-[11px]" : "text-xs"} ${active ? "bg-ok/15 text-ok" : "bg-bad/15 text-bad"}`}>
      {active ? "Aktywna" : "Zablokowana"}
    </span>
  );
}

// ─── Formularz dodawania ──────────────────────────────────────────────
function AddForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [norma, setNorma] = useState(1750);
  const [hours, setHours] = useState(8);
  const [vacation, setVacation] = useState(26);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiPost("/admin/employees", {
        name,
        login,
        password,
        baseNormPln: norma,
        defaultHours: hours,
        vacationDaysPerYear: vacation,
      });
      onDone();
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg.includes("409") ? "Login jest już zajęty — wybierz inny." : `Nie udało się dodać: ${msg}`);
      setBusy(false);
    }
  };

  const valid = name.trim() && login.trim() && password.length >= 4;

  return (
    <section className="card mb-5 p-5">
      <h2 className="mb-4 text-sm font-medium text-ink-muted">Nowa pracownica</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Imię">
          <input value={name} onChange={(e) => setName(e.target.value)} className="inp" />
        </Field>
        <Field label="Login">
          <input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="off" className="inp" />
        </Field>
        <Field label="Hasło (min. 4 znaki)">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="inp" />
        </Field>
        <Field label="Norma bazowa (zł)">
          <input type="number" value={norma} onChange={(e) => setNorma(+e.target.value)} className="inp" />
        </Field>
        <Field label="Etat (h)">
          <input type="number" value={hours} onChange={(e) => setHours(+e.target.value)} className="inp" />
        </Field>
        <Field label="Urlop (dni/rok)">
          <input type="number" value={vacation} onChange={(e) => setVacation(+e.target.value)} className="inp" />
        </Field>
      </div>

      {error && <p className="mt-3 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button disabled={!valid || busy} onClick={save} className="btn-primary !py-2 disabled:opacity-40">
          {busy ? "Zapisywanie…" : "Zapisz"}
        </button>
        <button onClick={onCancel} className="btn-ghost !py-2">
          Anuluj
        </button>
      </div>
    </section>
  );
}

// ─── Profil: edycja danych + progi premiowe ───────────────────────────
function Profile({ emp, onSaved, onClose }: { emp: EmployeeRow; onSaved: () => void; onClose: () => void }) {
  const [name, setName] = useState(emp.name);
  const [login, setLogin] = useState(loginOf(emp));
  const [password, setPassword] = useState("");
  const [norma, setNorma] = useState(num(emp.baseNormPln));
  const [hours, setHours] = useState(num(emp.defaultHours));
  const [vacation, setVacation] = useState(emp.vacationDaysPerYear);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await apiPatch(`/admin/employees/${emp.id}`, {
        name,
        login,
        ...(password ? { password } : {}),
        baseNormPln: norma,
        defaultHours: hours,
        vacationDaysPerYear: vacation,
      });
      setPassword("");
      setMsg({ ok: true, text: "Zapisano zmiany." });
      onSaved();
    } catch (e) {
      const m = (e as Error).message;
      setMsg({ ok: false, text: m.includes("409") ? "Login jest już zajęty." : `Błąd zapisu: ${m}` });
    }
    setBusy(false);
  };

  return (
    <section className="card mt-5 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Profil — {emp.name}</h2>
        <button onClick={onClose} className="text-sm text-ink-faint hover:text-ink">
          Zamknij
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-medium text-ink-muted">Dane pracownicy</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Imię">
              <input value={name} onChange={(e) => setName(e.target.value)} className="inp" />
            </Field>
            <Field label="Login">
              <input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="off" className="inp" />
            </Field>
            <Field label="Nowe hasło (puste = bez zmiany)">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="inp" />
            </Field>
            <Field label="Urlop (dni/rok)">
              <input type="number" value={vacation} onChange={(e) => setVacation(+e.target.value)} className="inp" />
            </Field>
            <Field label="Norma bazowa (zł)">
              <input type="number" value={norma} onChange={(e) => setNorma(+e.target.value)} className="inp" />
            </Field>
            <Field label="Etat (h)">
              <input type="number" value={hours} onChange={(e) => setHours(+e.target.value)} className="inp" />
            </Field>
          </div>

          {msg && (
            <p
              className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                msg.ok ? "border-ok/25 bg-ok/10 text-ok" : "border-bad/30 bg-bad/10 text-bad"
              }`}
            >
              {msg.text}
            </p>
          )}

          <button disabled={busy} onClick={save} className="btn-primary mt-4 !py-2 disabled:opacity-40">
            {busy ? "Zapisywanie…" : "Zapisz dane"}
          </button>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium text-ink-muted">Premie tej pracownicy</h3>
          <BonusTiersEditor employeeId={emp.id} />
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
