import { useState } from "react";
import { PageShell } from "./PageShell";
import { IconPlus } from "../../components/icons";
import { useApiData, apiPost } from "../../lib/api";
import { employeesFixture, type EmployeeRow } from "../../lib/fixtures";

export function Employees() {
  const [rows, setRows] = useApiData<EmployeeRow[]>("/admin/employees", employeesFixture);
  const [open, setOpen] = useState(false);

  const add = (e: EmployeeRow) => {
    setRows([...rows, e]);
    setOpen(false);
    apiPost("/admin/employees", e).catch(() => void 0);
  };
  const toggle = (id: string) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
    apiPost(`/admin/employees/${id}/toggle-active`).catch(() => void 0);
  };

  return (
    <PageShell
      title="Pracownice"
      subtitle={`${rows.filter((r) => r.active).length} aktywnych`}
      actions={
        <button onClick={() => setOpen((o) => !o)} className="btn-primary flex items-center gap-2 !py-2">
          <IconPlus className="h-[18px] w-[18px]" /> Dodaj pracownicę
        </button>
      }
    >
      {open && <AddForm onAdd={add} onCancel={() => setOpen(false)} />}
      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-3 font-medium">Imię</th>
              <th className="px-3 py-3 font-medium">Login</th>
              <th className="px-3 py-3 font-medium">Norma bazowa</th>
              <th className="px-3 py-3 font-medium">Etat</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line/70">
                <td className="px-5 py-3 font-medium">{r.name}</td>
                <td className="px-3 py-3 text-ink-muted">{r.login}</td>
                <td className="px-3 py-3">{r.baseNormPln.toLocaleString("pl-PL")} zł</td>
                <td className="px-3 py-3 text-ink-muted">{r.defaultHours}h</td>
                <td className="px-3 py-3">
                  <span className={`rounded-md px-2 py-0.5 text-xs ${r.active ? "bg-ok/15 text-ok" : "bg-bad/15 text-bad"}`}>
                    {r.active ? "Aktywna" : "Zablokowana"}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <button onClick={() => toggle(r.id)} className="rounded-lg border border-line px-2 py-1 text-xs text-ink-muted hover:bg-surface-2">
                    {r.active ? "Zablokuj" : "Odblokuj"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageShell>
  );
}

function AddForm({ onAdd, onCancel }: { onAdd: (e: EmployeeRow) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [norma, setNorma] = useState(1750);
  const [hours, setHours] = useState(8);

  return (
    <section className="card mb-5 p-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Imię"><input value={name} onChange={(e) => setName(e.target.value)} className="inp" /></Field>
        <Field label="Login"><input value={login} onChange={(e) => setLogin(e.target.value)} className="inp" /></Field>
        <Field label="Norma bazowa (zł)"><input type="number" value={norma} onChange={(e) => setNorma(+e.target.value)} className="inp" /></Field>
        <Field label="Etat (h)"><input type="number" value={hours} onChange={(e) => setHours(+e.target.value)} className="inp" /></Field>
      </div>
      <div className="mt-4 flex gap-3">
        <button
          disabled={!name || !login}
          onClick={() => onAdd({ id: crypto.randomUUID(), name, login, baseNormPln: norma, defaultHours: hours, active: true })}
          className="btn-primary !py-2 disabled:opacity-40"
        >
          Zapisz
        </button>
        <button onClick={onCancel} className="btn-ghost !py-2">Anuluj</button>
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
