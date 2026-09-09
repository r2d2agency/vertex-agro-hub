import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateConsultationDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsUUID() plotId?: string;
  @IsOptional() @IsUUID() consultantId?: string;
  @IsDateString() conductedAt!: string;
  @IsOptional() @IsString() @MaxLength(60) sanitaryState?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) tappingQuality?: number;
  @IsOptional() @IsString() @MaxLength(200) sanitaryInspector?: string;
  @IsOptional() @IsBoolean() isThirdPartyInspector?: boolean;
  @IsOptional() @IsString() recommendations?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) photos?: string[];
}

export class JustifyMissedVisitDto {
  @IsUUID() companyId!: string;
  @IsUUID() farmId!: string;
  @IsString() @MinLength(3) reason!: string;
}

export class UpdateConsultationDto {
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsUUID() plotId?: string;
  @IsOptional() @IsUUID() consultantId?: string;
  @IsOptional() @IsDateString() conductedAt?: string;
  @IsOptional() @IsString() @MaxLength(60) sanitaryState?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) tappingQuality?: number;
  @IsOptional() @IsString() @MaxLength(200) sanitaryInspector?: string;
  @IsOptional() @IsBoolean() isThirdPartyInspector?: boolean;
  @IsOptional() @IsString() recommendations?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) photos?: string[];
}
