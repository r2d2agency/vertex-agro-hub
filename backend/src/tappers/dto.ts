import {
  IsBoolean, IsDateString, IsNumber, IsOptional, IsString, IsUUID, MinLength,
} from 'class-validator';

export class CreateTapperDto {
  @IsUUID() companyId!: string;
  @IsString() @MinLength(2) fullName!: string;
  @IsOptional() @IsString() nickname?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() cpf?: string;
  @IsOptional() @IsString() rg?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() addressCity?: string;
  @IsOptional() @IsString() addressState?: string;
  @IsOptional() @IsString() contractType?: string;
  @IsOptional() @IsDateString() admissionDate?: string;
  @IsOptional() @IsDateString() terminationDate?: string;
  @IsOptional() @IsNumber() dailyRate?: number;
  @IsOptional() @IsString() pisNumber?: string;
  @IsOptional() @IsString() bankPixKey?: string;
  @IsOptional() @IsString() emergencyContactName?: string;
  @IsOptional() @IsString() emergencyContactPhone?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateTapperDto extends CreateTapperDto {
  @IsOptional() @IsUUID() declare companyId: string;
  @IsOptional() @IsString() @MinLength(2) declare fullName: string;
  @IsOptional() @IsBoolean() isDeleted?: boolean;
}

export class CreateStintDto {
  @IsUUID() companyId!: string;
  @IsUUID() farmId!: string;
  @IsOptional() @IsUUID() plotId?: string;
  @IsDateString() startAt!: string;
  @IsOptional() @IsString() notes?: string;
}

export class EndStintDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsDateString() endAt?: string;
  @IsOptional() @IsString() endReason?: string;
}
