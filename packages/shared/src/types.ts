/**
 * Wspólne typy domenowe — używane zarówno przez backend (API), jak i frontend
 * (panel admina + PWA pracownic). Jedno źródło prawdy.
 */

/** Rola użytkownika. Pracownica nigdy nie widzi danych finansowych (spec 2.1). */
export type Role = "ADMIN" | "WORKER";

/** Sposób wprowadzenia pozycji produkcyjnej (3 ścieżki — mockup "Nowy wpis"). */
export type EntryMethod =
  | "MANUAL_ID" // 1. Ręczne ID — 4 ostatnie cyfry
  | "SCAN" // 2. Skan kodu kreskowego/QR (kamera)
  | "PHOTO_AI"; // 3. Rozpoznanie ze zdjęcia (Wariant A)

/** Status pozycji w ewidencji. */
export type EntryStatus =
  | "CONFIRMED" // zatwierdzona, wlicza się do normy
  | "PENDING_REVIEW"; // "Do sprawdzenia" — zadanie niestandardowe / nierozpoznany produkt

/** Typ obecności w kalendarzu (spec 4.2). */
export type AttendanceType =
  | "WORK"
  | "VACATION" // urlop — nie obniża wyniku miesięcznego
  | "SICK_LEAVE"; // chorobowe — nie obniża wyniku miesięcznego

/** Pojedynczy dzień obecności pracownika. */
export interface AttendanceDay {
  date: string; // ISO yyyy-mm-dd
  type: AttendanceType;
  hours: number; // przepracowane godziny (dla WORK)
}

/** Próg premiowy konfigurowany przez admina (widoczny tylko dla admina). */
export interface BonusTier {
  /** Próg procentowy realizacji normy miesięcznej, np. 100, 110. */
  thresholdPct: number;
  /** Kwota premii (zł) po osiągnięciu progu. */
  amountPln: number;
  label?: string;
}

/** Konfiguracja przelicznika kategorii (spec 4.2). */
export interface CategoryMultiplier {
  categoryId: string;
  /** Domyślny udział % normy, np. Opaski 50, Turbany 100. */
  pct: number;
}

/** Wynik procentowy pokazywany w UI (pierścienie postępu). */
export interface NormProgress {
  doneePln: number;
  normPln: number;
  pct: number;
}
