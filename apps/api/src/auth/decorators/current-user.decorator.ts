import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Role } from "@prisma/client";

export interface AuthUser {
  userId: string;
  role: Role;
  employeeId: string | null;
}

/** Wstrzykuje zalogowanego użytkownika (z tokenu JWT) do handlera. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
