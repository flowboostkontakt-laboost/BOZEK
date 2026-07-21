import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { AttendanceType } from "@prisma/client";

export class CreateEmployeeDto {
  @IsString() @MaxLength(60) name!: string;
  @IsNumber() baseNormPln!: number;
  @IsOptional() @IsNumber() defaultHours?: number;
  @IsString() @MaxLength(40) login!: string;
  @IsString() @MaxLength(72) password!: string;
  @IsOptional() @IsInt() @Min(0) @Max(366) vacationDaysPerYear?: number;
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() @MaxLength(60) name?: string;
  @IsOptional() @IsString() @MaxLength(40) login?: string;
  // Reset hasła. Puste/pominięte = bez zmiany hasła.
  @IsOptional() @IsString() @MaxLength(72) password?: string;
  @IsOptional() @IsNumber() baseNormPln?: number;
  @IsOptional() @IsNumber() defaultHours?: number;
  @IsOptional() @IsInt() @Min(0) @Max(366) vacationDaysPerYear?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateCategoryDto {
  @IsInt() @Min(0) @Max(1000) normPct!: number;
}

export class ProductOverrideDto {
  @IsOptional() @IsInt() @Min(0) @Max(1000) normPctOverride?: number | null;
}

export class ApproveReviewDto {
  @IsNumber() normValuePln!: number;
}

export class AttendanceDto {
  @IsString() employeeId!: string;
  @IsDateString() date!: string;
  @IsEnum(AttendanceType) type!: AttendanceType;
  @IsOptional() @IsNumber() hours?: number;
}

export class BonusTierDto {
  @IsInt() @Min(0) thresholdPct!: number;
  @IsNumber() amountPln!: number;
  @IsOptional() @IsString() @MaxLength(60) label?: string;
  /** Próg indywidualny pracownicy. Pominięte/null = próg domyślny dla wszystkich. */
  @IsOptional() @IsString() employeeId?: string | null;
}
