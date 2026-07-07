/** Dane poglądowe (fixture) odwzorowujące mockup Dashboardu — używane, gdy API niedostępne. */

export interface DashboardData {
  dateLabel: string;
  activeWorkers: string;
  todayUnits: number;
  lastSync: { ok: boolean; agoText: string };
  norm: { dailyPct: number; monthlyPct: number };
  employeesDaily: { name: string; wykonano: number; norma: number }[];
  categories: { name: string; udzialPct: number; sztuki: number }[];
  rows: OperationalRow[];
}

export interface OperationalRow {
  id: number;
  employeeId: string;
  name: string;
  hours: number;
  workedMinutes: number;
  normaBaza: number;
  wykonano: number;
  pctDay: number;
  pctMonth: number;
  trend: "up" | "down";
  premia: boolean;
  lastAction: string;
}

// ─── Admin: pracownice / katalog / weryfikacja / premie ────────────

export interface EmployeeRow {
  id: string;
  name: string;
  baseNormPln: number;
  defaultHours: number;
  active: boolean;
  login: string;
}
export const employeesFixture: EmployeeRow[] = [
  { id: "1", name: "Ania", baseNormPln: 1750, defaultHours: 8, active: true, login: "ania" },
  { id: "2", name: "Basia", baseNormPln: 1750, defaultHours: 6, active: true, login: "basia" },
  { id: "3", name: "Kasia", baseNormPln: 2000, defaultHours: 8, active: true, login: "kasia" },
];

export interface CategoryRow {
  id: string;
  name: string;
  normPct: number;
}
export const categoriesFixture: CategoryRow[] = [
  { id: "c1", name: "Opaski", normPct: 50 },
  { id: "c2", name: "Turbany", normPct: 100 },
  { id: "c3", name: "Chusty", normPct: 100 },
];

export interface ReviewItem {
  id: string;
  employee: { name: string };
  customLabel: string;
  createdAt: string;
}
export const reviewFixture: ReviewItem[] = [
  { id: "r1", employee: { name: "Ania" }, customLabel: "Poprawka szwu — turban #482", createdAt: "17.06 11:20" },
  { id: "r2", employee: { name: "Kasia" }, customLabel: "Zamówienie indywidualne — chusta jedwab", createdAt: "17.06 09:05" },
];

export interface BonusTierRow {
  id: string;
  thresholdPct: number;
  amountPln: number;
  label?: string;
}
export const bonusFixture: BonusTierRow[] = [
  { id: "b1", thresholdPct: 100, amountPln: 300, label: "Próg I" },
  { id: "b2", thresholdPct: 110, amountPln: 600, label: "Próg II" },
];
export const bonusPreviewFixture = [
  { name: "Ania", monthPct: 88, premiaPln: 0 },
  { name: "Basia", monthPct: 101, premiaPln: 300 },
  { name: "Kasia", monthPct: 105, premiaPln: 300 },
];

// ─── Raporty i eksport ─────────────────────────────────────────────

export interface ReportRow {
  date: string;
  name: string;
  category: string;
  hours: number;
  units: number;
  cena: number;
  kosztNorm: number;
  wartosc: number;
  pctDay: number;
  trend: "up" | "down";
  premiaPct: string;
}

export const reportRows: ReportRow[] = [
  { date: "17.06.2026", name: "Ania", category: "Turbany", hours: 8, units: 6, cena: 250, kosztNorm: 220, wartosc: 1750, pctDay: 73, trend: "up", premiaPct: "88%" },
  { date: "25.05.2026", name: "Kasia", category: "Chusty", hours: 8, units: 4, cena: 250, kosztNorm: 330, wartosc: 1310, pctDay: 73, trend: "up", premiaPct: "18%" },
  { date: "22.05.2026", name: "Basia", category: "Opaski", hours: 6, units: 5, cena: 120, kosztNorm: 180, wartosc: 980, pctDay: 64, trend: "down", premiaPct: "0%" },
];

export const previousExports = [
  "app.handmade_2026-05.xlsx",
  "app.handmade_2026-05.csv",
];

// ─── PWA Pracownicy ────────────────────────────────────────────────

export interface CatalogProduct {
  last4: string;
  name: string;
  category: string;
  color: string; // placeholder zdjęcia (kolor) do czasu synchronizacji z PrestaShop
}

export interface RecentEntry {
  name: string;
  qty: number;
  time: string;
}

export interface WorkerData {
  name: string;
  dateLabel: string;
  dayLabel: string;
  monthLabel: string;
  dayPct: number;
  monthPct: number;
  recent: RecentEntry[];
}

export const workerFixture: WorkerData = {
  name: "Ania",
  dateLabel: "17 cze 2026",
  dayLabel: "Dzień 12/20",
  monthLabel: "CZERWIEC 2026",
  dayPct: 73,
  monthPct: 92,
  recent: [
    { name: "Turban Velvet", qty: 2, time: "12:40" },
    { name: "Opaska czerwona", qty: 1, time: "10:15" },
  ],
};

export const catalog: CatalogProduct[] = [
  { last4: "0921", name: "Turban Velvet", category: "Turbany", color: "#8b6f9e" },
  { last4: "1015", name: "Opaska czerwona", category: "Opaski", color: "#a8556b" },
  { last4: "3307", name: "Chusta lniana", category: "Chusty", color: "#6f7f9e" },
];

export function findByLast4(last4: string): CatalogProduct | undefined {
  return catalog.find((p) => p.last4 === last4);
}

export const dashboardFixture: DashboardData = {
  dateLabel: "17.06.2026",
  activeWorkers: "3/5",
  todayUnits: 27,
  lastSync: { ok: true, agoText: "10s temu" },
  norm: { dailyPct: 94, monthlyPct: 89 },
  employeesDaily: [
    { name: "Ania", wykonano: 1277, norma: 1750 },
    { name: "Basia", wykonano: 1400, norma: 1312 },
    { name: "Kasia", wykonano: 2150, norma: 2000 },
  ],
  categories: [
    { name: "Opaski", udzialPct: 50, sztuki: 14 },
    { name: "Turbany", udzialPct: 100, sztuki: 9 },
    { name: "Chusty", udzialPct: 100, sztuki: 6 },
  ],
  rows: [
    { id: 101, employeeId: "1", name: "Ania", hours: 8, workedMinutes: 460, normaBaza: 1750, wykonano: 1277, pctDay: 73, pctMonth: 88, trend: "down", premia: false, lastAction: "Turban (2 szt.)" },
    { id: 102, employeeId: "2", name: "Basia", hours: 6, workedMinutes: 360, normaBaza: 1312, wykonano: 1400, pctDay: 106, pctMonth: 101, trend: "up", premia: true, lastAction: "Opaska (1 szt.)" },
    { id: 103, employeeId: "3", name: "Kasia", hours: 8, workedMinutes: 420, normaBaza: 2000, wykonano: 2150, pctDay: 107, pctMonth: 105, trend: "up", premia: false, lastAction: "Chusta (3 szt.)" },
  ],
};
