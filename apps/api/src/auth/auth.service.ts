import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

interface Tokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(login: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { login },
      include: { employee: true },
    });
    if (!user || !user.active) {
      throw new UnauthorizedException("Nieprawidłowy login lub hasło");
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Nieprawidłowy login lub hasło");

    const tokens = await this.issueTokens(user.id, user.role, user.employeeId);
    return {
      ...tokens,
      // Uwaga: żadnych danych finansowych w odpowiedzi (dyskrecja — spec 2.1).
      user: {
        id: user.id,
        login: user.login,
        role: user.role,
        employee: user.employee ? { id: user.employee.id, name: user.employee.name } : null,
      },
    };
  }

  async refresh(rawToken: string): Promise<Tokens> {
    const tokenHash = this.hash(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Sesja wygasła — zaloguj się ponownie");
    }
    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.active) throw new UnauthorizedException("Konto nieaktywne");

    // Rotacja z oknem łaski: stary refresh nie ginie od razu, tylko dogasa
    // po 60 s. Na słabym zasięgu (telefon w pracowni) odpowiedź z nową parą
    // tokenów potrafi nie dojść — ponowienie starym tokenem musi się jeszcze
    // udać, inaczej pracownica ląduje na ekranie logowania w środku pracy.
    // Twarde `revoked` zostaje dla wylogowania (logout unieważnia wszystko).
    const koniecLaski = Math.min(stored.expiresAt.getTime(), Date.now() + 60_000);
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { expiresAt: new Date(koniecLaski) },
    });
    return this.issueTokens(user.id, user.role, user.employeeId);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  // ─── helpers ────────────────────────────────────────────────────────

  private async issueTokens(
    userId: string,
    role: Role,
    employeeId: string | null,
  ): Promise<Tokens> {
    const accessTtl = this.accessTtlSeconds(role);
    const refreshTtl = this.refreshTtlSeconds(role);

    const accessToken = await this.jwt.signAsync(
      { sub: userId, role, employeeId },
      {
        secret: this.config.get<string>("JWT_ACCESS_SECRET") ?? "dev_access_secret",
        expiresIn: accessTtl,
      },
    );

    const rawRefresh = randomUUID() + randomUUID();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hash(rawRefresh),
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return { accessToken, refreshToken: rawRefresh, accessExpiresIn: accessTtl };
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  /**
   * Czas życia tokenu dostępowego. Bez skracania „do 18:00" — na życzenie
   * klientki (14.08.2026) twarde wylogowanie o tej godzinie zostało zdjęte:
   * wyrzucało pracownice w środku dodawania produktu, a przy nadgodzinach
   * (odrabianie godzin po 16:00) blokowało pracę. Sesja jest odnawiana cicho
   * przez /auth/refresh, wylogowanie zostaje ręczne (menu w apce).
   */
  private accessTtlSeconds(_role: Role): number {
    return 30 * 60;
  }

  private refreshTtlSeconds(_role: Role): number {
    return 7 * 24 * 3600;
  }
}
