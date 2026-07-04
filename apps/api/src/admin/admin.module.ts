import { Module } from "@nestjs/common";
import { ProductionModule } from "../production/production.module";
import { EmployeesController } from "./employees.controller";
import { CatalogController } from "./catalog.controller";
import { ReviewController } from "./review.controller";
import { AttendanceController } from "./attendance.controller";
import { BonusController } from "./bonus.controller";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [ProductionModule], // udostępnia NormsService (premie)
  controllers: [
    EmployeesController,
    CatalogController,
    ReviewController,
    AttendanceController,
    BonusController,
    ReportsController,
  ],
  providers: [ReportsService],
})
export class AdminModule {}
