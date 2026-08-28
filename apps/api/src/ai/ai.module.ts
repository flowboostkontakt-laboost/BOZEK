import { Module } from "@nestjs/common";
import { AiService } from "./ai.service";
import { EmbeddingService } from "./embedding.service";
import { AiController } from "./ai.controller";

@Module({
  controllers: [AiController],
  providers: [AiService, EmbeddingService],
  exports: [AiService],
})
export class AiModule {}
