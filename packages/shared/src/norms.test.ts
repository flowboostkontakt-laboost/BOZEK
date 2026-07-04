import { describe, it, expect } from "vitest";
import {
  normaEfektywnaDnia,
  wartoscPozycji,
  procentNormy,
  normaMiesieczna,
  premiaZaMiesiac,
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

describe("kolorPostepu — gamifikacja od czerwonego do zielonego", () => {
  it("mapuje progi na tokeny koloru", () => {
    expect(kolorPostepu(30)).toBe("danger");
    expect(kolorPostepu(70)).toBe("warning");
    expect(kolorPostepu(92)).toBe("ok");
    expect(kolorPostepu(107)).toBe("success");
  });
});
