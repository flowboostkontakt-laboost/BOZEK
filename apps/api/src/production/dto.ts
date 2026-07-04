import { IsEnum, IsInt, IsString, Min, MaxLength } from "class-validator";
import { EntryMethod } from "@prisma/client";

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
