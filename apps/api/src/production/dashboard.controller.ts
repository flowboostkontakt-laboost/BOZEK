import { Controller, Get } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { DashboardService } from "./dashboard.service";

@Roles(Role.ADMIN)
@Controller("admin")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("dashboard")
  get() {
    return this.dashboard.build();
  }
}
