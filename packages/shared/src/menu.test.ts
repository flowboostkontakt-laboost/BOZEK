import { describe, it, expect } from "vitest";
import { menuKategorii, wybierzKategorie, type KategoriaSklepu } from "./menu.js";

/** Układ jak w PrestaShopie: 1 Root → 2 Strona główna → pozycje menu. */
const sklep: KategoriaSklepu[] = [
  { id: "1", name: "Root", depth: 0, position: 0, active: true, isRoot: true },
  { id: "2", name: "Strona główna", parentId: "1", depth: 1, position: 0, active: true, isRoot: false },
  { id: "10", name: "Turbany", parentId: "2", depth: 2, position: 1, active: true, isRoot: false },
  { id: "11", name: "Turbany welurowe", parentId: "10", depth: 3, position: 0, active: true, isRoot: false },
  { id: "20", name: "Opaski", parentId: "2", depth: 2, position: 0, active: true, isRoot: false },
  { id: "30", name: "Wyprzedaż", parentId: "2", depth: 2, position: 3, active: false, isRoot: false },
  { id: "31", name: "Wyprzedaż — turbany", parentId: "30", depth: 3, position: 0, active: true, isRoot: false },
];

describe("menuKategorii — katalog tylko z menu sklepu", () => {
  const menu = menuKategorii(sklep);
  const ids = menu.map((c) => c.id);

  it("pomija Root i Stronę główną", () => {
    expect(ids).not.toContain("1");
    expect(ids).not.toContain("2");
  });

  it("bierze kategorie i podkategorie menu", () => {
    expect(ids).toEqual(expect.arrayContaining(["10", "11", "20"]));
  });

  it("pomija kategorię wyłączoną w sklepie", () => {
    expect(ids).not.toContain("30");
  });

  it("wyłączona kategoria ukrywa całe swoje poddrzewo", () => {
    // Podkategoria jest aktywna, ale jej rodzic nie — w sklepie też jej nie widać.
    expect(ids).not.toContain("31");
  });

  it("rodzic zawsze przed dzieckiem (kolejność zapisu do bazy)", () => {
    expect(ids.indexOf("10")).toBeLessThan(ids.indexOf("11"));
  });

  it("sortuje najwyższy poziom wg pozycji z menu", () => {
    const najwyzszy = menu.filter((c) => c.depth === 2).map((c) => c.name);
    expect(najwyzszy).toEqual(["Opaski", "Turbany"]);
  });

  it("radzi sobie bez level_depth (starsze PrestaShopy) — liczy głębokość sama", () => {
    const bezDepth = sklep.map(({ depth: _pominiete, ...reszta }) => reszta);
    expect(menuKategorii(bezDepth).map((c) => c.id).sort()).toEqual(["10", "11", "20"]);
  });

  it("pusta odpowiedź sklepu daje puste menu (a nie wysyp)", () => {
    expect(menuKategorii([])).toEqual([]);
  });

  it("zapętlone id_parent nie zawiesza synchronizacji", () => {
    const petla: KategoriaSklepu[] = [
      { id: "a", name: "A", parentId: "b", position: 0, active: true, isRoot: false },
      { id: "b", name: "B", parentId: "a", position: 0, active: true, isRoot: false },
    ];
    expect(() => menuKategorii(petla)).not.toThrow();
  });
});

describe("wybierzKategorie — gdzie produkt wisi w drzewie", () => {
  const menu = menuKategorii(sklep);
  const wMenu = new Set(menu.map((c) => c.id));
  const depthOf = new Map(menu.map((c) => [c.id, c.depth]));

  it("bierze kategorię domyślną, gdy jest w menu", () => {
    expect(wybierzKategorie({ categoryId: "10", categoryIds: ["2", "10"] }, wMenu, depthOf)).toBe("10");
  });

  it("gdy domyślna to Strona główna — schodzi do najgłębszej z przypisanych", () => {
    expect(wybierzKategorie({ categoryId: "2", categoryIds: ["2", "10", "11"] }, wMenu, depthOf)).toBe("11");
  });

  it("produkt spoza menu nie trafia do katalogu", () => {
    expect(wybierzKategorie({ categoryId: "2", categoryIds: ["2", "30"] }, wMenu, depthOf)).toBeUndefined();
    expect(wybierzKategorie({}, wMenu, depthOf)).toBeUndefined();
  });
});
