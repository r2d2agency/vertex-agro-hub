import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTappingRecordDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsUUID() plotId?: string;
  @IsOptional() @IsUUID() tappingTableId?: string;
  @IsDateString() date!: string;
  @IsString() @MaxLength(200) sangradorName!: string;
  @IsOptional() @IsInt() @Min(0) treesTapped?: number;
  @IsOptional() @IsNumber() liters?: number;
  @IsOptional() @IsNumber() drcPercent?: number;
  @IsOptional() @IsNumber() dryKg?: number;
  @IsOptional() @IsNumber() adherencePct?: number;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateTappingRecordDto {
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsUUID() plotId?: string;
  @IsOptional() @IsUUID() tappingTableId?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() @MaxLength(200) sangradorName?: string;
  @IsOptional() @IsInt() @Min(0) treesTapped?: number;
  @IsOptional() @IsNumber() liters?: number;
  @IsOptional() @IsNumber() drcPercent?: number;
  @IsOptional() @IsNumber() dryKg?: number;
  @IsOptional() @IsNumber() adherencePct?: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateDeliveryDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsString() @MaxLength(20) season?: string;
  @IsDateString() deliveryDate!: string;
  @IsOptional() @IsInt() @Min(0) turnDay?: number;
  @IsOptional() @IsString() @MaxLength(200) propertyName?: string;
  @IsOptional() @IsString() @MaxLength(200) ownerName?: string;
  @IsOptional() @IsString() @MaxLength(50) status?: string;
  @IsOptional() @IsString() @MaxLength(200) consultantName?: string;
  @IsOptional() @IsString() @MaxLength(200) monitorName?: string;
  @IsOptional() @IsString() @MaxLength(120) coagulant?: string;
  @IsOptional() @IsString() @MaxLength(20) latexType?: string;
  @IsOptional() @IsNumber() grossWeightKg?: number;
  @IsOptional() @IsNumber() netWeightKg?: number;
  @IsOptional() @IsNumber() drcAvgPercent?: number;
  @IsOptional() @IsNumber() dryKg?: number;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateDeliveryDto {
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsString() @MaxLength(20) season?: string;
  @IsOptional() @IsDateString() deliveryDate?: string;
  @IsOptional() @IsInt() @Min(0) turnDay?: number;
  @IsOptional() @IsString() @MaxLength(200) propertyName?: string;
  @IsOptional() @IsString() @MaxLength(200) ownerName?: string;
  @IsOptional() @IsString() @MaxLength(50) status?: string;
  @IsOptional() @IsString() @MaxLength(200) consultantName?: string;
  @IsOptional() @IsString() @MaxLength(200) monitorName?: string;
  @IsOptional() @IsString() @MaxLength(120) coagulant?: string;
  @IsOptional() @IsString() @MaxLength(20) latexType?: string;
  @IsOptional() @IsNumber() grossWeightKg?: number;
  @IsOptional() @IsNumber() netWeightKg?: number;
  @IsOptional() @IsNumber() drcAvgPercent?: number;
  @IsOptional() @IsNumber() dryKg?: number;
  @IsOptional() @IsString() notes?: string;
}
