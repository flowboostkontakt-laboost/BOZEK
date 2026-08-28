import { Body, Controller, Get, HttpCode, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Role } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { AiService } from "./ai.service";

interface UploadedImage {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

@Controller()
export class AiController {
  constructor(private readonly ai: AiService) {}

  /** Rozpoznanie produktu ze zdjęcia (Wariant A). Pole formularza: `photo`. */
  @Roles(Role.WORKER)
  @Post("worker/entries/recognize")
  @UseInterceptors(FileInterceptor("photo"))
  async recognize(@UploadedFile() file?: UploadedImage) {
    if (!file) {
      return { matched: false, score: 0, product: null, candidates: [], suggestReview: true, reason: "Brak zdjęcia." };
    }
    return this.ai.recognize(file.buffer, file.mimetype);
  }

  /** Stan modułu: dostawca, próg, ile zdjęć katalogu jest już przeliczonych. */
  @Roles(Role.ADMIN)
  @Get("admin/ai/status")
  status() {
    return this.ai.status();
  }

  /**
   * Przeliczenie zdjęć katalogu na wektory — partiami, bo każde zdjęcie to
   * płatne wywołanie API. Wielokrotne uruchomienie dokańcza resztę.
   */
  @Roles(Role.ADMIN)
  @Post("admin/ai/reindex")
  @HttpCode(200)
  reindex(@Body() body?: { limit?: number }) {
    const limit = Math.min(Math.max(Number(body?.limit) || 200, 1), 500);
    return this.ai.reindex(limit);
  }
}
