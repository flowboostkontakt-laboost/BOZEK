import { Module } from "@nestjs/common";
import { SyncModule } from "../sync/sync.module";
import { NormsService } from "./norms.service";
import { DashboardService } from "./dashboard.service";
import { WorkerController } from "./worker.controller";
import { DashboardController } from "./dashboard.controller";

@Module({
  imports: [SyncModule],
  controllers: [WorkerController, DashboardController],
  providers: [NormsService, DashboardService],
  exports: [NormsService],
})
export class ProductionModule {}
