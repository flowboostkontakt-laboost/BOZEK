import { Injectable, Logger } from "@nestjs/common";

/**
 * Dopasowanie produktu ze zdjęcia (Wariant A).
 *
 * Wyszukiwanie po embeddingach wymaga rozszerzenia pgvector w bazie. Na środowiskach,
 * gdzie pgvector nie jest dostępny, zdjęcie kierujemy do kolejki „Do sprawdzenia"
 * (admin wycenia ręcznie). Po włączeniu pgvector wystarczy przywrócić kolumnę
 * `embedding` w schemacie i logikę nearest-neighbor.
 */
@Injectable()
export class AiService {
  private readonly log = new Logger("AI");

  async recognize(_image: Buffer) {
    return { matched: false, score: 0, product: null, suggestReview: true };
  }

  async reindex() {
    return { indexed: 0, note: "pgvector wyłączony — dopasowanie AI nieaktywne" };
  }
}
