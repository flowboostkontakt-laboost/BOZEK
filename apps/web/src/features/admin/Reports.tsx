import { useMemo, useState } from "react";
import { IconDownload, IconFile, IconTrendDown, IconTrendUp } from "../../components/icons";
import { previousExports, reportRows, type ReportRow } from "../../lib/fixtures";
import { downloadCsv } from "../../lib/csv";

type Period = "Dzienny" | "Miesięczny" | "Roczny";
const CATEGORIES = ["Opaski", "Turbany", "Chusty"];
const zl = (n: number) => n.toLocaleString("pl-PL");

export function Reports() {
  const [period, setPeriod] = useState<Period>("Miesięczny");
  const [cats, setCats] = useState<string[]>(CATEGORIES);
  const [finance, setFinance] = useState(true);

  const rows = useMemo(() => reportRows.filter((r) => cats.includes(r.category)), [cats]);
  const totals = useMemo(
    () => ({
      units: rows.reduce((a, r) => a + r.units, 0),
      cena: rows.reduce((a, r) => a + r.cena, 0),
      koszt: rows.reduce((a, r) => a + r.kosztNorm, 0),
      wartosc: rows.reduce((a, r) => a + r.wartosc, 0),
    }),
    [rows],
  );

  const toggleCat = (c: string) => setCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const exportData = () => ({
    headers: ["Data", "Pracownica", "Kategoria", "Godziny", "Szt.", "Cena", "Koszt Norm", "Wartość", "% Normy", "Premia"],
    data: rows.map((r) => [r.date, r.name, r.category, r.hours, r.units, r.cena, r.kosztNorm, r.wartosc, `${r.pctDay}%`, r.premiaPct]),
  });
  const onExport = () => {
    const { headers, data } = exportData();
    downloadCsv("raport_2026-05.csv", headers, data);
  };

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold sm:text-xl">Raporty i eksport</h1>
          <p className="text-sm text-ink-faint">Okres: {period.toLowerCase()}</p>
        </div>
        <div className="flex rounded-xl border border-line bg-surface-1 p-1">
          {(["Dzienny", "Miesięczny", "Roczny"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs transition sm:text-sm ${
                period === p ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {/* Filtry */}
        <section className="card p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Zakres danych</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const on = cats.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggleCat(c)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    on ? "border-accent bg-accent-soft text-accent-300" : "border-line text-ink-muted hover:bg-surface-2"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          <label className="mt-4 flex cursor-pointer items-center justify-between border-t border-line pt-4 text-sm">
            Pokaż szczegóły finansowe
            <input type="checkbox" checked={finance} onChange={(e) => setFinance(e.target.checked)} className="h-5 w-5 accent-accent" />
          </label>
        </section>

        {/* Zestawienie */}
        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-4 py-4 text-sm font-medium text-ink-muted sm:px-5">Zestawienie ({rows.length})</h2>

          {/* Desktop: tabela */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-3 py-3 font-medium">Pracownica</th>
                  <th className="px-3 py-3 font-medium">Szt.</th>
                  {finance && <th className="px-3 py-3 font-medium">Cena</th>}
                  {finance && <th className="px-3 py-3 font-medium">Koszt</th>}
                  {finance && <th className="px-3 py-3 font-medium">Wartość</th>}
                  <th className="px-3 py-3 font-medium">% Normy</th>
                  <th className="px-3 py-3 font-medium">Premia</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-line/70">
                    <td className="px-5 py-3 text-ink-muted">{r.date}</td>
                    <td className="px-3 py-3 font-medium">{r.name}</td>
                    <td className="px-3 py-3 tabular-nums text-ink-muted">{r.units}</td>
                    {finance && <td className="px-3 py-3 tabular-nums text-ink-muted">{zl(r.cena)}</td>}
                    {finance && <td className="px-3 py-3 tabular-nums text-ink-muted">{zl(r.kosztNorm)}</td>}
                    {finance && <td className="px-3 py-3 tabular-nums">{zl(r.wartosc)} zł</td>}
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        {r.pctDay}%
                        {r.trend === "up" ? <IconTrendUp className="h-3.5 w-3.5 text-ok" /> : <IconTrendDown className="h-3.5 w-3.5 text-bad" />}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium text-ok">{r.premiaPct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: karty */}
          <div className="divide-y divide-line/60 lg:hidden">
            {rows.map((r, i) => (
              <ReportCard key={i} r={r} finance={finance} />
            ))}
          </div>

          {/* Podsumowanie */}
          <div className="grid grid-cols-3 gap-px border-t border-line bg-line/40 text-center sm:grid-cols-4">
            <Total label="Sztuki" v={String(totals.units)} />
            {finance && <Total label="Cena" v={`${zl(totals.cena)} zł`} />}
            {finance && <Total label="Koszt" v={`${zl(totals.koszt)} zł`} />}
            <Total label="Wartość" v={`${zl(totals.wartosc)} zł`} accent />
          </div>
        </section>

        {/* Eksport */}
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={onExport}
            className="flex items-center justify-center gap-2 rounded-2xl bg-ok/90 py-4 font-semibold text-[#08251b] transition hover:bg-ok active:scale-[0.98]"
          >
            <IconDownload className="h-5 w-5" /> Eksport do Excel
          </button>
          <button
            onClick={onExport}
            className="flex items-center justify-center gap-2 rounded-2xl bg-accent py-4 font-semibold text-white transition hover:bg-accent-400 active:scale-[0.98]"
          >
            <IconDownload className="h-5 w-5" /> Eksport do CSV
          </button>
        </div>

        {/* Poprzednie eksporty */}
        <section className="card p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Poprzednie eksporty</h2>
          <ul className="space-y-2">
            {previousExports.map((f) => (
              <li key={f} className="flex items-center gap-3 truncate text-sm text-ink-muted">
                <IconFile className="h-4 w-4 shrink-0 text-ink-faint" />
                <span className="truncate">{f}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function ReportCard({ r, finance }: { r: ReportRow; finance: boolean }) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{r.name}</p>
          <p className="text-xs text-ink-faint">{r.date} · {r.category} · {r.hours.toFixed(1)} h</p>
        </div>
        <div className="text-right">
          <span className="flex items-center justify-end gap-1 tabular-nums font-semibold">
            {r.pctDay}%
            {r.trend === "up" ? <IconTrendUp className="h-4 w-4 text-ok" /> : <IconTrendDown className="h-4 w-4 text-bad" />}
          </span>
          <p className="text-xs font-medium text-ok">premia {r.premiaPct}</p>
        </div>
      </div>
      {finance && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Mini label="Szt." v={String(r.units)} />
          <Mini label="Cena" v={`${zl(r.cena)}`} />
          <Mini label="Wartość" v={`${zl(r.wartosc)}`} />
        </div>
      )}
    </div>
  );
}

function Mini({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-lg bg-surface-2 py-2">
      <p className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="tabular-nums text-sm font-medium">{v}</p>
    </div>
  );
}

function Total({ label, v, accent }: { label: string; v: string; accent?: boolean }) {
  return (
    <div className="bg-surface-1 px-2 py-3">
      <p className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`tabular-nums text-sm font-semibold ${accent ? "text-accent-300" : ""}`}>{v}</p>
    </div>
  );
}
