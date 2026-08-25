import { describe, it, expect } from "vitest";
import {
  DOMYSLNY_PCT_NORMY,
  efektywnyPctKategorii,
  efektywnyPctProduktu,
  sciezkaKategorii,
  znajdzPoKodzie,
} from "./katalog.js";

describe("znajdzPoKodzie — skan kodu i ręczne ID", () => {
  const katalog = [
    { name: "Opaska taupe", last4: "1336", barcode: "5901234567890" },
    { name: "Opaska khaki", last4: "1386", barcode: "bk1386" },
    { name: "Turban", last4: "7890", barcode: null },
  ];

  it("trafia po pełnym kodzie EAN", () => {
    expect(znajdzPoKodzie(katalog, "5901234567890")?.name).toBe("Opaska taupe");
  });

  it("trafia po referencji tekstowej, ignorując wielkość liter i spacje", () => {
    expect(znajdzPoKodzie(katalog, "  BK1386 ")?.name).toBe("Opaska khaki");
  });

  it("trafia po 4 cyfrach ID (ścieżka ręczna)", () => {
    expect(znajdzPoKodzie(katalog, "7890")?.name).toBe("Turban");
  });

  it("kod kreskowy ma pierwszeństwo przed końcówką ID", () => {
    // "1386" jako last4 należy do khaki; gdyby ktoś miał taki EAN, wygrywa EAN.
    const zKolizja = [
      { name: "Z kodem 1386", last4: "9999", barcode: "1386" },
      { name: "Z ID 1386", last4: "1386", barcode: "5900000000000" },
    ];
    expect(znajdzPoKodzie(zKolizja, "1386")?.name).toBe("Z kodem 1386");
  });

  it("NIE podstawia produktu, gdy kodu nie ma w katalogu", () => {
    expect(znajdzPoKodzie(katalog, "9999999999999")).toBeUndefined();
  });

  it("nie dopasowuje po samej końcówce EAN (ochrona przed fałszywym trafieniem)", () => {
    // EAN kończy się na 1336 — to NIE może trafić w produkt o last4 = 1336.
    expect(znajdzPoKodzie(katalog, "5909999991336")).toBeUndefined();
  });

  it("pusty kod i pusty katalog nie wybuchają", () => {
    expect(znajdzPoKodzie(katalog, "   ")).toBeUndefined();
    expect(znajdzPoKodzie([], "5901234567890")).toBeUndefined();
  });

  it("produkt bez kodu kreskowego nie łapie przypadkowego skanu", () => {
    expect(znajdzPoKodzie([{ last4: "1111", barcode: null }], "")).toBeUndefined();
  });
});

describe("efektywnyPctKategorii — dziedziczenie w drzewie menu", () => {
  // Turbany 100 % → Welurowe (brak własnego) → Zimowe 80 %
  const drzewo = [
    { id: "turbany", parentId: null, normPct: 100 },
    { id: "welurowe", parentId: "turbany", normPct: null },
    { id: "zimowe", parentId: "welurowe", normPct: 80 },
    { id: "sierocy", parentId: null, normPct: null },
  ];

  it("bierze własną wartość, gdy jest ustawiona", () => {
    expect(efektywnyPctKategorii("zimowe", drzewo)).toEqual({ pct: 80, zrodlo: "wlasny", zrodloId: "zimowe" });
  });

  it("dziedziczy po najbliższym przodku z ustawioną wartością", () => {
    expect(efektywnyPctKategorii("welurowe", drzewo)).toEqual({
      pct: 100,
      zrodlo: "dziedziczony",
      zrodloId: "turbany",
    });
  });

  it("gdy nikt w gałęzi nie ustawił — 100 % domyślne", () => {
    expect(efektywnyPctKategorii("sierocy", drzewo).pct).toBe(DOMYSLNY_PCT_NORMY);
    expect(efektywnyPctKategorii("sierocy", drzewo).zrodlo).toBe("domyslny");
  });

  it("nieznana kategoria nie wybucha", () => {
    expect(efektywnyPctKategorii("nie-ma-takiej", drzewo).pct).toBe(100);
    expect(efektywnyPctKategorii(null, drzewo).pct).toBe(100);
  });

  it("0 % to prawidłowa wartość, nie „brak ustawienia”", () => {
    const zZerem = [{ id: "a", parentId: null, normPct: 100 }, { id: "b", parentId: "a", normPct: 0 }];
    expect(efektywnyPctKategorii("b", zZerem).pct).toBe(0);
  });

  it("zapętlone parentId nie zawiesza wyliczenia", () => {
    const petla = [
      { id: "x", parentId: "y", normPct: null },
      { id: "y", parentId: "x", normPct: null },
    ];
    expect(efektywnyPctKategorii("x", petla).pct).toBe(100);
  });
});

describe("efektywnyPctProduktu — kategoria 100 %, podkategoria 80 %, produkt 60 %", () => {
  const drzewo = [
    { id: "kat", parentId: null, normPct: 100 },
    { id: "podkat", parentId: "kat", normPct: 80 },
  ];

  it("nadpisanie produktu wygrywa z całą gałęzią", () => {
    expect(efektywnyPctProduktu(60, "podkat", drzewo).pct).toBe(60);
  });

  it("bez nadpisania produkt bierze % podkategorii", () => {
    expect(efektywnyPctProduktu(null, "podkat", drzewo)).toEqual({
      pct: 80,
      zrodlo: "dziedziczony",
      zrodloId: "podkat",
    });
  });

  it("produkt w kategorii bez ustawień dostaje 100 %", () => {
    expect(efektywnyPctProduktu(null, "brak", drzewo).pct).toBe(100);
  });
});

describe("sciezkaKategorii — okruszki nawigacji", () => {
  const drzewo = [
    { id: "a", parentId: null, normPct: 100 },
    { id: "b", parentId: "a", normPct: null },
    { id: "c", parentId: "b", normPct: 60 },
  ];

  it("zwraca ścieżkę od korzenia do węzła", () => {
    expect(sciezkaKategorii("c", drzewo).map((w) => w.id)).toEqual(["a", "b", "c"]);
  });

  it("dla korzenia zwraca sam korzeń, dla braku — pustą listę", () => {
    expect(sciezkaKategorii("a", drzewo).map((w) => w.id)).toEqual(["a"]);
    expect(sciezkaKategorii(null, drzewo)).toEqual([]);
  });
});
