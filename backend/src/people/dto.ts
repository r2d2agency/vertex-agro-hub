import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

const ROLES = [
  'admin_empresa',
  'gestor',
  'supervisor_regional',
  'monitor',
  'consultor',
  'consulta',
] as const;
export type CompanyRole = (typeof ROLES)[number];

export class InvitePersonDto {
  @IsUUID() companyId!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(2) fullName!: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsEnum(ROLES) role!: CompanyRole;
}

export class UpdatePersonRoleDto {
  @IsUUID() companyId!: string;
  @IsEnum(ROLES) role!: CompanyRole;
}
