import { describe, it, expect } from "vitest";
import { znajdzPoKodzie } from "./katalog.js";

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
