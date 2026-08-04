import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  // Padnięta baza NIE może przewrócić startu serwera: rzucony błąd z $connect()
  // przerywał bootstrap i API w ogóle nie zaczynało nasłuchiwać — zero odpowiedzi
  // nawet na /api/health, więc z zewnątrz nie dało się odróżnić awarii bazy od
  // martwej usługi. Prisma łączy się leniwie przy pierwszym zapytaniu, więc gdy
  // baza wróci, API podniesie się samo bez restartu.
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Brak połączenia z bazą — API startuje w trybie awaryjnym, /api/health zwróci db:"down". ${msg}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
