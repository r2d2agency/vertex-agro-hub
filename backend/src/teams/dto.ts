import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateTeamDto {
  @IsUUID() companyId!: string;
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateTeamDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class AddMemberDto {
  @IsUUID() userId!: string;
  @IsOptional() @IsString() roleLabel?: string;
}

export class SetMembersDto {
  @IsArray() members!: AddMemberDto[];
}
