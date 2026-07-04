import { Controller, Get, HttpCode, Post } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { SyncService } from "./sync.service";

@Controller("admin/sync")
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  /** Status ostatniej synchronizacji — badge „API Synchro" w panelu admina. */
  @Roles(Role.ADMIN)
  @Get("status")
  status() {
    return this.sync.status();
  }

  /** Ręczne wymuszenie synchronizacji („Wymuś Synchro Presta"). */
  @Roles(Role.ADMIN)
  @Post("run")
  @HttpCode(200)
  run() {
    return this.sync.run();
  }
}
