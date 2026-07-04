import { IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsString()
  @MinLength(3)
  login!: string;

  @IsString()
  @MinLength(4)
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}
