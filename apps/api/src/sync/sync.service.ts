import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SyncStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { menuKategorii, wybierzKategorie } from "@sep/shared";
import { PrestashopClient } from "./prestashop.client";

@Injectable()
export class SyncService implements OnApplicationBootstrap {
  private readonly log = new Logger("Sync");
  private bootstrapSyncStarted = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ps: PrestashopClient,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.bootstrapSyncStarted || !this.ps.isConfigured()) return;
    this.bootstrapSyncStarted = true;

    const [categories, products] = await Promise.all([
      this.prisma.category.count(),
      this.prisma.product.count(),
    ]);

    if (categories > 0 && products > 0) return;

    this.log.log("Local catalog is empty. Starting initial PrestaShop sync.");
    try {
      await this.run();
    } catch (e) {
      this.log.warn(`Initial sync failed: ${(e as Error).message}`);
    }
  }

  /** Daily catalog sync, default at 03:00. */
  @Cron("0 3 * * *")
  async scheduled(): Promise<void> {
    this.log.log("Starting scheduled PrestaShop sync");
    try {
      await this.run();
    } catch (e) {
      this.log.error(`Sync failed: ${(e as Error).message}`);
    }
  }

  /**
   * Pełna synchronizacja katalogu z menu sklepu.
   *
   * Reguły (uzgodnione z klientką):
   *  • bierzemy WYŁĄCZNIE aktywne kategorie z menu sklepu — bez korzenia
   *    („Root”, „Strona główna”) i bez gałęzi wyłączonych w PrestaShopie,
   *  • odwzorowujemy drzewo kategoria → podkategoria → … (id_parent),
   *  • nie pobieramy produktów nieaktywnych; gdy produkt zostanie w sklepie
   *    włączony, kolejna synchronizacja wciąga go do systemu,
   *  • nic nie kasujemy — to, co wypadło z menu, jest tylko wygaszane
   *    (`active = false`), bo do produktów przypięta jest historia ewidencji.
   */
  async run(): Promise<{ status: SyncStatus; count: number; message: string }> {
    if (!this.ps.isConfigured()) {
      throw new Error("Brak konfiguracji PrestaShop: ustaw PRESTASHOP_API_URL i PRESTASHOP_API_KEY");
    }

    const started = await this.prisma.syncLog.create({ data: { status: SyncStatus.RUNNING } });
    try {
      const [cats, prods] = await Promise.all([this.ps.fetchCategories(), this.ps.fetchProducts()]);

      const menu = menuKategorii(cats);
      if (menu.length === 0) {
        throw new Error(
          `Sklep nie zwrócił żadnej aktywnej kategorii menu (pobrano ${cats.length} kategorii) — katalog zostaje bez zmian.`,
        );
      }

      // Kategorie zapisujemy od korzenia w dół, żeby rodzic istniał przed dzieckiem.
      const catMap = new Map<string, string>(); // prestaId → id lokalne
      for (const c of menu) {
        const parentLocalId = (c.parentId && catMap.get(c.parentId)) || null;
        const rec = await this.prisma.category.upsert({
          where: { prestaId: c.id },
          // normPct celowo nietknięty — to ustawienie właścicielki, nie sklepu.
          update: { name: c.name, parentId: parentLocalId, position: c.position, active: true },
          create: {
            prestaId: c.id,
            name: c.name,
            parentId: parentLocalId,
            position: c.position,
            active: true,
            normPct: null,
          },
        });
        catMap.set(c.id, rec.id);
      }

      const depthOf = new Map(menu.map((c) => [c.id, c.depth]));
      let count = 0;
      let pominietoNieaktywne = 0;
      let pominietoPozaMenu = 0;
      const zaimportowane: string[] = [];

      for (const p of prods) {
        if (!p.active) {
          pominietoNieaktywne++;
          continue;
        }
        const prestaCatId = wybierzKategorie(p, catMap, depthOf);
        if (!prestaCatId) {
          pominietoPozaMenu++;
          continue;
        }
        const dane = {
          name: p.name,
          pricePln: p.price.toFixed(2),
          barcode: p.barcode ?? null,
          active: true,
          categoryId: catMap.get(prestaCatId)!,
          last4: p.id.slice(-4),
        };
        await this.prisma.product.upsert({
          where: { prestaId: p.id },
          update: dane,
          create: { prestaId: p.id, ...dane },
        });
        zaimportowane.push(p.id);
        count++;
      }

      // Zero pobranych produktów przy niepustym menu = coś jest nie tak po stronie
      // sklepu (albo z mapowaniem kategorii). Przerywamy PRZED wygaszaniem, żeby
      // nie wyczyścić katalogu, z którego pracownice właśnie korzystają.
      if (count === 0) {
        throw new Error(
          `Nie pobrano żadnego produktu (sklep zwrócił ${prods.length}: ${pominietoNieaktywne} nieaktywnych, ${pominietoPozaMenu} spoza menu) — katalog zostaje bez zmian.`,
        );
      }

      // Wygaszenie tego, czego nie ma już w menu (wyłączone w sklepie, usunięte,
      // albo pozostałości demo bez prestaId). Historia ewidencji zostaje nietknięta.
      const wygaszoneProdukty = await this.prisma.product.updateMany({
        where: { active: true, OR: [{ prestaId: null }, { prestaId: { notIn: zaimportowane } }] },
        data: { active: false },
      });
      const wygaszoneKategorie = await this.prisma.category.updateMany({
        where: { active: true, OR: [{ prestaId: null }, { prestaId: { notIn: [...catMap.keys()] } }] },
        data: { active: false },
      });

      const message = [
        `Menu sklepu: ${menu.length} kategorii, ${count} aktywnych produktów.`,
        `Pominięto ${pominietoNieaktywne} nieaktywnych i ${pominietoPozaMenu} spoza menu.`,
        wygaszoneProdukty.count || wygaszoneKategorie.count
          ? `Wygaszono ${wygaszoneProdukty.count} produktów i ${wygaszoneKategorie.count} kategorii.`
          : "",
      ]
        .filter(Boolean)
        .join(" ");

      await this.prisma.syncLog.update({
        where: { id: started.id },
        data: { status: SyncStatus.SUCCESS, productsCount: count, message, finishedAt: new Date() },
      });
      this.log.log(`Sync OK — ${message}`);
      return { status: SyncStatus.SUCCESS, count, message };
    } catch (e) {
      await this.prisma.syncLog.update({
        where: { id: started.id },
        data: { status: SyncStatus.FAILED, message: (e as Error).message, finishedAt: new Date() },
      });
      throw e;
    }
  }

  async status() {
    const last = await this.prisma.syncLog.findFirst({ orderBy: { startedAt: "desc" } });
    if (!last) return { status: "NONE", agoText: "brak", finishedAt: null };
    return {
      status: last.status,
      productsCount: last.productsCount,
      finishedAt: last.finishedAt,
      agoText: last.finishedAt ? timeAgo(last.finishedAt) : "w toku",
      message: last.message,
    };
  }
}

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s temu`;
  if (s < 3600) return `${Math.floor(s / 60)} min temu`;
  if (s < 86400) return `${Math.floor(s / 3600)} godz. temu`;
  return `${Math.floor(s / 86400)} dni temu`;
}
