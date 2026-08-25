/**
 * Wybór tego, co trafia do katalogu z PrestaShopu.
 *
 * Wymaganie klientki: „baza produktów pobrana tylko z tego menu” — czyli
 * bierzemy wyłącznie gałęzie widoczne w menu sklepu (aktywne, poniżej korzenia),
 * a produkty tylko aktywne. Logika jest tu, a nie przy kliencie HTTP, żeby dało
 * się ją przetestować bez sklepu — pomyłka oznacza znikające produkty w ewidencji.
 */

/** Kategoria tak, jak zwraca ją webservice PrestaShopu. */
export interface KategoriaSklepu {
  id: string;
  name: string;
  /** id_parent — kategoria nadrzędna. */
  parentId?: string;
  /** level_depth: 0 = Root, 1 = Strona główna, ≥ 2 = pozycje menu. */
  depth?: number;
  position: number;
  active: boolean;
  /** is_root_category — korzeń sklepu, nie jest pozycją menu. */
  isRoot: boolean;
}

/** Produkt tak, jak zwraca go webservice PrestaShopu. */
export interface ProduktSklepu {
  /** id_category_default. */
  categoryId?: string;
  /** associations → categories. */
  categoryIds?: string[];
}

/** Kategoria menu z policzoną głębokością. */
export interface KategoriaMenu {
  id: string;
  name: string;
  parentId?: string;
  position: number;
  depth: number;
}

/**
 * Zostawia wyłącznie gałęzie widoczne w menu: aktywne, poniżej korzenia
 * (depth ≥ 2) i z aktywnymi przodkami — wyłączona kategoria ukrywa całe swoje
 * poddrzewo, dokładnie jak w sklepie. Wynik posortowany od korzenia w dół,
 * więc przy zapisie rodzic zawsze istnieje przed dzieckiem.
 */
export function menuKategorii(cats: KategoriaSklepu[]): KategoriaMenu[] {
  const byId = new Map(cats.filter((c) => c.id).map((c) => [c.id, c]));

  // level_depth bywa nieobecne w starszych PrestaShopach — wtedy liczymy sami.
  const cache = new Map<string, number>();
  const depth = (c: KategoriaSklepu): number => {
    if (c.depth != null) return c.depth;
    const znane = cache.get(c.id);
    if (znane != null) return znane;
    let d = 0;
    let cur: KategoriaSklepu | undefined = c;
    const seen = new Set<string>();
    while (cur?.parentId && !seen.has(cur.id)) {
      seen.add(cur.id);
      const parent: KategoriaSklepu | undefined = byId.get(cur.parentId);
      if (!parent) break;
      d++;
      cur = parent;
    }
    cache.set(c.id, d);
    return d;
  };

  const korzen = (c: KategoriaSklepu): boolean => c.isRoot || depth(c) <= 1;

  const wMenu = (c: KategoriaSklepu): boolean => {
    const seen = new Set<string>();
    let cur: KategoriaSklepu | undefined = c;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      if (korzen(cur) || !cur.active) return false;
      const parent: KategoriaSklepu | undefined = cur.parentId ? byId.get(cur.parentId) : undefined;
      // Doszliśmy do korzenia sklepu (albo gałąź się urywa) nie potykając się
      // o wyłączoną kategorię → cała ścieżka jest widoczna w menu.
      if (!parent || korzen(parent)) return true;
      cur = parent;
    }
    return false;
  };

  return cats
    .filter((c) => c.id && wMenu(c))
    .map((c) => ({ id: c.id, name: c.name, parentId: c.parentId, position: c.position, depth: depth(c) }))
    .sort((a, b) => a.depth - b.depth || a.position - b.position || a.name.localeCompare(b.name, "pl"));
}

/**
 * Kategoria, pod którą produkt trafia w drzewie: domyślna ze sklepu, a gdy ta
 * nie należy do menu (bywa nią „Strona główna”) — najgłębsza z przypisanych.
 * Brak trafienia = produktu nie ma w menu, więc go nie pobieramy.
 */
export function wybierzKategorie(
  p: ProduktSklepu,
  wMenu: Map<string, unknown> | Set<string>,
  depthOf: Map<string, number>,
): string | undefined {
  if (p.categoryId && wMenu.has(p.categoryId)) return p.categoryId;
  const kandydaci = (p.categoryIds ?? []).filter((id) => wMenu.has(id));
  if (kandydaci.length === 0) return undefined;
  return kandydaci.sort((a, b) => (depthOf.get(b) ?? 0) - (depthOf.get(a) ?? 0))[0];
}
