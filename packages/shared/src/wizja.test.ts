import { describe, it, expect } from "vitest";
import {
  DOMYSLNY_PROG_AI,
  dopasujZdjecie,
  pewneDopasowanie,
  odczytajWektorZOdpowiedzi,
  podobienstwoKosinusowe,
} from "./wizja.js";

describe("podobienstwoKosinusowe", () => {
  it("ten sam wektor = 1", () => {
    expect(podobienstwoKosinusowe([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it("nie zależy od długości wektora, tylko od kierunku", () => {
    expect(podobienstwoKosinusowe([1, 0], [5, 0])).toBeCloseTo(1);
  });

  it("prostopadłe = 0", () => {
    expect(podobienstwoKosinusowe([1, 0], [0, 1])).toBe(0);
  });

  it("przeciwne przycinamy do 0, nie do -1", () => {
    expect(podobienstwoKosinusowe([1, 0], [-1, 0])).toBe(0);
  });

  it("różne długości i wektory zerowe dają 0, nie wyjątek", () => {
    expect(podobienstwoKosinusowe([1, 2, 3], [1, 2])).toBe(0);
    expect(podobienstwoKosinusowe([0, 0], [1, 1])).toBe(0);
    expect(podobienstwoKosinusowe([], [])).toBe(0);
  });
});

describe("dopasujZdjecie — propozycje dla pracownicy", () => {
  const katalog = [
    { id: "a", name: "Turban bordo", embedding: [1, 0, 0] },
    { id: "b", name: "Turban grafit", embedding: [0.95, 0.31, 0] },
    { id: "c", name: "Chusta lniana", embedding: [0, 1, 0] },
  ];

  it("zwraca najlepsze dopasowanie na pierwszym miejscu", () => {
    const wynik = dopasujZdjecie([1, 0, 0], katalog);
    expect(wynik[0].produkt.id).toBe("a");
    expect(wynik[0].score).toBeCloseTo(1);
  });

  it("odcina produkty poniżej progu", () => {
    // Chusta jest prostopadła do zdjęcia → 0, nie ma prawa się pokazać.
    expect(dopasujZdjecie([1, 0, 0], katalog).map((p) => p.produkt.id)).not.toContain("c");
  });

  it("NIE proponuje niczego, gdy nic nie jest podobne", () => {
    expect(dopasujZdjecie([0, 0, 1], katalog)).toEqual([]);
  });

  it("puste zdjęcie i pusty katalog nie wybuchają", () => {
    expect(dopasujZdjecie([], katalog)).toEqual([]);
    expect(dopasujZdjecie([1, 0, 0], [])).toEqual([]);
  });

  it("ogranicza liczbę propozycji", () => {
    const duzy = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, embedding: [1, 0, 0] }));
    expect(dopasujZdjecie([1, 0, 0], duzy).length).toBe(3);
  });

  it("próg da się podnieść (ostrzejsze dopasowanie)", () => {
    expect(dopasujZdjecie([0.95, 0.31, 0], katalog, 0.999).map((p) => p.produkt.id)).toEqual(["b"]);
  });

  it("domyślny próg to 0,78", () => {
    expect(DOMYSLNY_PROG_AI).toBe(0.78);
  });
});

describe("pewneDopasowanie — kiedy wolno pokazać jeden produkt", () => {
  const p = (id: string, score: number) => ({ produkt: { id, name: id, embedding: [1] }, score });

  it("wyraźna przewaga nad drugą propozycją = pewne", () => {
    expect(pewneDopasowanie([p("a", 0.95), p("b", 0.8)])?.produkt.id).toBe("a");
  });

  it("dwa bliźniaczo podobne produkty = pytamy pracownicę", () => {
    expect(pewneDopasowanie([p("a", 0.95), p("b", 0.93)])).toBeNull();
  });

  it("jedna propozycja jest pewna sama z siebie", () => {
    expect(pewneDopasowanie([p("a", 0.8)])?.produkt.id).toBe("a");
  });

  it("brak propozycji = brak wyniku", () => {
    expect(pewneDopasowanie([])).toBeNull();
  });
});

describe("odczytajWektorZOdpowiedzi — różne kształty odpowiedzi dostawców", () => {
  it("Gemini: embeddings[0].values", () => {
    expect(odczytajWektorZOdpowiedzi({ embeddings: [{ values: [1, 2, 3] }] })).toEqual([1, 2, 3]);
  });

  it("Gemini pojedyncza treść: embedding.values", () => {
    expect(odczytajWektorZOdpowiedzi({ embedding: { values: [4, 5] } })).toEqual([4, 5]);
  });

  it("Cohere: embeddings.float[0]", () => {
    expect(odczytajWektorZOdpowiedzi({ embeddings: { float: [[6, 7]] } })).toEqual([6, 7]);
  });

  it("Jina / Voyage: data[0].embedding", () => {
    expect(odczytajWektorZOdpowiedzi({ data: [{ embedding: [8, 9] }] })).toEqual([8, 9]);
  });

  it("odpowiedź bez wektora daje null, a nie śmieci", () => {
    expect(odczytajWektorZOdpowiedzi({ message: "Invalid API key" })).toBeNull();
    expect(odczytajWektorZOdpowiedzi({ embeddings: [] })).toBeNull();
    expect(odczytajWektorZOdpowiedzi(null)).toBeNull();
    expect(odczytajWektorZOdpowiedzi("cokolwiek")).toBeNull();
  });

  it("odrzuca tablicę z nie-liczbami (np. tekst błędu w polu wektora)", () => {
    expect(odczytajWektorZOdpowiedzi({ embedding: ["a", "b"] })).toBeNull();
    expect(odczytajWektorZOdpowiedzi({ embedding: [1, null, 3] })).toBeNull();
  });
});
