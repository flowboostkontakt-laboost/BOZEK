import { Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
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
    if (!file) return { matched: false, score: 0, product: null, suggestReview: true };
    return this.ai.recognize(file.buffer);
  }

  /** Przeliczenie embeddingów katalogu (uruchamiane po synchronizacji). */
  @Roles(Role.ADMIN)
  @Post("admin/ai/reindex")
  reindex() {
    return this.ai.reindex();
  }
}
