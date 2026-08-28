import { Injectable } from "@nestjs/common";
import {
  efektywnyPctProduktu,
  normaEfektywnaDnia,
  procentNormy,
  sredniProcentDni,
  wartoscPozycji,
} from "@sep/shared";
import type { DzienOkresu } from "@sep/shared";
import { PrismaService } from "../prisma/prisma.service";

function num(d: unknown): number {
  return d == null ? 0 : Number(d);
}

export interface Progress {
  done: number;
  norm: number;
  pct: number;
}

/** Agregacja postępów norm — łączy dane z bazy z silnikiem @sep/shared. */
@Injectable()
export class NormsService {
  constructor(private readonly prisma: PrismaService) {}

  private startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  /** Klucz dnia w czasie LOKALNYM serwera (TZ=Europe/Warsaw) — yyyy-mm-dd. */
  private kluczDnia(d: Date): string {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  private endOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  /**
   * Wartość pozycji produktowej w przeliczeniu na normę.
   * Przelicznik bierzemy z gałęzi drzewa: nadpisanie produktu → jego kategoria →
   * kategorie nadrzędne → 100 %. Kategorie pobieramy wszystkie (także wygaszone),
   * żeby stare wpisy dalej wyceniały się tak samo.
   */
  async entryValue(productId: string, quantity: number): Promise<number> {
    const [product, categories] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: productId } }),
      this.prisma.category.findMany({ select: { id: true, parentId: true, normPct: true } }),
    ]);
    if (!product) return 0;
    const pct = efektywnyPctProduktu(product.normPctOverride, product.categoryId, categories).pct;
    return wartoscPozycji(num(product.pricePln), pct, quantity);
  }

  async dayProgress(employeeId: string, date: Date = new Date()): Promise<Progress> {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return { done: 0, norm: 0, pct: 0 };

    const att = await this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: this.startOfDay(date) } },
    });
    const hours = att ? num(att.hours) : num(employee.defaultHours);
    const norm = normaEfektywnaDnia(num(employee.baseNormPln), hours);

    const agg = await this.prisma.productionEntry.aggregate({
      _sum: { normValuePln: true },
      where: {
        employeeId,
        status: "CONFIRMED",
        createdAt: { gte: this.startOfDay(date), lte: this.endOfDay(date) },
      },
    });
    const done = num(agg._sum.normValuePln);
    return { done, norm, pct: procentNormy(done, norm) };
  }

  /**
   * Postęp za okres (tydzień, miesiąc).
   *
   * % liczymy jako ŚREDNIĄ z dziennych procentów — suma procentów wszystkich
   * dni podzielona przez liczbę dni przepracowanych (ustalenie z klientką
   * 14.08.2026). Każdy przepracowany dzień waży tyle samo, także krótszy.
   * Urlop i chorobowe nie wchodzą do średniej, więc nie zaniżają wyniku.
   * Dzień z produkcją, ale bez wpisu w kalendarzu (ktoś nie kliknął „Start
   * pracy") liczymy po etacie domyślnym — inaczej ta praca zniknęłaby z wyniku.
   *
   * `done` i `norm` (zł) zostają sumami okresu — z nich korzystają zestawienia
   * admina; pracownica widzi wyłącznie procent.
   */
  private async okresProgress(employeeId: string, from: Date, to: Date): Promise<Progress> {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return { done: 0, norm: 0, pct: 0 };
    const bazowa = num(employee.baseNormPln);

    const [attendance, entries] = await Promise.all([
      this.prisma.attendance.findMany({ where: { employeeId, date: { gte: from, lte: to } } }),
      this.prisma.productionEntry.findMany({
        where: { employeeId, status: "CONFIRMED", createdAt: { gte: from, lte: to } },
        select: { createdAt: true, normValuePln: true },
      }),
    ]);

    const wykonanoDnia = new Map<string, number>();
    for (const e of entries) {
      const key = this.kluczDnia(e.createdAt);
      wykonanoDnia.set(key, (wykonanoDnia.get(key) ?? 0) + num(e.normValuePln));
    }

    const dni: DzienOkresu[] = [];
    const zKalendarza = new Set<string>();
    for (const a of attendance) {
      const key = a.date.toISOString().slice(0, 10); // kolumna DATE — bez strefy
      zKalendarza.add(key);
      if (a.type !== "WORK") continue;
      dni.push({ norma: normaEfektywnaDnia(bazowa, num(a.hours)), wykonano: wykonanoDnia.get(key) ?? 0 });
    }
    for (const [key, wykonano] of wykonanoDnia) {
      if (zKalendarza.has(key)) continue;
      dni.push({ norma: normaEfektywnaDnia(bazowa, num(employee.defaultHours)), wykonano });
    }

    const done = [...wykonanoDnia.values()].reduce((a, x) => a + x, 0);
    const norm = dni.reduce((a, d) => a + d.norma, 0);
    return { done, norm, pct: sredniProcentDni(dni) };
  }

  /** Ruchome okno ostatnich 7 dni (dziś + 6 poprzednich), nie tydzień kalendarzowy. */
  async weekProgress(employeeId: string, ref: Date = new Date()): Promise<Progress> {
    const from = this.startOfDay(ref);
    from.setDate(from.getDate() - 6);
    return this.okresProgress(employeeId, from, this.endOfDay(ref));
  }

  async monthProgress(employeeId: string, ref: Date = new Date()): Promise<Progress> {
    const from = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const to = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
    return this.okresProgress(employeeId, from, to);
  }
}
