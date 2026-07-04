import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Oznacza endpoint jako publiczny (pomija globalny JwtAuthGuard) — np. /auth/login. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
