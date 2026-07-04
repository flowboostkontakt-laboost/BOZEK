/**
 * Reguły sesji pracownicy — sztywne wylogowanie o zadanej godzinie (spec 2.1).
 * Wydzielone jako czyste funkcje, aby dało się je testować bez bazy i serwera.
 */

/** Sekundy pozostałe do godziny wylogowania `hour` względem `now` (może być ujemne po godzinie). */
export function sekundyDoWylogowania(hour: number, now: Date): number {
  const cutoff = new Date(now);
  cutoff.setHours(hour, 0, 0, 0);
  return Math.floor((cutoff.getTime() - now.getTime()) / 1000);
}

/**
 * Efektywny czas życia sesji: nie dłużej niż `base`, nie dłużej niż do wylogowania.
 * `cutoffSeconds === null` → brak limitu godzinowego (rola ADMIN).
 * Minimum 60 s, aby zalogowanie tuż przed/po granicy nie dawało wartości ujemnej.
 */
export function limitSesjiSekundy(base: number, cutoffSeconds: number | null): number {
  if (cutoffSeconds === null) return base;
  return Math.max(60, Math.min(base, cutoffSeconds));
}
