import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";

export const EMBED_DIM = 512;

/**
 * Silnik embeddingów obrazu (Wariant A).
 *
 * Obecnie: deterministyczny STUB (hash → wektor znormalizowany L2) — pozwala uruchomić
 * cały pipeline dopasowania bez modelu. W PRODUKCJI podmień `embed()` na:
 *   • CLIP lokalnie: @xenova/transformers (Xenova/clip-vit-base-patch32), albo
 *   • zewnętrzne API vision (AI_PROVIDER=api, AI_API_KEY).
 * Wymiar wektora musi odpowiadać kolumnie vector(512) w schemacie Prisma.
 */
@Injectable()
export class EmbeddingService {
  constructor(private readonly config: ConfigService) {}

  async embed(image: Buffer): Promise<number[]> {
    const provider = this.config.get<string>("AI_PROVIDER") ?? "local";
    // if (provider === "api") return this.embedViaApi(image);
    void provider;
    return this.pseudoEmbed(image);
  }

  private pseudoEmbed(image: Buffer): number[] {
    const seed = createHash("sha256").update(image).digest();
    const v = new Array<number>(EMBED_DIM);
    for (let i = 0; i < EMBED_DIM; i++) {
      v[i] = (seed[i % seed.length] / 255) * 2 - 1;
    }
    const norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
    return v.map((x) => x / norm);
  }
}
