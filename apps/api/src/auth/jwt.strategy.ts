import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { Role } from "@prisma/client";
import type { AuthUser } from "./decorators/current-user.decorator";

interface JwtPayload {
  sub: string;
  role: Role;
  employeeId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_ACCESS_SECRET") ?? "dev_access_secret",
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return { userId: payload.sub, role: payload.role, employeeId: payload.employeeId };
  }
}
