import {
  IsArray, IsBoolean, IsDateString, IsEmail, IsInt, IsNumber, IsOptional,
  IsString, IsUUID, MaxLength, Min,
} from 'class-validator';

export const MACHINE_CATEGORIES = [
  'trator', 'caminhao', 'carreta_motorizada', 'rocadeira', 'gerador',
  'pulverizador', 'maquina_agricola', 'veiculo_apoio', 'outro',
] as const;

export const MACHINE_STATUSES = [
  'disponivel', 'em_operacao', 'em_manutencao', 'parada', 'indisponivel', 'inativa',
] as const;

export const IMPLEMENT_CATEGORIES = [
  'carreta', 'grade', 'rocadeira_acoplada', 'tanque', 'pulverizador',
  'reboque', 'acoplavel', 'outro',
] as const;

export const IMPLEMENT_STATUSES = [
  'disponivel', 'em_uso', 'em_manutencao', 'inativo',
] as const;

export const OPERATOR_STATUSES = ['ativo', 'inativo', 'ferias', 'afastado'] as const;

export class CreateMachineDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() regionalId?: string;
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(80) patrimony?: string;
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsInt() year?: number;
  @IsOptional() @IsString() serial?: string;
  @IsOptional() @IsString() plate?: string;
  @IsOptional() @IsNumber() tankCapacity?: number;
  @IsOptional() @IsString() fuelType?: string;
  @IsOptional() @IsNumber() hourmeter?: number;
  @IsOptional() @IsString() hourmeterUnit?: string;
  @IsOptional() @IsUUID() defaultOperatorId?: string;
  @IsOptional() @IsUUID() monitorUserId?: string;
  @IsOptional() @IsDateString() acquisitionDate?: string;
  @IsOptional() @IsString() supplier?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() notes?: string;
}
export class UpdateMachineDto extends CreateMachineDto {
  declare companyId: string;
}

export class CreateImplementDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsUUID() machineId?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() patrimony?: string;
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsInt() year?: number;
  @IsOptional() @IsString() serial?: string;
  @IsOptional() @IsUUID() responsibleUserId?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateOperatorDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() farmId?: string;
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() cpf?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsUUID() monitorUserId?: string;
  @IsOptional() @IsString() cnhCategory?: string;
  @IsOptional() @IsDateString() cnhExpiresAt?: string;
  @IsOptional() @IsDateString() admissionDate?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsArray() authorizedCategories?: string[];
  @IsOptional() @IsString() notes?: string;
}

export class CreateOperationTypeDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsString() code?: string;
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsBoolean() requiresHourmeter?: boolean;
  @IsOptional() @IsBoolean() requiresOperator?: boolean;
  @IsOptional() @IsBoolean() requiresPhoto?: boolean;
  @IsOptional() @IsBoolean() requiresLocation?: boolean;
  @IsOptional() @IsBoolean() consumesFuel?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
}
