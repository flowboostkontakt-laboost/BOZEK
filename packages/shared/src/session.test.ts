import { describe, it, expect } from "vitest";
import { sekundyDoWylogowania, limitSesjiSekundy } from "./session.js";

describe("sekundyDoWylogowania — granica 18:00", () => {
  it("o 16:00 zostają 2 godziny", () => {
    expect(sekundyDoWylogowania(18, new Date("2026-07-01T16:00:00"))).toBe(7200);
  });
  it("o 17:59 zostaje minuta", () => {
    expect(sekundyDoWylogowania(18, new Date("2026-07-01T17:59:00"))).toBe(60);
  });
  it("po 18:00 wartość jest ujemna", () => {
    expect(sekundyDoWylogowania(18, new Date("2026-07-01T19:00:00"))).toBe(-3600);
  });
});

describe("limitSesjiSekundy — przycinanie do granicy", () => {
  it("ADMIN (brak limitu) dostaje pełny base", () => {
    expect(limitSesjiSekundy(1800, null)).toBe(1800);
  });
  it("gdy do 18:00 daleko — obowiązuje base", () => {
    expect(limitSesjiSekundy(1800, 7200)).toBe(1800);
  });
  it("gdy do 18:00 blisko — sesja skraca się do granicy", () => {
    expect(limitSesjiSekundy(1800, 600)).toBe(600);
  });
  it("po 18:00 sesja praktycznie zamknięta (min 60 s)", () => {
    expect(limitSesjiSekundy(1800, -100)).toBe(60);
  });
});
