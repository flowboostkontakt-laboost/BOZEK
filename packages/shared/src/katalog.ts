/**
 * Dopasowywanie produktu z katalogu do kodu wprowadzonego przez pracownicę
 * (skan kodu kreskowego/QR albo 4 ostatnie cyfry ID z PrestaShop).
 *
 * ZASADA BEZPIECZEŃSTWA: brak trafienia zwraca undefined. Nigdy nie podstawiamy
 * „jakiegoś" produktu zastępczego — zapisałoby to pracownicy czynność, której
 * nie wykonała, i zafałszowało ewidencję oraz realizację normy.
 */

/** Minimalny kształt produktu potrzebny do dopasowania. */
export interface DopasowywalnyProdukt {
  /** 4 ostatnie cyfry ID produktu z PrestaShop (ścieżka „Ręczne ID"). */
  last4?: string | null;
  /** Kod kreskowy z PrestaShop: ean13, a w razie braku reference. */
  barcode?: string | null;
}

const norm = (s: string): string => s.trim().toLowerCase();

/**
 * Szuka produktu pasującego do odczytanego kodu.
 * Kolejność: pełny kod kreskowy (dokładne dopasowanie) → 4-cyfrowa końcówka ID.
 * Celowo NIE porównujemy „końcówki zeskanowanego kodu" z last4 — EAN kończący się
 * przypadkiem tymi samymi cyframi trafiłby w niewłaściwy produkt.
 */
export function znajdzPoKodzie<T extends DopasowywalnyProdukt>(
  produkty: T[],
  kod: string,
): T | undefined {
  const code = (kod ?? "").trim();
  if (!code) return undefined;

  const poKodzie = produkty.find((p) => p.barcode && norm(p.barcode) === norm(code));
  if (poKodzie) return poKodzie;

  if (/^\d{4}$/.test(code)) return produkty.find((p) => p.last4 === code);

  return undefined;
}
