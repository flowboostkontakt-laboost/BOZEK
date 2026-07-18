import { describe, it, expect } from "vitest";
import {
  normaEfektywnaDnia,
  wartoscPozycji,
  procentNormy,
  normaMiesieczna,
  normaZOkresu,
  premiaZaMiesiac,
  obowiazujaceProgi,
  kolorPostepu,
} from "./norms.js";
import type { AttendanceDay, BonusTier } from "./types.js";

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

describe("normaMiesieczna — nieobecności nie zaniżają wyniku", () => {
  const dni: AttendanceDay[] = [
    { date: "2026-05-04", type: "WORK", hours: 8 },
    { date: "2026-05-05", type: "WORK", hours: 6 },
    { date: "2026-05-06", type: "VACATION", hours: 0 },
    { date: "2026-05-07", type: "SICK_LEAVE", hours: 0 },
  ];
  it("liczy tylko dni pracujące (8h + 6h)", () => {
    // 1750*1 + 1750*0.75 = 1750 + 1312.5 = 3062.5
    expect(normaMiesieczna(1750, dni)).toBe(3062.5);
  });
});

describe("normaZOkresu — ruchome okno 7 dni (statystyki tygodniowe)", () => {
  it("sumuje wyłącznie dni pracujące z okna, pomijając urlop i chorobowe", () => {
    const okno: AttendanceDay[] = [
      { date: "2026-07-13", type: "WORK", hours: 8 },
      { date: "2026-07-14", type: "WORK", hours: 8 },
      { date: "2026-07-15", type: "VACATION", hours: 0 },
      { date: "2026-07-16", type: "SICK_LEAVE", hours: 0 },
      { date: "2026-07-17", type: "WORK", hours: 4 },
    ];
    // 1750 + 1750 + 1750*0.5 = 4375
    expect(normaZOkresu(1750, okno)).toBe(4375);
  });

  it("okno bez dni pracujących daje normę 0 (a procent nie wybucha)", () => {
    const urlop: AttendanceDay[] = [{ date: "2026-07-13", type: "VACATION", hours: 0 }];
    expect(normaZOkresu(1750, urlop)).toBe(0);
    expect(procentNormy(0, normaZOkresu(1750, urlop))).toBe(0);
  });

  it("jest spójna z normaMiesieczna dla tego samego zestawu dni", () => {
    const te_same: AttendanceDay[] = [
      { date: "2026-05-04", type: "WORK", hours: 8 },
      { date: "2026-05-05", type: "WORK", hours: 6 },
      { date: "2026-05-06", type: "VACATION", hours: 0 },
    ];
    expect(normaZOkresu(2000, te_same)).toBe(normaMiesieczna(2000, te_same));
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
