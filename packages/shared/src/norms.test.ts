import { describe, it, expect } from "vitest";
import {
  normaEfektywnaDnia,
  wartoscPozycji,
  procentNormy,
  premiaZaMiesiac,
  obowiazujaceProgi,
  kolorPostepu,
  sredniProcentDni,
} from "./norms.js";
import type { BonusTier } from "./types.js";

describe("normaEfektywnaDnia — przeliczanie proporcjonalne do etatu", () => {
  it("pełny etat 8h zwraca normę bazową", () => {
    expect(normaEfektywnaDnia(2000, 8)).toBe(2000);
  });
  it("6h przy normie 1750 = 1312,5 (zgodnie z mockupem dla Basi)", () => {
    expect(normaEfektywnaDnia(1750, 6)).toBe(1312.5);
  });
});

describe("wartoscPozycji — przeliczniki kategorii i override", () => {
  it("Opaski 50% — cena 100 × 2 szt = 100", () => {
    expect(wartoscPozycji(100, 50, 2)).toBe(100);
  });
  it("Turbany 100% — cena 100 × 2 szt = 200", () => {
    expect(wartoscPozycji(100, 100, 2)).toBe(200);
  });
  it("override per produkt ma pierwszeństwo nad kategorią", () => {
    expect(wartoscPozycji(100, 50, 1, 75)).toBe(75);
  });
});

describe("procentNormy — wartości z mockupu", () => {
  it("Ania 1277/1750 ≈ 73%", () => {
    expect(procentNormy(1277, 1750)).toBe(73);
  });
  it("Kasia 2150/2000 ≈ 108% (próg premiowy przekroczony)", () => {
    expect(procentNormy(2150, 2000)).toBe(108);
  });
  it("zero normy nie wybucha", () => {
    expect(procentNormy(500, 0)).toBe(0);
  });
});

describe("premiaZaMiesiac — progi (widoczne tylko dla admina)", () => {
  const progi: BonusTier[] = [
    { thresholdPct: 100, amountPln: 300 },
    { thresholdPct: 110, amountPln: 600 },
  ];
  it("106% → próg 100% → 300 zł", () => {
    expect(premiaZaMiesiac(106, progi)).toBe(300);
  });
  it("115% → najwyższy próg 110% → 600 zł", () => {
    expect(premiaZaMiesiac(115, progi)).toBe(600);
  });
  it("95% → brak premii", () => {
    expect(premiaZaMiesiac(95, progi)).toBe(0);
  });
});

describe("obowiazujaceProgi — premie indywidualne nadpisują domyślne", () => {
  const domyslne: BonusTier[] = [
    { thresholdPct: 100, amountPln: 300 },
    { thresholdPct: 110, amountPln: 600 },
  ];
  const wlasne: BonusTier[] = [{ thresholdPct: 90, amountPln: 500 }];

  it("brak własnych progów → obowiązują domyślne", () => {
    const r = obowiazujaceProgi([], domyslne);
    expect(r.progi).toEqual(domyslne);
    expect(r.indywidualne).toBe(false);
  });

  it("własne progi w całości nadpisują domyślne", () => {
    const r = obowiazujaceProgi(wlasne, domyslne);
    expect(r.progi).toEqual(wlasne);
    expect(r.indywidualne).toBe(true);
  });

  it("indywidualny próg 90% daje premię tam, gdzie domyślne 100% jej nie dają", () => {
    expect(premiaZaMiesiac(95, obowiazujaceProgi(wlasne, domyslne).progi)).toBe(500);
    expect(premiaZaMiesiac(95, obowiazujaceProgi([], domyslne).progi)).toBe(0);
  });

  it("własny komplet potrafi też ZABRAĆ premię mimo wysokiego wyniku", () => {
    const surowe: BonusTier[] = [{ thresholdPct: 150, amountPln: 1000 }];
    expect(premiaZaMiesiac(120, obowiazujaceProgi(surowe, domyslne).progi)).toBe(0);
  });
});

describe("kolorPostepu — gamifikacja od czerwonego do zielonego", () => {
  it("mapuje progi na tokeny koloru", () => {
    expect(kolorPostepu(30)).toBe("danger");
    expect(kolorPostepu(70)).toBe("warning");
    expect(kolorPostepu(92)).toBe("ok");
    expect(kolorPostepu(107)).toBe("success");
  });
});

describe("sredniProcentDni — % okresu jako średnia z dni (ustalenie 14.08.2026)", () => {
  it("liczy średnią z dziennych procentów, a nie stosunek sum", () => {
    // 100 % i 50 % → 75 %, mimo że drugi dzień ma dwa razy mniejszą normę.
    expect(sredniProcentDni([
      { norma: 1750, wykonano: 1750 },
      { norma: 875, wykonano: 437.5 },
    ])).toBe(75);
  });

  it("dzień krótszy waży tyle samo co pełny", () => {
    // Basia 6h (norma 1312,5) wyrobiła 100 %, Ania 8h wyrobiła 50 % → 75 %.
    expect(sredniProcentDni([
      { norma: 1312.5, wykonano: 1312.5 },
      { norma: 1750, wykonano: 875 },
    ])).toBe(75);
  });

  it("dni bez normy (urlop, chorobowe) nie wchodzą do średniej", () => {
    expect(sredniProcentDni([
      { norma: 1750, wykonano: 1750 },
      { norma: 0, wykonano: 0 },
    ])).toBe(100);
  });

  it("dzień przepracowany bez produkcji liczy się jako 0 % i zaniża średnią", () => {
    expect(sredniProcentDni([
      { norma: 1750, wykonano: 1750 },
      { norma: 1750, wykonano: 0 },
    ])).toBe(50);
  });

  it("brak dni = 0 %, bez dzielenia przez zero", () => {
    expect(sredniProcentDni([])).toBe(0);
    expect(sredniProcentDni([{ norma: 0, wykonano: 0 }])).toBe(0);
  });

  it("nadwyżka ponad 100 % jest zachowana (premie)", () => {
    expect(sredniProcentDni([
      { norma: 1000, wykonano: 1200 },
      { norma: 1000, wykonano: 1000 },
    ])).toBe(110);
  });
});
