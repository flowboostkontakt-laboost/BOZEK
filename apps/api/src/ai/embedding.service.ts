import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { odczytajWektorZOdpowiedzi } from "@sep/shared";
import { createHash } from "crypto";

/**
 * Zamiana zdjęcia na wektor (embedding).
 *
 * Dostawcy (`AI_PROVIDER`):
 *  • `gemini` — Google AI Studio / Gemini API, model multimodalny
 *               (`gemini-embedding-2`). Zwykły klucz API, bez projektu w GCP.
 *               DOMYŚLNY wybór: najtaniej i najprościej się zaczyna.
 *  • `cohere` — Cohere Embed (`/v1/embed`, `input_type: image`).
 *  • `local`  — deterministyczny STUB (hash → wektor). NIE rozpoznaje niczego,
 *               służy tylko do uruchomienia pipeline'u bez klucza. Przy nim
 *               moduł zgłasza się jako wyłączony, żeby nikt nie wziął losowych
 *               liczb za działające rozpoznawanie.
 *
 * OpenAI celowo nie ma na liście: nie udostępnia embeddingów obrazu
 * (`text-embedding-3-*` są tekstowe), a modele vision zwracają opis, nie wektor.
 *
 * Adres i model da się nadpisać (`AI_EMBED_URL`, `AI_EMBED_MODEL`), a odczyt
 * odpowiedzi obsługuje kilka znanych kształtów — zmiana dostawcy na zgodnego
 * (Jina, Voyage) nie wymaga zmiany kodu.
 */
@Injectable()
export class EmbeddingService {
  private readonly log = new Logger("AI/Embedding");

  constructor(private readonly config: ConfigService) {}

  private get provider(): string {
    return (this.config.get<string>("AI_PROVIDER") ?? "local").trim().toLowerCase();
  }

  private get apiKey(): string {
    return (this.config.get<string>("AI_API_KEY") ?? "").trim();
  }

  private get model(): string {
    const wlasny = (this.config.get<string>("AI_EMBED_MODEL") ?? "").trim();
    if (wlasny) return wlasny;
    return this.provider === "cohere" ? "embed-v4.0" : "gemini-embedding-2";
  }

  /** Liczba wymiarów wektora. Mniej = mniejsza baza; jakość trzyma się do ~768. */
  private get wymiary(): number {
    const raw = Number(this.config.get<string>("AI_EMBED_DIM"));
    return Number.isFinite(raw) && raw >= 128 ? Math.floor(raw) : 768;
  }

  private get endpoint(): string {
    const wlasny = (this.config.get<string>("AI_EMBED_URL") ?? "").trim();
    if (wlasny) return wlasny;
    return this.provider === "cohere"
      ? "https://api.cohere.com/v1/embed"
      : `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent`;
  }

  /** Czy rozpoznawanie ze zdjęć jest realnie włączone (a nie na zaślepce). */
  isEnabled(): boolean {
    return this.provider !== "local" && this.apiKey.length > 0;
  }

  /** Opis konfiguracji do panelu admina — bez ujawniania klucza. */
  describe() {
    return {
      provider: this.provider,
      model: this.isEnabled() ? this.model : null,
      endpoint: this.isEnabled() ? this.endpoint : null,
      keyConfigured: this.apiKey.length > 0,
      enabled: this.isEnabled(),
    };
  }

  /**
   * Wektor dla zdjęcia. Rzuca wyjątkiem z treścią od dostawcy — komunikat
   * trafia do panelu admina, żeby dało się odróżnić zły klucz od limitu.
   */
  async embed(image: Buffer, mime = "image/jpeg"): Promise<number[]> {
    if (!this.isEnabled()) return this.pseudoEmbed(image);

    const gemini = this.provider !== "cohere";
    const base64 = image.toString("base64");

    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // Gemini uwierzytelnia się nagłówkiem x-goog-api-key (nie Bearerem),
        // dzięki czemu klucz nie ląduje w URL-u ani w logach serwera.
        ...(gemini ? { "x-goog-api-key": this.apiKey } : { Authorization: `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify(
        gemini
          ? {
              content: { parts: [{ inline_data: { mime_type: mime, data: base64 } }] },
              outputDimensionality: this.wymiary,
            }
          : {
              model: this.model,
              input_type: "image",
              embedding_types: ["float"],
              images: [`data:${mime};base64,${base64}`],
            },
      ),
    });

    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).trim().slice(0, 200);
      throw new Error(`API vision ${res.status}${detail ? ` — ${detail}` : ""}`);
    }

    const wektor = odczytajWektorZOdpowiedzi(await res.json());
    if (!wektor) {
      throw new Error("Dostawca zwrócił odpowiedź bez wektora — sprawdź AI_EMBED_MODEL i AI_EMBED_URL");
    }
    return wektor;
  }

  /** Pobranie zdjęcia produktu ze sklepu (publiczny URL storefrontu). */
  async pobierzZdjecie(url: string): Promise<{ buffer: Buffer; mime: string }> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Zdjęcie ${res.status} (${url})`);
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    if (!mime.startsWith("image/")) throw new Error(`Adres nie zwrócił obrazka, tylko ${mime}`);
    return { buffer: Buffer.from(await res.arrayBuffer()), mime };
  }

  /**
   * Zaślepka bez modelu: wektor z hasha pliku. Dwa różne zdjęcia tego samego
   * produktu dadzą zupełnie inne wektory, więc NIC się nie dopasuje — i o to
   * chodzi, dopóki nie ma klucza API.
   */
  private pseudoEmbed(image: Buffer): number[] {
    const seed = createHash("sha256").update(image).digest();
    const v = Array.from({ length: 512 }, (_, i) => (seed[i % seed.length] / 255) * 2 - 1);
    const norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
    this.log.debug("AI_PROVIDER=local — zwracam wektor zaślepki, dopasowanie nie zadziała");
    return v.map((x) => x / norm);
  }
}
