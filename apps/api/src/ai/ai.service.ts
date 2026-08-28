import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DOMYSLNY_PROG_AI, dopasujZdjecie, pewneDopasowanie } from "@sep/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EmbeddingService } from "./embedding.service";

/**
 * Rozpoznawanie produktu ze zdjęcia (Wariant A).
 *
 * Jak to działa: zdjęcia katalogowe ze sklepu są raz zamieniane na wektory
 * (`reindex`), a zdjęcie z telefonu porównujemy z nimi podobieństwem
 * kosinusowym. Przy ~1300 produktach liczy się to w pamięci w kilkanaście
 * milisekund, więc nie potrzebujemy pgvectora ani osobnej bazy wektorowej.
 *
 * ZASADA: AI tylko PROPONUJE. Poniżej progu (`AI_MATCH_THRESHOLD`) nie
 * proponujemy nic, a przy dwóch bliźniaczo podobnych produktach pytamy
 * pracownicę. Nigdy nie zapisujemy wpisu bez jej potwierdzenia.
 */
@Injectable()
export class AiService {
  private readonly log = new Logger("AI");

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingService,
    private readonly config: ConfigService,
  ) {}

  private get prog(): number {
    const raw = Number(this.config.get<string>("AI_MATCH_THRESHOLD"));
    return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : DOMYSLNY_PROG_AI;
  }

  async recognize(image: Buffer, mime?: string) {
    if (!this.embeddings.isEnabled()) {
      return {
        matched: false,
        score: 0,
        product: null,
        candidates: [],
        suggestReview: true,
        reason: "Rozpoznawanie ze zdjęć jest wyłączone (brak klucza AI_API_KEY).",
      };
    }

    const zaindeksowane = await this.prisma.product.findMany({
      where: { active: true, embeddedAt: { not: null } },
      select: { id: true, name: true, photoUrl: true, embedding: true, category: { select: { name: true } } },
    });
    if (zaindeksowane.length === 0) {
      return {
        matched: false,
        score: 0,
        product: null,
        candidates: [],
        suggestReview: true,
        reason: "Katalog nie ma jeszcze przeliczonych zdjęć — uruchom „Przelicz zdjęcia\" w panelu.",
      };
    }

    let wektor: number[];
    try {
      wektor = await this.embeddings.embed(image, mime);
    } catch (e) {
      this.log.warn(`Rozpoznanie nieudane: ${(e as Error).message}`);
      return {
        matched: false,
        score: 0,
        product: null,
        candidates: [],
        suggestReview: true,
        reason: `Nie udało się przetworzyć zdjęcia: ${(e as Error).message}`,
      };
    }

    const propozycje = dopasujZdjecie(wektor, zaindeksowane, this.prog);
    const pewna = pewneDopasowanie(propozycje);
    const opisz = (p: (typeof propozycje)[number]) => ({
      id: p.produkt.id,
      name: p.produkt.name,
      category: (p.produkt as { category?: { name: string } }).category?.name ?? "",
      photoUrl: (p.produkt as { photoUrl?: string | null }).photoUrl ?? null,
      score: Math.round(p.score * 100) / 100,
    });

    return {
      matched: propozycje.length > 0,
      score: propozycje[0]?.score ?? 0,
      // Produkt podpowiadamy tylko przy WYRAŹNEJ przewadze nad kolejnym trafieniem.
      product: pewna ? opisz(pewna) : null,
      candidates: propozycje.map(opisz),
      suggestReview: propozycje.length === 0,
      reason: propozycje.length === 0 ? "Żaden produkt z katalogu nie jest wystarczająco podobny." : null,
    };
  }

  /**
   * Przeliczenie zdjęć katalogu na wektory. Idzie partiami i pomija to, co już
   * policzone, więc można uruchamiać wielokrotnie — po przerwaniu dokańcza
   * resztę zamiast płacić drugi raz za te same zdjęcia.
   */
  async reindex(limit = 200) {
    if (!this.embeddings.isEnabled()) {
      return { indexed: 0, failed: 0, remaining: 0, note: "Brak konfiguracji: ustaw AI_PROVIDER i AI_API_KEY." };
    }

    const doZrobienia = await this.prisma.product.findMany({
      where: { active: true, embeddedAt: null, photoUrl: { not: null } },
      select: { id: true, name: true, photoUrl: true },
      take: limit,
    });

    let indexed = 0;
    let failed = 0;
    const bledy: string[] = [];

    for (const p of doZrobienia) {
      try {
        const { buffer, mime } = await this.embeddings.pobierzZdjecie(p.photoUrl!);
        const embedding = await this.embeddings.embed(buffer, mime);
        await this.prisma.product.update({
          where: { id: p.id },
          data: { embedding, embeddedAt: new Date() },
        });
        indexed++;
      } catch (e) {
        failed++;
        if (bledy.length < 3) bledy.push(`${p.name}: ${(e as Error).message}`);
      }
    }

    const remaining = await this.prisma.product.count({
      where: { active: true, embeddedAt: null, photoUrl: { not: null } },
    });
    this.log.log(`Reindex: +${indexed}, błędów ${failed}, zostało ${remaining}`);
    return {
      indexed,
      failed,
      remaining,
      note: bledy.length ? `Przykładowe błędy — ${bledy.join(" | ")}` : null,
    };
  }

  /** Stan modułu do panelu admina. */
  async status() {
    const [zdjecia, zaindeksowane, aktywne] = await Promise.all([
      this.prisma.product.count({ where: { active: true, photoUrl: { not: null } } }),
      this.prisma.product.count({ where: { active: true, embeddedAt: { not: null } } }),
      this.prisma.product.count({ where: { active: true } }),
    ]);
    return {
      ...this.embeddings.describe(),
      threshold: this.prog,
      products: aktywne,
      withPhoto: zdjecia,
      indexed: zaindeksowane,
      remaining: Math.max(0, zdjecia - zaindeksowane),
    };
  }
}
