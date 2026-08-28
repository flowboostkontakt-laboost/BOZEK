import { IsDateString, IsEnum, IsInt, IsString, Min, MaxLength } from "class-validator";
import { AttendanceType, EntryMethod } from "@prisma/client";

export class CreateEntryDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsEnum(EntryMethod)
  method!: EntryMethod;
}

export class CreateTaskDto {
  @IsString()
  @MaxLength(500)
  label!: string;
}

/** Oznaczenie dnia w kalendarzu przez samą pracownicę (urlop/chorobowe/praca). */
export class WorkerAttendanceDto {
  @IsDateString()
  date!: string;

  @IsEnum(AttendanceType)
  type!: AttendanceType;
}

/**
 * Domknięcie zmiany, której pracownica nie zakończyła poprzedniego dnia.
 * Godzinę podaje sama — nie zgadujemy jej za nią, bo z tego liczą się nadgodziny.
 */
export class FinishForgottenShiftDto {
  @IsString()
  sessionId!: string;

  /** Moment zakończenia (ISO). Musi być tego samego dnia co start i po starcie. */
  @IsDateString()
  endedAt!: string;
}
