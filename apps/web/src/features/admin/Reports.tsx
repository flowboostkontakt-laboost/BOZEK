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
      hours: rows.reduce((a, r) => a + r.hours, 0),
      units: rows.reduce((a, r) => a + r.units, 0),
      cena: rows.reduce((a, r) => a + r.cena, 0),
      koszt: rows.reduce((a, r) => a + r.kosztNorm, 0),
      wartosc: rows.reduce((a, r) => a + r.wartosc, 0),
    }),
    [rows],
  );

  const toggleCat = (c: string) =>
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const exportRows = () => {
    const headers = ["Data", "Pracownica", "Kategoria", "Godziny", "Szt.", "Cena", "Koszt Norm", "Wartość", "% Normy", "Premia"];
    const data = rows.map((r) => [r.date, r.name, r.category, r.hours, r.units, r.cena, r.kosztNorm, r.wartosc, `${r.pctDay}%`, r.premiaPct]);
    return { headers, data };
  };

  const onCsv = () => {
    const { headers, data } = exportRows();
    downloadCsv("raport_2026-05.csv", headers, data);
  };
  const onXlsx = () => {
    // W produkcji: GET /api/admin/reports/export?format=xlsx (exceljs po stronie serwera).
    const { headers, data } = exportRows();
    downloadCsv("raport_2026-05.csv", headers, data);
  };

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold sm:text-xl">Centrum Raportów i Eksport</h1>
          <p className="text-sm text-ink-faint">MAJ 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-line bg-surface-1 p-1">
            {(["Dzienny", "Miesięczny", "Roczny"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  period === p ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="hidden h-9 w-9 place-items-center rounded-full bg-surface-3 text-xs font-semibold sm:grid">A</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="space-y-5">
            <Calendar />
            <section className="card p-5">
              <h2 className="mb-3 text-sm font-medium text-ink-muted">Zakres danych</h2>
              <div className="space-y-2">
                {CATEGORIES.map((c) => (
                  <label key={c} className="flex cursor-pointer items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={cats.includes(c)}
                      onChange={() => toggleCat(c)}
                      className="h-4 w-4 accent-accent"
                    />
                    {c}
                  </label>
                ))}
              </div>
              <div className="mt-4 border-t border-line pt-4">
                <label className="flex cursor-pointer items-center justify-between text-sm">
                  Szczegóły finansowe
                  <input
                    type="checkbox"
                    checked={finance}
                    onChange={(e) => setFinance(e.target.checked)}
                    className="h-4 w-4 accent-accent"
                  />
                </label>
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-ink-faint">
                      <th className="px-4 py-3 font-medium">Data</th>
                      <th className="px-3 py-3 font-medium">Pracownica</th>
                      <th className="px-3 py-3 font-medium">Godz.</th>
                      <th className="px-3 py-3 font-medium">Szt.</th>
                      {finance && <th className="px-3 py-3 font-medium">Cena</th>}
                      {finance && <th className="px-3 py-3 font-medium">Koszt norm</th>}
                      {finance && <th className="px-3 py-3 font-medium">Wartość</th>}
                      <th className="px-3 py-3 font-medium">% Normy</th>
                      <th className="px-3 py-3 font-medium">Premia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <Row key={i} r={r} finance={finance} />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-line font-medium">
                      <td className="px-4 py-3" colSpan={2}>Razem</td>
                      <td className="px-3 py-3">{totals.hours.toFixed(1)}</td>
                      <td className="px-3 py-3">{totals.units}</td>
                      {finance && <td className="px-3 py-3">{zl(totals.cena)}</td>}
                      {finance && <td className="px-3 py-3">{zl(totals.koszt)}</td>}
                      {finance && <td className="px-3 py-3">{zl(totals.wartosc)}</td>}
                      <td className="px-3 py-3" colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={onXlsx}
                className="flex items-center justify-center gap-2 rounded-2xl bg-ok/90 py-4 font-semibold text-[#0a2a20] transition hover:bg-ok active:scale-[0.98]"
              >
                <IconDownload className="h-5 w-5" /> Eksport do Excel (.xlsx)
              </button>
              <button
                onClick={onCsv}
                className="flex items-center justify-center gap-2 rounded-2xl bg-accent py-4 font-semibold text-white transition hover:bg-accent-400 active:scale-[0.98]"
              >
                <IconDownload className="h-5 w-5" /> Eksport do CSV (.csv)
              </button>
            </div>

            <section className="card p-5">
              <h2 className="mb-3 text-sm font-medium text-ink-muted">Poprzednie eksporty</h2>
              <ul className="space-y-2">
                {previousExports.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-ink-muted">
                    <IconFile className="h-4 w-4 text-ink-faint" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ r, finance }: { r: ReportRow; finance: boolean }) {
  return (
    <tr className="border-t border-line/70">
      <td className="px-4 py-3 text-ink-muted">{r.date}</td>
      <td className="px-3 py-3 font-medium">{r.name}</td>
      <td className="px-3 py-3 text-ink-muted">{r.hours.toFixed(1)}</td>
      <td className="px-3 py-3 text-ink-muted">{r.units}</td>
      {finance && <td className="px-3 py-3 text-ink-muted">{zl(r.cena)}</td>}
      {finance && <td className="px-3 py-3 text-ink-muted">{zl(r.kosztNorm)}</td>}
      {finance && <td className="px-3 py-3">{zl(r.wartosc)}</td>}
      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-1">
          {r.pctDay}%
          {r.trend === "up" ? (
            <IconTrendUp className="h-3.5 w-3.5 text-ok" />
          ) : (
            <IconTrendDown className="h-3.5 w-3.5 text-bad" />
          )}
        </span>
      </td>
      <td className="px-3 py-3 font-medium text-ok">{r.premiaPct}</td>
    </tr>
  );
}

function Calendar() {
  // Statyczny miesiąc MAJ 2026 (1 maja = piątek). Tydzień od poniedziałku.
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const leading = 3; // Pn,Wt,Śr puste przed piątkiem
  const selected = 22;
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-medium text-ink-muted">MAJ 2026</h2>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-ink-faint">
        {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
        {Array.from({ length: leading }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {days.map((d) => (
          <div
            key={d}
            className={`grid aspect-square place-items-center rounded-lg text-xs ${
              d === selected ? "bg-accent font-semibold text-white" : "text-ink-muted hover:bg-surface-2"
            }`}
          >
            {d}
          </div>
        ))}
      </div>
    </section>
  );
}
