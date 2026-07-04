import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SyncStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PrestashopClient } from "./prestashop.client";

@Injectable()
export class SyncService {
  private readonly log = new Logger("Sync");

  constructor(
    private readonly prisma: PrismaService,
    private readonly ps: PrestashopClient,
  ) {}

  /** Dobowa synchronizacja katalogu (spec 3) — domyślnie o 03:00. */
  @Cron("0 3 * * *")
  async scheduled(): Promise<void> {
    this.log.log("Start dobowej synchronizacji PrestaShop");
    try {
      await this.run();
    } catch (e) {
      this.log.error(`Synchronizacja nieudana: ${(e as Error).message}`);
    }
  }

  async run(): Promise<{ status: SyncStatus; count: number }> {
    const started = await this.prisma.syncLog.create({ data: { status: SyncStatus.RUNNING } });
    try {
      const [cats, prods] = await Promise.all([this.ps.fetchCategories(), this.ps.fetchProducts()]);

      const catMap = new Map<string, string>();
      for (const c of cats) {
        const rec = await this.prisma.category.upsert({
          where: { prestaId: c.id },
          update: { name: c.name },
          create: { prestaId: c.id, name: c.name, normPct: 100 },
        });
        catMap.set(c.id, rec.id);
      }

      let count = 0;
      for (const p of prods) {
        const categoryId =
          (p.categoryId && catMap.get(p.categoryId)) || (await this.fallbackCategory());
        await this.prisma.product.upsert({
          where: { prestaId: p.id },
          update: {
            name: p.name,
            pricePln: p.price.toFixed(2),
            barcode: p.barcode ?? null,
            active: p.active,
            categoryId,
            last4: p.id.slice(-4),
          },
          create: {
            prestaId: p.id,
            name: p.name,
            pricePln: p.price.toFixed(2),
            barcode: p.barcode ?? null,
            active: p.active,
            categoryId,
            last4: p.id.slice(-4),
          },
        });
        count++;
      }

      await this.prisma.syncLog.update({
        where: { id: started.id },
        data: { status: SyncStatus.SUCCESS, productsCount: count, finishedAt: new Date() },
      });
      this.log.log(`Synchronizacja OK — ${count} produktów`);
      return { status: SyncStatus.SUCCESS, count };
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
    };
  }

  private async fallbackCategory(): Promise<string> {
    const name = "Nieskategoryzowane";
    const existing = await this.prisma.category.findFirst({ where: { name } });
    if (existing) return existing.id;
    const created = await this.prisma.category.create({ data: { name, normPct: 100 } });
    return created.id;
  }
}

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s temu`;
  if (s < 3600) return `${Math.floor(s / 60)} min temu`;
  if (s < 86400) return `${Math.floor(s / 3600)} godz. temu`;
  return `${Math.floor(s / 86400)} dni temu`;
}
