import { IsDateString, IsInt, IsNumber, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class CreateRegionalDto {
  @IsUUID() companyId!: string;
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @MaxLength(120) manager?: string;
  @IsOptional() @IsUUID() managerUserId?: string | null;
}

export class UpdateRegionalDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @MaxLength(120) manager?: string;
  @IsOptional() @IsUUID() managerUserId?: string | null;
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
  @IsOptional() @IsObject() boundary?: Record<string, unknown>;
  @IsOptional() @IsString({ each: true }) photoUrls?: string[];
  @IsOptional() @IsInt() @Min(0) checkinRadiusM?: number;
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
  @IsOptional() @IsObject() boundary?: Record<string, unknown> | null;
  @IsOptional() @IsString({ each: true }) photoUrls?: string[];
  @IsOptional() @IsInt() @Min(0) checkinRadiusM?: number | null;
}

export class UpdateOwnerDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(80) code?: string | null;
  @IsOptional() @IsString() @MaxLength(80) alternateCode?: string | null;
  @IsOptional() @IsString() @MaxLength(20) cpf?: string | null;
  @IsOptional() @IsString() @MaxLength(20) cnpjCpf?: string | null;
  @IsOptional() @IsString() @MaxLength(40) stateRegistration?: string | null;
  @IsOptional() @IsString() notes?: string | null;
}

export class CreateOwnerDocumentDto {
  @IsUUID() companyId!: string;
  @IsString() @MinLength(1) @MaxLength(60) kind!: string;
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(100) number?: string;
  @IsOptional() @IsString() fileUrl?: string;
  @IsOptional() @IsDateString() issuedAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
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
  @IsOptional() @IsObject() boundary?: Record<string, unknown>;
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
  @IsOptional() @IsObject() boundary?: Record<string, unknown> | null;
}
