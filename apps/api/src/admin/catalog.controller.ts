import { Body, Controller, Get, NotFoundException, Param, Patch, Query } from "@nestjs/common";
import { Role } from "@prisma/client";
import { efektywnyPctKategorii, efektywnyPctProduktu, sciezkaKategorii, wartoscPozycji } from "@sep/shared";
import type { WezelKategorii } from "@sep/shared";
import { Roles } from "../auth/decorators/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { ProductOverrideDto, UpdateCategoryDto } from "./dto";

/** Kategoria w postaci potrzebnej do liczenia drzewa i dziedziczenia %. */
type Kat = {
  id: string;
  name: string;
  parentId: string | null;
  normPct: number | null;
  position: number;
};

/**
 * Katalog jako DRZEWO odwzorowujące menu sklepu: kategoria → podkategoria → …
 * → produkt. Na każdym poziomie ustawia się % normy; puste pole oznacza
 * dziedziczenie po gałęzi wyżej (kategoria 100 % → podkategoria 80 % → produkt 60 %).
 */
@Roles(Role.ADMIN)
@Controller("admin/catalog")
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  /** Płaska lista kategorii (zgodność wsteczna + proste listy wyboru). */
  @Get("categories")
  async categories() {
    const cats = await this.aktywneKategorie();
    return cats.map((c) => ({
      id: c.id,
      name: c.name,
      parentId: c.parentId,
      normPct: c.normPct,
      effectivePct: efektywnyPctKategorii(c.id, cats).pct,
    }));
  }

  /**
   * Jeden poziom drzewa: podkategorie i produkty wskazanego węzła.
   * Bez `parentId` → korzeń (kategorie najwyższego poziomu menu).
   * Z `q` → wyszukiwarka produktów w całym drzewie (żeby dojść do jednego
   * produktu bez klikania przez gałęzie).
   */
  @Get("tree")
  async tree(@Query("parentId") parentId?: string, @Query("q") q?: string) {
    const cats = await this.aktywneKategorie();
    const byId = new Map(cats.map((c) => [c.id, c]));
    const node = parentId ? byId.get(parentId) : undefined;
    if (parentId && !node) throw new NotFoundException("Nie ma takiej kategorii");

    const szukane = (q ?? "").trim();
    if (szukane) return { path: [], current: null, categories: [], products: await this.szukaj(szukane, cats) };

    const liczbaProduktow = await this.liczbaProduktowWGalezi(cats);
    const dzieci = cats
      .filter((c) => (c.parentId ?? null) === (parentId ?? null))
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "pl"));

    // W korzeniu drzewa nie ma produktow — te wisza dopiero pod kategoriami menu.
    const produkty = parentId
      ? await this.prisma.product.findMany({
          where: { active: true, categoryId: parentId },
          orderBy: { name: "asc" },
        })
      : [];

    return {
      path: sciezkaKategorii(parentId, cats).map((c) => ({ id: c.id, name: c.name })),
      current: node
        ? {
            id: node.id,
            name: node.name,
            parentId: node.parentId,
            ...this.pctKategorii(node, cats),
          }
        : null,
      categories: dzieci.map((c) => ({
        id: c.id,
        name: c.name,
        childCount: cats.filter((x) => x.parentId === c.id).length,
        productCount: liczbaProduktow.get(c.id) ?? 0,
        ...this.pctKategorii(c, cats),
      })),
      products: produkty.map((p) => this.produktDto(p, cats)),
    };
  }

  /**
   * % normy dla kategorii. `null` = wyczyszczenie własnego ustawienia,
   * czyli powrót do dziedziczenia po kategorii nadrzędnej.
   */
  @Patch("categories/:id")
  async updateCategory(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    const updated = await this.prisma.category.update({
      where: { id },
      data: { normPct: dto.normPct ?? null },
    });
    const cats = await this.aktywneKategorie();
    return { id: updated.id, name: updated.name, ...this.pctKategorii(updated, cats) };
  }

  @Get("products")
  async products(@Query("q") q?: string) {
    const cats = await this.aktywneKategorie();
    const list = await this.prisma.product.findMany({
      where: { active: true, ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}) },
      include: { category: true },
      orderBy: { name: "asc" },
      take: 100,
    });
    return list.map((p) => ({ ...this.produktDto(p, cats), category: { id: p.categoryId, name: p.category.name } }));
  }

  /** Nadpisanie % normy dla pojedynczego produktu (`null` = dziedziczy z gałęzi). */
  @Patch("products/:id/override")
  async override(@Param("id") id: string, @Body() dto: ProductOverrideDto) {
    const updated = await this.prisma.product.update({
      where: { id },
      data: { normPctOverride: dto.normPctOverride ?? null },
    });
    const cats = await this.aktywneKategorie();
    return this.produktDto(updated, cats);
  }

  // ─── pomocnicze ─────────────────────────────────────────────────────

  private aktywneKategorie() {
    return this.prisma.category.findMany({
      where: { active: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });
  }

  private pctKategorii(c: WezelKategorii, cats: Kat[]) {
    const eff = efektywnyPctKategorii(c.id, cats);
    const zRodzica = efektywnyPctKategorii(c.parentId, cats);
    return {
      normPct: c.normPct ?? null,
      effectivePct: eff.pct,
      inherited: eff.zrodlo !== "wlasny",
      // Podpowiedź „gdybyś wyczyściła własne ustawienie, będzie tyle”.
      parentPct: zRodzica.pct,
    };
  }

  private produktDto(
    p: {
      id: string;
      name: string;
      last4: string | null;
      barcode: string | null;
      pricePln: unknown;
      categoryId: string;
      normPctOverride: number | null;
      active: boolean;
    },
    cats: Kat[],
  ) {
    const eff = efektywnyPctProduktu(p.normPctOverride, p.categoryId, cats);
    const cena = Number(p.pricePln ?? 0);
    return {
      id: p.id,
      name: p.name,
      last4: p.last4,
      barcode: p.barcode,
      active: p.active,
      pricePln: cena,
      normPctOverride: p.normPctOverride,
      effectivePct: eff.pct,
      inherited: p.normPctOverride == null,
      categoryPct: efektywnyPctKategorii(p.categoryId, cats).pct,
      // Ile ta sztuka dokłada do normy przy obecnym przeliczniku.
      normValuePln: wartoscPozycji(cena, eff.pct, 1),
    };
  }

  private async szukaj(q: string, cats: Kat[]) {
    const list = await this.prisma.product.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { last4: { contains: q } },
          { barcode: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: 60,
    });
    return list.map((p) => ({
      ...this.produktDto(p, cats),
      categoryPath: sciezkaKategorii(p.categoryId, cats)
        .map((c) => c.name)
        .join(" › "),
      categoryId: p.categoryId,
    }));
  }

  /** Liczba aktywnych produktów w kategorii wraz z całym jej poddrzewem. */
  private async liczbaProduktowWGalezi(cats: { id: string; parentId: string | null }[]) {
    const grupy = await this.prisma.product.groupBy({
      by: ["categoryId"],
      where: { active: true },
      _count: { _all: true },
    });
    const wlasne = new Map(grupy.map((g) => [g.categoryId, g._count._all]));
    const wGalezi = new Map<string, number>();
    const dzieci = new Map<string, string[]>();
    for (const c of cats) {
      if (!c.parentId) continue;
      dzieci.set(c.parentId, [...(dzieci.get(c.parentId) ?? []), c.id]);
    }
    const policz = (id: string, sciezka: Set<string>): number => {
      if (wGalezi.has(id)) return wGalezi.get(id)!;
      if (sciezka.has(id)) return 0; // ochrona przed zapętlonym drzewem
      sciezka.add(id);
      const suma =
        (wlasne.get(id) ?? 0) +
        (dzieci.get(id) ?? []).reduce((acc, childId) => acc + policz(childId, sciezka), 0);
      wGalezi.set(id, suma);
      return suma;
    };
    for (const c of cats) policz(c.id, new Set());
    return wGalezi;
  }
}
