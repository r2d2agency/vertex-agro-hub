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

export class CreateTappingRecordDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsUUID() plotId?: string;
  @IsOptional() @IsUUID() tappingTableId?: string;
  @IsDateString() date!: string;
  @IsString() @MinLength(1) sangradorName!: string;
  @IsOptional() @IsInt() @Min(0) treesTapped?: number;
  @IsOptional() @IsNumber() liters?: number;
  @IsOptional() @IsNumber() drcPercent?: number;
  @IsOptional() @IsNumber() dryKg?: number;
  @IsOptional() @IsNumber() adherencePct?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() quality?: string;
  @IsOptional() @IsString() tableCondition?: string;
}

export class CreateProductionDeliveryDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsString() season?: string;
  @IsDateString() deliveryDate!: string;
  @IsOptional() @IsInt() turnDay?: number;
  @IsOptional() @IsString() propertyName?: string;
  @IsOptional() @IsString() ownerName?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() consultantName?: string;
  @IsOptional() @IsString() monitorName?: string;
  @IsOptional() @IsString() coagulant?: string;
  @IsOptional() @IsString() latexType?: string;
  @IsOptional() @IsNumber() grossWeightKg?: number;
  @IsOptional() @IsNumber() netWeightKg?: number;
  @IsOptional() @IsNumber() drcAvgPercent?: number;
  @IsOptional() @IsNumber() dryKg?: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateOccurrenceDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsUUID() plotId?: string;
  @IsDateString() date!: string;
  @IsString() type!: string;
  @IsString() severity!: string;
  @IsString() status!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() responsible?: string;
  @IsOptional() @IsDateString() resolvedAt?: string;
}

export class CreateScheduledTaskDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsUUID() plotId?: string;
  @IsString() category!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsDateString() scheduledAt!: string;
  @IsString() priority!: string;
  @IsString() status!: string;
}
