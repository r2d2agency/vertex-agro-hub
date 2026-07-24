import {
  IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength,
} from 'class-validator';

export class CreateStimulationDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsUUID() plotId?: string;
  @IsDateString() date!: string;
  @IsString() @MinLength(1) @MaxLength(120) product!: string;
  @IsOptional() @IsString() @MaxLength(60) concentration?: string;
  @IsOptional() @IsString() @MaxLength(60) method?: string;
  @IsOptional() @IsString() @MaxLength(200) applicator?: string;
  @IsOptional() @IsInt() @Min(0) treesStimulated?: number;
  @IsOptional() @IsNumber() doseMlPerTree?: number;
  @IsOptional() @IsNumber() areaHa?: number;
  @IsOptional() @IsString() @MaxLength(120) weather?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateStimulationDto {
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsUUID() plotId?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() @MaxLength(120) product?: string;
  @IsOptional() @IsString() @MaxLength(60) concentration?: string;
  @IsOptional() @IsString() @MaxLength(60) method?: string;
  @IsOptional() @IsString() @MaxLength(200) applicator?: string;
  @IsOptional() @IsInt() @Min(0) treesStimulated?: number;
  @IsOptional() @IsNumber() doseMlPerTree?: number;
  @IsOptional() @IsNumber() areaHa?: number;
  @IsOptional() @IsString() @MaxLength(120) weather?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreatePhotoDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsUUID() plotId?: string;
  @IsOptional() @IsDateString() takenAt?: string;
  @IsString() @MinLength(1) url!: string;
  @IsOptional() @IsString() thumbUrl?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsNumber() accuracyM?: number;
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional() @IsString() @MaxLength(500) caption?: string;
  @IsOptional() @IsString() @MaxLength(200) author?: string;
}

export class UpdatePhotoDto {
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsUUID() plotId?: string;
  @IsOptional() @IsDateString() takenAt?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional() @IsString() @MaxLength(500) caption?: string;
  @IsOptional() @IsString() @MaxLength(200) author?: string;
}
