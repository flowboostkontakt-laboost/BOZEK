import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { EmbeddingService } from "./embedding.service";

interface MatchRow {
  id: string;
  name: string;
  categoryId: string;
  score: number;
}

/** Dopasowanie produktu ze zdjęcia: embedding → najbliższy sąsiad w pgvector. */
@Injectable()
export class AiService {
  private readonly log = new Logger("AI");

  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: EmbeddingService,
    private readonly config: ConfigService,
  ) {}

  private toVec(v: number[]): string {
    return `[${v.join(",")}]`;
  }

  async recognize(image: Buffer) {
    const emb = await this.embedding.embed(image);
    const vec = this.toVec(emb);

    const rows = await this.prisma.$queryRawUnsafe<MatchRow[]>(
      `SELECT p.id, p.name, p."categoryId", 1 - (p.embedding <=> $1::vector) AS score
       FROM "Product" p
       WHERE p.embedding IS NOT NULL AND p.active = true
       ORDER BY p.embedding <=> $1::vector
       LIMIT 1`,
      vec,
    );

    const threshold = Number(this.config.get<string>("AI_MATCH_THRESHOLD") ?? "0.78");
    const best = rows[0];

    // Poniżej progu pewności → sugerujemy kolejkę „Do sprawdzenia" (spec 4.2).
    if (!best || best.score < threshold) {
      return { matched: false, score: best?.score ?? 0, product: null, suggestReview: true };
    }

    const product = await this.prisma.product.findUnique({
      where: { id: best.id },
      include: { category: true },
    });
    return {
      matched: true,
      score: Number(best.score.toFixed(3)),
      product: product ? { id: product.id, name: product.name, category: product.category.name } : null,
      suggestReview: false,
    };
  }

  /** Liczy embeddingi dla produktów, które ich nie mają (po synchronizacji katalogu). */
  async reindex() {
    const products = await this.prisma.$queryRawUnsafe<{ id: string; photoUrl: string | null; name: string }[]>(
      `SELECT id, "photoUrl", name FROM "Product" WHERE embedding IS NULL`,
    );
    let indexed = 0;
    for (const p of products) {
      // (produkcja) pobierz zdjęcie z p.photoUrl i przekaż jego bajty do embed().
      const buf = Buffer.from(p.name, "utf8");
      const emb = await this.embedding.embed(buf);
      await this.prisma.$executeRawUnsafe(
        `UPDATE "Product" SET embedding = $1::vector WHERE id = $2`,
        this.toVec(emb),
        p.id,
      );
      indexed++;
    }
    this.log.log(`Zindeksowano ${indexed} produktów`);
    return { indexed };
  }
}
