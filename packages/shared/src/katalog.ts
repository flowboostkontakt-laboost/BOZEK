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
  /** Końcówka ID produktu z PrestaShop — do 4 cyfr (ścieżka „Ręczne ID").
   *  Starsze produkty mają ID 2- i 3-cyfrowe, więc pole bywa krótsze. */
  last4?: string | null;
  /** Kod kreskowy z PrestaShop: ean13, a w razie braku reference. */
  barcode?: string | null;
}

const norm = (s: string): string => s.trim().toLowerCase();

/** Najkrótsze ID, jakie przyjmujemy z klawiatury — poniżej trafień byłoby za dużo. */
export const MIN_CYFR_ID = 2;
export const MAX_CYFR_ID = 4;

const RE_ID = /^\d{2,4}$/; // zakres musi odpowiadać MIN_CYFR_ID / MAX_CYFR_ID

/** Czy ciąg wygląda jak ręcznie wpisane ID produktu (2–4 cyfry)? */
export function wygladaJakId(kod: string): boolean {
  return RE_ID.test((kod ?? "").trim());
}

/**
 * Wszystkie produkty o podanej końcówce ID (2–4 cyfry). Porównujemy DOKŁADNIE
 * z zapisaną końcówką, nie „czy się kończy na" — inaczej wpisanie 15 trafiałoby
 * w każdy produkt z ID kończącym się na 15.
 *
 * Krótkie ID (2–3 cyfry) mają starsze produkty ze sklepu; dla nich `last4` jest
 * po prostu całym ID. Zwracamy listę, bo końcówka nie musi być unikalna —
 * o wyborze decyduje pracownica, a nie losowanie pierwszego trafienia.
 */
export function znajdzWszystkiePoId<T extends DopasowywalnyProdukt>(
  produkty: T[],
  kod: string,
): T[] {
  const code = (kod ?? "").trim();
  if (!wygladaJakId(code)) return [];
  return produkty.filter((p) => p.last4 === code);
}

/**
 * Szuka produktu pasującego do odczytanego kodu.
 * Kolejność: pełny kod kreskowy (dokładne dopasowanie) → końcówka ID (2–4 cyfry).
 * Celowo NIE porównujemy „końcówki zeskanowanego kodu" z last4 — EAN kończący się
 * przypadkiem tymi samymi cyframi trafiłby w niewłaściwy produkt.
 * Gdy końcówka ID pasuje do kilku produktów, nie zgadujemy — zwracamy undefined
 * (UI pyta pracownicę, patrz `znajdzWszystkiePoId`).
 */
export function znajdzPoKodzie<T extends DopasowywalnyProdukt>(
  produkty: T[],
  kod: string,
): T | undefined {
  const code = (kod ?? "").trim();
  if (!code) return undefined;

  const poKodzie = produkty.find((p) => p.barcode && norm(p.barcode) === norm(code));
  if (poKodzie) return poKodzie;

  const poId = znajdzWszystkiePoId(produkty, code);
  return poId.length === 1 ? poId[0] : undefined;
}

/**
 * DRZEWO KATEGORII I DZIEDZICZENIE % NORMY
 *
 * Katalog odwzorowuje menu sklepu: kategoria → podkategoria → … → produkt.
 * Na każdym poziomie można ustawić własny % normy; brak ustawienia (null)
 * oznacza „dziedziczę po rodzicu”. Przykład z wymagań klientki:
 *   Turbany 100 % → podkategoria Turbany welurowe 80 % → produkt „Velvet” 60 %.
 */

/** Domyślny przelicznik, gdy nic nie ustawiono w całej gałęzi. */
export const DOMYSLNY_PCT_NORMY = 100;

/** Minimalny kształt węzła drzewa kategorii potrzebny do wyliczenia %. */
export interface WezelKategorii {
  id: string;
  parentId?: string | null;
  /** Własne ustawienie % normy. null/undefined = dziedziczy po rodzicu. */
  normPct?: number | null;
}

/** Skąd wzięła się obowiązująca wartość — UI pokazuje to pracodawcy wprost. */
export type ZrodloPct = "wlasny" | "dziedziczony" | "domyslny";

export interface EfektywnyPct {
  pct: number;
  zrodlo: ZrodloPct;
  /** Id kategorii, z której pochodzi wartość (null dla wartości domyślnej). */
  zrodloId: string | null;
}

function indeks(wezly: Iterable<WezelKategorii>): Map<string, WezelKategorii> {
  const map = new Map<string, WezelKategorii>();
  for (const w of wezly) map.set(w.id, w);
  return map;
}

/**
 * Obowiązujący % normy dla kategorii: pierwsza ustawiona wartość idąc w górę
 * drzewa (własna → rodzic → dziadek → …), a gdy nigdzie nic nie ustawiono — 100 %.
 * Odporne na zapętlony parentId (uszkodzone dane nie zawieszą serwera).
 */
export function efektywnyPctKategorii(
  categoryId: string | null | undefined,
  wezly: Iterable<WezelKategorii> | Map<string, WezelKategorii>,
): EfektywnyPct {
  const map = wezly instanceof Map ? wezly : indeks(wezly);
  const odwiedzone = new Set<string>();
  let biezacy = categoryId ? map.get(categoryId) : undefined;
  let pierwszy = true;

  while (biezacy && !odwiedzone.has(biezacy.id)) {
    odwiedzone.add(biezacy.id);
    if (biezacy.normPct != null) {
      return { pct: biezacy.normPct, zrodlo: pierwszy ? "wlasny" : "dziedziczony", zrodloId: biezacy.id };
    }
    pierwszy = false;
    biezacy = biezacy.parentId ? map.get(biezacy.parentId) : undefined;
  }

  return { pct: DOMYSLNY_PCT_NORMY, zrodlo: "domyslny", zrodloId: null };
}

/**
 * Obowiązujący % normy dla produktu: własne nadpisanie ma pierwszeństwo,
 * w przeciwnym razie wartość z gałęzi kategorii.
 */
export function efektywnyPctProduktu(
  normPctOverride: number | null | undefined,
  categoryId: string | null | undefined,
  wezly: Iterable<WezelKategorii> | Map<string, WezelKategorii>,
): EfektywnyPct {
  if (normPctOverride != null) return { pct: normPctOverride, zrodlo: "wlasny", zrodloId: null };
  const zKategorii = efektywnyPctKategorii(categoryId, wezly);
  return { ...zKategorii, zrodlo: zKategorii.zrodlo === "domyslny" ? "domyslny" : "dziedziczony" };
}

/** Ścieżka od korzenia do wskazanej kategorii (okruszki nawigacji w panelu). */
export function sciezkaKategorii<T extends WezelKategorii>(
  categoryId: string | null | undefined,
  wezly: Iterable<T> | Map<string, T>,
): T[] {
  const map = (wezly instanceof Map ? wezly : indeks(wezly as Iterable<WezelKategorii>)) as Map<string, T>;
  const sciezka: T[] = [];
  const odwiedzone = new Set<string>();
  let biezacy = categoryId ? map.get(categoryId) : undefined;
  while (biezacy && !odwiedzone.has(biezacy.id)) {
    odwiedzone.add(biezacy.id);
    sciezka.unshift(biezacy);
    biezacy = biezacy.parentId ? map.get(biezacy.parentId) : undefined;
  }
  return sciezka;
}
