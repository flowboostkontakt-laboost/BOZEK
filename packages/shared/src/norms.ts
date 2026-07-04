/**
 * Silnik wyliczania norm i premii.
 *
 * Wzory zrekonstruowane wprost z mockupu panelu admina (tabela "Pełna lista"):
 *   • Basia 6h, norma bazowa 1750 zł → norma efektywna 1750 × 6/8 = 1312,5 zł
 *   • % Normy = Wykonano / Norma efektywna
 *       Ania  1277 / 1750 ≈ 73 %
 *       Kasia 2150 / 2000 ≈ 107 %
 *   • Przeliczniki kategorii: Opaski 50 %, Turbany 100 % (z opcją override per produkt)
 *   • Nieobecność (urlop/chorobowe) nie obniża wyniku miesięcznego — zmniejsza mianownik.
 */

import type { AttendanceDay, BonusTier } from "./types.js";

export const FULL_TIME_HOURS = 8;

/** Zaokrąglenie do 2 miejsc (kwoty zł), odporne na błędy float. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Norma efektywna dnia = norma bazowa przeliczona proporcjonalnie do godzin pracy.
 * Pełen etat = 8h. Praca 6h → 75 % normy bazowej (spec 4.2).
 */
export function normaEfektywnaDnia(
  normaBazowa: number,
  godzinyPracy: number,
  etatBazowy: number = FULL_TIME_HOURS,
): number {
  if (etatBazowy <= 0) return 0;
  return round2(normaBazowa * (godzinyPracy / etatBazowy));
}

/**
 * Wartość pojedynczej pozycji w przeliczeniu na normę.
 * = cena × (mnożnik kategorii [%] / 100) × ilość, z opcją nadpisania per produkt.
 */
export function wartoscPozycji(
  cena: number,
  mnoznikKategoriiPct: number,
  ilosc: number,
  overridePct?: number | null,
): number {
  const pct = overridePct ?? mnoznikKategoriiPct;
  return round2(cena * (pct / 100) * ilosc);
}

/** Procent realizacji normy (do pierścieni i tabel). Domyślnie zaokrąglany. */
export function procentNormy(wykonanoZl: number, normaZl: number): number {
  if (normaZl <= 0) return 0;
  return Math.round((wykonanoZl / normaZl) * 100);
}

/**
 * Norma miesięczna = suma norm efektywnych TYLKO z dni pracujących.
 * Dni urlopu/chorobowego są pomijane → nie zaniżają wyniku miesięcznego.
 */
export function normaMiesieczna(
  normaBazowa: number,
  dni: AttendanceDay[],
  etatBazowy: number = FULL_TIME_HOURS,
): number {
  const suma = dni
    .filter((d) => d.type === "WORK")
    .reduce((acc, d) => acc + normaEfektywnaDnia(normaBazowa, d.hours, etatBazowy), 0);
  return round2(suma);
}

/**
 * Premia za miesiąc na podstawie progów. Zwraca kwotę najwyższego osiągniętego progu.
 * Konfiguracja i podgląd kwot — wyłącznie po stronie admina (spec 4.3).
 */
export function premiaZaMiesiac(procentMiesiaca: number, progi: BonusTier[]): number {
  const osiagniete = progi
    .filter((t) => procentMiesiaca >= t.thresholdPct)
    .sort((a, b) => b.thresholdPct - a.thresholdPct);
  return osiagniete.length > 0 ? round2(osiagniete[0].amountPln) : 0;
}

/**
 * Kolor wskaźnika postępu (gamifikacja — pasek/pierścień od czerwonego do zielonego).
 * Zwraca token semantyczny używany przez UI (mapowany na kolory motywu).
 */
export function kolorPostepu(pct: number): "danger" | "warning" | "ok" | "success" {
  if (pct < 50) return "danger";
  if (pct < 85) return "warning";
  if (pct < 100) return "ok";
  return "success";
}
