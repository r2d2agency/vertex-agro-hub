import {
  IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsNumber, IsOptional,
  IsString, IsUUID, Max, Min, MinLength,
} from 'class-validator';

const ROLES = [
  'admin_empresa',
  'gestor',
  'supervisor_regional',
  'monitor',
  'consultor',
  'consulta',
] as const;
export type CompanyRole = (typeof ROLES)[number];

const ASSIGNMENT_ROLES = ['consultor', 'monitor', 'sangrador'] as const;
export type AssignmentRole = (typeof ASSIGNMENT_ROLES)[number];

export class PersonalDataDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() cpf?: string;
  @IsOptional() @IsString() rg?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() maritalStatus?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() phoneAlt?: string;
  @IsOptional() @IsString() addressCep?: string;
  @IsOptional() @IsString() addressStreet?: string;
  @IsOptional() @IsString() addressNumber?: string;
  @IsOptional() @IsString() addressComplement?: string;
  @IsOptional() @IsString() addressDistrict?: string;
  @IsOptional() @IsString() addressCity?: string;
  @IsOptional() @IsString() addressState?: string;
  @IsOptional() @IsString() emergencyContactName?: string;
  @IsOptional() @IsString() emergencyContactPhone?: string;
}

export class EmploymentDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsString() employeeCode?: string;
  @IsOptional() @IsDateString() admissionDate?: string;
  @IsOptional() @IsDateString() terminationDate?: string;
  @IsOptional() @IsString() contractType?: string;
  @IsOptional() @IsNumber() salary?: number;
  @IsOptional() @IsString() pisNumber?: string;
  @IsOptional() @IsString() ctpsNumber?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankAgency?: string;
  @IsOptional() @IsString() bankAccount?: string;
  @IsOptional() @IsString() bankPixKey?: string;
  @IsOptional() @IsString() notes?: string;
}

export class DocumentDto {
  @IsOptional() @IsUUID() companyId?: string;
  @IsString() kind!: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() number?: string;
  @IsOptional() @IsString() fileUrl?: string;
  @IsOptional() @IsDateString() issuedAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsString() notes?: string;
}

export class InvitePersonDto extends PersonalDataDto {
  @IsUUID() companyId!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(2) declare fullName: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsEnum(ROLES) role!: CompanyRole;
}

export class UpdatePersonRoleDto {
  @IsUUID() companyId!: string;
  @IsEnum(ROLES) role!: CompanyRole;
}

export class ToggleActiveDto {
  @IsBoolean() active!: boolean;
  @IsOptional() @IsString() reason?: string;
}

export class CreateAssignmentDto {
  @IsUUID() companyId!: string;
  @IsUUID() farmId!: string;
  @IsEnum(ASSIGNMENT_ROLES) role!: AssignmentRole;
  @IsOptional() @IsUUID() consultorUserId?: string;
  @IsDateString() startAt!: string;
  @IsOptional() @IsString() notes?: string;
}

export class EndAssignmentDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsDateString() endAt?: string;
  @IsOptional() @IsString() endReason?: string;
}

export class CreateEvaluationDto {
  @IsUUID() companyId!: string;
  @IsDateString() ratedAt!: string;
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() notes?: string;
}
