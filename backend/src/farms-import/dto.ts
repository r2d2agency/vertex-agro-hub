import { Type } from 'class-transformer';
import {
  IsIn, IsInt, IsOptional, IsString, IsUUID, ValidateNested,
} from 'class-validator';

// Uma linha da planilha, já depois do mapeamento de colunas feito no
// frontend — os valores ainda são texto cru, toda a validação/normalização
// acontece no servidor (fonte única entre preview e commit).
export class ImportFarmRowRawDto {
  @IsInt() rowIndex!: number;

  @IsOptional() @IsString() supplierCode?: string;      // Código do Fornecedor -> Farm.code
  @IsOptional() @IsString() ownerLegalName?: string;     // Razão social -> Owner.name
  @IsOptional() @IsString() ownerCode?: string;          // Código do proprietário -> Owner.code
  @IsOptional() @IsString() farmName?: string;           // Nome da propriedade -> Farm.name
  @IsOptional() @IsString() regimeRaw?: string;          // Proprietário/Parceiro -> Farm.regime
  @IsOptional() @IsString() ownerAlternateCode?: string; // Código alternativo -> Owner.alternateCode
  @IsOptional() @IsString() cpf?: string;
  @IsOptional() @IsString() stateRegistration?: string;  // Inscrição estadual
  @IsOptional() @IsString() cnpjCpf?: string;
  @IsOptional() @IsString() coordinates?: string;        // Coordenadas geográficas
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() buyer1Code?: string;
  @IsOptional() @IsString() buyer1Name?: string;
  @IsOptional() @IsString() buyer2Code?: string;
  @IsOptional() @IsString() buyer2Name?: string;
  @IsOptional() @IsString() monitor1Name?: string;
  @IsOptional() @IsString() monitor2Name?: string;
}

export class MonitorResolutionDto {
  @IsInt() rowIndex!: number;
  @IsIn([1, 2]) slot!: 1 | 2;
  @IsIn(['use', 'create', 'skip']) action!: 'use' | 'create' | 'skip';
  @IsOptional() @IsUUID() userId?: string; // obrigatório na prática quando action === 'use'
}

export class PreviewImportDto {
  @IsUUID() companyId!: string;
  @ValidateNested({ each: true })
  @Type(() => ImportFarmRowRawDto)
  rows!: ImportFarmRowRawDto[];
}

export class CommitImportDto extends PreviewImportDto {
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MonitorResolutionDto)
  resolutions?: MonitorResolutionDto[];

  @IsOptional() @IsInt({ each: true }) skipRowIndexes?: number[];
}
