import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto, RefreshDto } from "./dto/login.dto";
import { Public } from "./decorators/public.decorator";
import { CurrentUser, type AuthUser } from "./decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post("login")
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.login, dto.password);
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@CurrentUser() user: AuthUser) {
    await this.auth.logout(user.userId);
  }

  /** Profil zalogowanego użytkownika — bez żadnych danych finansowych. */
  @Get("me")
  async me(@CurrentUser() user: AuthUser) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: { employee: true },
    });
    return {
      id: dbUser?.id,
      login: dbUser?.login,
      role: dbUser?.role,
      employee: dbUser?.employee
        ? { id: dbUser.employee.id, name: dbUser.employee.name, avatarUrl: dbUser.employee.avatarUrl }
        : null,
    };
  }
}
