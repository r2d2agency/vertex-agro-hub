import {
  IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min, MinLength,
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

export class LookupTapperDto {
  @IsUUID() companyId!: string;
  @IsString() @MinLength(11) cpf!: string;
}

export class UpsertTapperDto extends CreateTapperDto {
  @IsOptional() @IsString() @MinLength(2) declare fullName: string;
  @IsString() @MinLength(11) declare cpf: string;
  /** Vincula automaticamente o sangrador a esta fazenda ao confirmar a ficha. */
  @IsOptional() @IsUUID() farmId?: string;
  @IsOptional() @IsDateString() stintStartAt?: string;
}

export const PRE_REGISTRATION_ROLES = ['sangrador', 'monitor', 'operador'] as const;

export class CreateTapperPreRegistrationDto {
  @IsUUID() companyId!: string;
  @IsUUID() farmId!: string;
  @IsOptional() @IsIn(PRE_REGISTRATION_ROLES) role?: string;
  @IsString() @MinLength(2) fullName!: string;
  @IsString() @MinLength(11) cpf!: string;
  @IsOptional() @IsString() rg?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() addressCity?: string;
  @IsOptional() @IsString() addressState?: string;
  @IsOptional() @IsString() contractType?: string;
  @IsOptional() @IsNumber() dailyRate?: number;
  @IsOptional() @IsInt() @Min(0) treesAssigned?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) taskPercent?: number;
  @IsOptional() @IsUUID() tappingTableId?: string;
  @IsString() @MinLength(1) rgPhotoUrl!: string;
  @IsString() @MinLength(1) cpfPhotoUrl!: string;
  @IsOptional() @IsString() notes?: string;
}

export class ReviewTapperPreRegistrationDto {
  @IsUUID() companyId!: string;
  @IsIn(['approved', 'rejected']) status!: 'approved' | 'rejected';
  @IsOptional() @IsUUID() personId?: string;
  @IsOptional() @IsString() reviewNotes?: string;
}

// tapperKey identifica o sangrador tanto pela ficha legada (Tapper.id, um
// UUID) quanto por um vínculo só de RH (FarmAssignment), nesse caso no
// formato "rh:<userId>" — mesmo padrão já usado em field.service.ts.
export class CreateTapperTableLinkDto {
  @IsUUID() companyId!: string;
  @IsString() @MinLength(3) tapperKey!: string;
  @IsUUID() tappingTableId!: string;
  @IsOptional() @IsInt() @Min(0) treeCount?: number;
  @IsOptional() @IsInt() @Min(0) frequencyDays?: number;
  @IsOptional() @IsInt() @Min(0) restDays?: number;
  @IsOptional() @IsInt() @Min(0) workDaysCycle?: number;
  @IsOptional() @IsString() cutType?: string;
  @IsOptional() @IsString() stimulation?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateTapperTableLinkDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsInt() @Min(0) treeCount?: number;
  @IsOptional() @IsInt() @Min(0) frequencyDays?: number;
  @IsOptional() @IsInt() @Min(0) restDays?: number;
  @IsOptional() @IsInt() @Min(0) workDaysCycle?: number;
  @IsOptional() @IsString() cutType?: string;
  @IsOptional() @IsString() stimulation?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() notes?: string;
}
