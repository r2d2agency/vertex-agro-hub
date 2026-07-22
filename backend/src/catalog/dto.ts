import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateCloneDto {
  @IsUUID() companyId!: string;
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(120) origin?: string;
  @IsOptional() @IsString() @MaxLength(120) productivity?: string;
  @IsOptional() @IsString() @MaxLength(120) vigor?: string;
  @IsOptional() @IsString() @MaxLength(200) diseaseResistance?: string;
  @IsOptional() @IsString() @MaxLength(200) recommendedRegion?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateCloneDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(120) origin?: string;
  @IsOptional() @IsString() @MaxLength(120) productivity?: string;
  @IsOptional() @IsString() @MaxLength(120) vigor?: string;
  @IsOptional() @IsString() @MaxLength(200) diseaseResistance?: string;
  @IsOptional() @IsString() @MaxLength(200) recommendedRegion?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateTappingTableDto {
  @IsUUID() companyId!: string;
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(50) notation?: string;
  @IsOptional() @IsString() @MaxLength(50) cutType?: string;
  @IsOptional() @IsInt() @Min(0) frequencyDays?: number;
  @IsOptional() @IsInt() @Min(0) restDays?: number;
  @IsOptional() @IsInt() @Min(0) workDaysCycle?: number;
  @IsOptional() @IsString() @MaxLength(120) stimulation?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateTappingTableDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(50) notation?: string;
  @IsOptional() @IsString() @MaxLength(50) cutType?: string;
  @IsOptional() @IsInt() @Min(0) frequencyDays?: number;
  @IsOptional() @IsInt() @Min(0) restDays?: number;
  @IsOptional() @IsInt() @Min(0) workDaysCycle?: number;
  @IsOptional() @IsString() @MaxLength(120) stimulation?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
