import { Module } from "@nestjs/common";
import { SyncService } from "./sync.service";
import { SyncController } from "./sync.controller";
import { PrestashopClient } from "./prestashop.client";

@Module({
  controllers: [SyncController],
  providers: [SyncService, PrestashopClient],
  exports: [SyncService],
})
export class SyncModule {}
