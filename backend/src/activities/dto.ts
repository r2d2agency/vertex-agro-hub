import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const OCC_TYPES = ['praga', 'doenca', 'clima', 'equipamento', 'seguranca', 'processo', 'outro'] as const;
const SEVERITIES = ['baixa', 'media', 'alta', 'critica'] as const;
const OCC_STATUS = ['aberta', 'em_andamento', 'resolvida', 'cancelada'] as const;

export class CreateOccurrenceDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsUUID() plotId?: string;
  @IsDateString() date!: string;
  @IsIn(OCC_TYPES as any) type!: string;
  @IsIn(SEVERITIES as any) severity!: string;
  @IsIn(OCC_STATUS as any) status!: string;
  @IsString() @MinLength(2) @MaxLength(200) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() responsible?: string;
}
export class UpdateOccurrenceDto {
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsUUID() plotId?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsIn(OCC_TYPES as any) type?: string;
  @IsOptional() @IsIn(SEVERITIES as any) severity?: string;
  @IsOptional() @IsIn(OCC_STATUS as any) status?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() responsible?: string;
}

const TASK_CAT = ['sangria', 'estimulacao', 'inspecao', 'manutencao', 'visita', 'outro'] as const;
const PRIORITIES = ['baixa', 'media', 'alta'] as const;
const TASK_STATUS = ['planejada', 'em_andamento', 'concluida', 'cancelada'] as const;

export class CreateTaskDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsUUID() plotId?: string;
  @IsOptional() @IsUUID() teamId?: string;
  @IsString() @MinLength(2) @MaxLength(200) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsIn(TASK_CAT as any) category!: string;
  @IsIn(PRIORITIES as any) priority!: string;
  @IsIn(TASK_STATUS as any) status!: string;
  @IsDateString() scheduledAt!: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsString() responsible?: string;
}
export class UpdateTaskDto {
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsUUID() plotId?: string;
  @IsOptional() @IsUUID() teamId?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(TASK_CAT as any) category?: string;
  @IsOptional() @IsIn(PRIORITIES as any) priority?: string;
  @IsOptional() @IsIn(TASK_STATUS as any) status?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsString() responsible?: string;
}
