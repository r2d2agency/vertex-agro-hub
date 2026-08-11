import {
  IsArray, IsBoolean, IsDateString, IsInt, IsNumber, IsOptional,
  IsString, IsUUID, MaxLength, Min,
} from 'class-validator';

// ============= Fuel =============
export class CreateFuelTankDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() farmId?: string;
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsString() fuelType?: string;
  @IsOptional() @IsNumber() capacity?: number;
  @IsOptional() @IsNumber() currentLevel?: number;
  @IsOptional() @IsNumber() minLevel?: number;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class CreateFuelMovementDto {
  @IsUUID() companyId!: string;
  @IsUUID() tankId!: string;
  @IsString() kind!: string; // entrada | saida | ajuste
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsNumber() @Min(0) liters!: number;
  @IsOptional() @IsNumber() unitCost?: number;
  @IsOptional() @IsNumber() totalCost?: number;
  @IsOptional() @IsString() supplier?: string;
  @IsOptional() @IsString() invoiceNumber?: string;
  @IsOptional() @IsUUID() machineId?: string;
  @IsOptional() @IsUUID() operatorId?: string;
  @IsOptional() @IsUUID() operationLogId?: string;
  @IsOptional() @IsNumber() hourmeter?: number;
  @IsOptional() @IsString() notes?: string;
}

// ============= Inventory =============
export class CreateInventoryItemDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsString() sku?: string;
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() currentStock?: number;
  @IsOptional() @IsNumber() minStock?: number;
  @IsOptional() @IsNumber() unitCost?: number;
  @IsOptional() @IsString() supplier?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() supplierCnpj?: string;
  @IsOptional() @IsString() supplierPhone?: string;
  @IsOptional() @IsString() supplierContact?: string;
  @IsOptional() @IsString() supplierAddress?: string;
}

export class CreateInventoryMovementDto {
  @IsUUID() companyId!: string;
  @IsUUID() itemId!: string;
  @IsString() kind!: string; // entrada | saida | ajuste
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsNumber() quantity!: number;
  @IsOptional() @IsNumber() unitCost?: number;
  @IsOptional() @IsNumber() totalCost?: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsUUID() machineId?: string;
  @IsOptional() @IsUUID() maintenanceOrderId?: string;
  @IsOptional() @IsString() supplier?: string;
  @IsOptional() @IsString() invoiceNumber?: string;
  @IsOptional() @IsString() notes?: string;
}

// ============= Maintenance =============
export class CreateMaintenanceOrderDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() machineId?: string;
  @IsOptional() @IsUUID() implementId?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() kind?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsDateString() openedAt?: string;
  @IsOptional() @IsDateString() scheduledFor?: string;
  @IsOptional() @IsDateString() startedAt?: string;
  @IsOptional() @IsDateString() finishedAt?: string;
  @IsOptional() @IsNumber() hourmeterAtOpen?: number;
  @IsOptional() @IsNumber() hourmeterAtClose?: number;
  @IsOptional() @IsUUID() reportedBy?: string;
  @IsOptional() @IsUUID() assignedTo?: string;
  @IsOptional() @IsString() supplier?: string;
  @IsString() description!: string;
  @IsOptional() @IsString() diagnosis?: string;
  @IsOptional() @IsString() solution?: string;
  @IsOptional() @IsNumber() laborCost?: number;
  @IsOptional() @IsNumber() partsCost?: number;
  @IsOptional() @IsNumber() totalCost?: number;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() notes?: string;
}

export class AddMaintenanceItemDto {
  @IsOptional() @IsUUID() inventoryItemId?: string;
  @IsOptional() @IsString() kind?: string;
  @IsString() description!: string;
  @IsNumber() quantity!: number;
  @IsOptional() @IsNumber() unitCost?: number;
  @IsOptional() @IsNumber() totalCost?: number;
  @IsOptional() @IsBoolean() consumeStock?: boolean;
}

// ============= Operation Log =============
export class CreateOperationLogDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsUUID() plotId?: string;
  @IsUUID() machineId!: string;
  @IsOptional() @IsUUID() implementId?: string;
  @IsOptional() @IsUUID() operatorId?: string;
  @IsOptional() @IsUUID() operationTypeId?: string;
  @IsDateString() startedAt!: string;
  @IsOptional() @IsDateString() finishedAt?: string;
  @IsOptional() @IsNumber() hourmeterStart?: number;
  @IsOptional() @IsNumber() hourmeterEnd?: number;
  @IsOptional() @IsNumber() fuelConsumed?: number;
  @IsOptional() @IsNumber() areaWorked?: number;
  @IsOptional() @IsNumber() distanceKm?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() status?: string;
}

// ============= Checklist =============
export class CreateChecklistDto {
  @IsUUID() companyId!: string;
  @IsUUID() machineId!: string;
  @IsOptional() @IsUUID() operatorId?: string;
  @IsOptional() @IsUUID() operationLogId?: string;
  @IsOptional() @IsString() kind?: string;
  @IsOptional() @IsDateString() performedAt?: string;
  @IsOptional() @IsNumber() hourmeter?: number;
  @IsOptional() @IsString() overallStatus?: string;
  @IsArray() items!: Array<{ label: string; status: string; notes?: string }>;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() photoUrl?: string;
}
