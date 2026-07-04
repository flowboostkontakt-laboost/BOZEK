import { Module } from "@nestjs/common";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";
import { EmbeddingService } from "./embedding.service";

@Module({
  controllers: [AiController],
  providers: [AiService, EmbeddingService],
  exports: [AiService],
})
export class AiModule {}
