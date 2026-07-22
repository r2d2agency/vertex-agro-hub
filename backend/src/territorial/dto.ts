import { IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateRegionalDto {
  @IsUUID() companyId!: string;
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @MaxLength(120) manager?: string;
}

export class UpdateRegionalDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @MaxLength(120) manager?: string;
}

export class CreateFarmDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() regionalId?: string;
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(2) state?: string;
  @IsOptional() @IsNumber() totalAreaHa?: number;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() @MaxLength(200) owner?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateFarmDto {
  @IsOptional() @IsUUID() regionalId?: string | null;
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(2) state?: string;
  @IsOptional() @IsNumber() totalAreaHa?: number;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() @MaxLength(200) owner?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreatePlotDto {
  @IsUUID() companyId!: string;
  @IsUUID() farmId!: string;
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsNumber() areaHa?: number;
  @IsOptional() @IsString() @MaxLength(120) cloneName?: string;
  @IsOptional() @IsNumber() plantingYear?: number;
  @IsOptional() @IsNumber() treeCount?: number;
  @IsOptional() @IsString() @MaxLength(50) tappingSystem?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdatePlotDto {
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsNumber() areaHa?: number;
  @IsOptional() @IsString() @MaxLength(120) cloneName?: string;
  @IsOptional() @IsNumber() plantingYear?: number;
  @IsOptional() @IsNumber() treeCount?: number;
  @IsOptional() @IsString() @MaxLength(50) tappingSystem?: string;
  @IsOptional() @IsString() notes?: string;
}
