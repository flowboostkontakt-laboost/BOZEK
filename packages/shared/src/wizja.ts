/**
 * Dopasowanie produktu ze ZDJĘCIA — czysta matematyka, bez sieci i bazy.
 *
 * Zdjęcie i każde zdjęcie katalogowe zamieniamy na wektor (embedding) przez
 * zewnętrzne API vision. Dopasowanie = najbliższy wektor katalogowy według
 * podobieństwa kosinusowego.
 *
 * ZASADA BEZPIECZEŃSTWA (ta sama co przy skanowaniu kodu): słabe podobieństwo
 * NIE daje wyniku. Wcześniejsza wersja aplikacji podstawiała pierwszy produkt
 * z katalogu i zapisywała pracownicy czynność, której nie wykonała. Tutaj
 * poniżej progu zwracamy pustą listę, a decyzję i tak zawsze podejmuje człowiek
 * — pracownica wybiera z propozycji albo wpisuje ID ręcznie.
 */

/** Domyślny próg podobieństwa; poniżej niego nie proponujemy nic. */
export const DOMYSLNY_PROG_AI = 0.78;

/** Ile propozycji maksymalnie pokazujemy pracownicy. */
export const MAX_PROPOZYCJI = 3;

export interface ProduktZWektorem {
  id: string;
  name: string;
  embedding: number[];
}

export interface PropozycjaAi<T = ProduktZWektorem> {
  produkt: T;
  /** Podobieństwo 0–1 (1 = ten sam obraz). */
  score: number;
}

/**
 * Podobieństwo kosinusowe dwóch wektorów. Zwraca 0 dla wektorów o różnej
 * długości albo zerowych — lepiej „nie wiem" niż przypadkowy wynik.
 * Wynik przycinamy do 0–1: ujemne podobieństwo i tak oznacza „zupełnie co innego".
 */
export function podobienstwoKosinusowe(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let iloczyn = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    iloczyn += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  const wynik = iloczyn / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.min(1, Math.max(0, wynik));
}

/**
 * Najlepsze dopasowania zdjęcia do katalogu — posortowane malejąco, tylko te
 * powyżej progu, maksymalnie `limit`. Pusta lista = „nie rozpoznano".
 */
export function dopasujZdjecie<T extends ProduktZWektorem>(
  wektorZdjecia: number[],
  katalog: T[],
  prog: number = DOMYSLNY_PROG_AI,
  limit: number = MAX_PROPOZYCJI,
): PropozycjaAi<T>[] {
  if (!wektorZdjecia?.length) return [];
  return katalog
    .map((produkt) => ({ produkt, score: podobienstwoKosinusowe(wektorZdjecia, produkt.embedding) }))
    .filter((p) => p.score >= prog)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit));
}

/**
 * Czy propozycja jest na tyle pewna, żeby od razu pokazać ją jako główną?
 * Wymagamy nie tylko wysokiego wyniku, ale i WYRAŹNEJ przewagi nad drugą
 * propozycją — przy dwóch bliźniaczo podobnych produktach (a takich w sklepie
 * z rękodziełem jest dużo) pytamy pracownicę zamiast zgadywać.
 */
export function pewneDopasowanie<T extends ProduktZWektorem>(
  propozycje: PropozycjaAi<T>[],
  przewaga = 0.05,
): PropozycjaAi<T> | null {
  if (propozycje.length === 0) return null;
  if (propozycje.length === 1) return propozycje[0];
  return propozycje[0].score - propozycje[1].score >= przewaga ? propozycje[0] : null;
}

/**
 * Odczyt wektora z odpowiedzi dostawcy embeddingów.
 *
 * Każdy dostawca zwraca wektor gdzie indziej:
 *  • Gemini (Google AI Studio): `embeddings[0].values` albo `embedding.values`
 *  • Cohere:                    `embeddings.float[0]`
 *  • Jina / Voyage / OpenAI-podobne: `data[0].embedding`
 *
 * Zamiast zakładać jeden kształt, sprawdzamy znane po kolei — dzięki temu
 * zmiana dostawcy nie wymaga zmiany kodu, tylko adresu i modelu w konfiguracji.
 * Funkcja jest tutaj (a nie przy kliencie HTTP), bo to jedyny fragment
 * integracji, który da się przetestować bez klucza API.
 */
export function odczytajWektorZOdpowiedzi(body: unknown): number[] | null {
  const liczby = (v: unknown): number[] | null =>
    Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "number" && Number.isFinite(x))
      ? (v as number[])
      : null;

  const root = body as Record<string, any> | null | undefined;
  if (!root || typeof root !== "object") return null;

  const kandydaci = [
    root.embeddings?.[0]?.values, // Gemini (wiele treści)
    root.embedding?.values, // Gemini (pojedyncza treść)
    root.embeddings?.float?.[0], // Cohere
    root.embeddings?.[0], // Cohere w starszym kształcie
    root.data?.[0]?.embedding, // Jina / Voyage / OpenAI-podobne
    root.embedding, // płaska tablica
  ];
  for (const k of kandydaci) {
    const v = liczby(k);
    if (v) return v;
  }
  return null;
}
