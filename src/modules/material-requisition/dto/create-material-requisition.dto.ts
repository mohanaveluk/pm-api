import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString,
  IsUUID, IsUrl, Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequisitionDocumentType, RequisitionLineSource } from '../enums/material-requisition.enums';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Optional text fields accept `null` as well as a string: on update, null is how
// a caller clears a value that was previously set (undefined means "unchanged").

export class RequisitionItemDto {
  @ApiProperty({ description: 'Material Master id — an active material of this organization' })
  @IsUUID()
  materialId: string;

  @ApiProperty({
    example: 200,
    description:
      'Quantity requested, in the material\'s unit. A line with no quantity or a quantity of 0 ' +
      'is ignored, not rejected.',
  })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(999_999_999_999)
  requestedQty?: number | null;

  @ApiPropertyOptional({ enum: RequisitionLineSource, default: RequisitionLineSource.MATERIAL_MASTER })
  @IsOptional() @IsEnum(RequisitionLineSource)
  source?: RequisitionLineSource;

  @ApiPropertyOptional({ example: 'MR 0012', nullable: true })
  @IsOptional() @IsString() @MaxLength(255)
  sourceReference?: string | null;
}

export class RequisitionDocumentDto {
  @ApiProperty({ enum: RequisitionDocumentType })
  @IsEnum(RequisitionDocumentType)
  documentType: RequisitionDocumentType;

  @ApiProperty({ example: 'Covering Document Template' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  documentName: string;

  @ApiProperty({ description: 'URL returned by POST /material-requisitions/documents/upload' })
  @IsUrl({ require_tld: false }, { message: 'documentUrl must be a URL address' })
  @MaxLength(1000)
  documentUrl: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(255)
  fileName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  mimeType?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsInt() @Min(0)
  fileSizeBytes?: number | null;
}

export class CreateMaterialRequisitionDto {
  // NOTE: `code` is absent by design — it is server-generated (0001, 0002, …).

  @ApiProperty({ description: 'Project — an open project of this organization. Its client is read from it.' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({
    description:
      'WBS / cost code of the chosen project. Its area, system, discipline, department, work ' +
      'package and activities are read from it. Required to submit.',
    nullable: true,
  })
  @IsOptional() @IsUUID()
  wbsCostCodeId?: string | null;

  @ApiPropertyOptional({ example: 'CAPEX - Equipment', nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  budgetHead?: string | null;

  @ApiPropertyOptional({
    example: '2026-11-15',
    description: 'Required on site (YYYY-MM-DD). Required to submit; not in the past.',
    nullable: true,
  })
  @IsOptional() @Matches(ISO_DATE, { message: 'requiredOnSiteDate must be a YYYY-MM-DD date' })
  requiredOnSiteDate?: string | null;

  @ApiPropertyOptional({
    example: 'MR-2026-0001',
    description: 'The requisition number used on paper. Leave out to use the generated code.',
    nullable: true,
  })
  @IsOptional() @IsString() @MaxLength(50)
  mrNumber?: string | null;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(100)
  mtoReference?: string | null;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(100)
  pidReference?: string | null;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(100)
  isometricReference?: string | null;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(100)
  areaUnit?: string | null;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(4000)
  remarks?: string | null;

  @ApiPropertyOptional({
    type: [RequisitionItemDto],
    description: 'The complete set of lines; the stored lines are replaced by it.',
  })
  @IsOptional() @IsArray() @ArrayMaxSize(1000) @ValidateNested({ each: true }) @Type(() => RequisitionItemDto)
  items?: RequisitionItemDto[];

  @ApiPropertyOptional({
    type: [RequisitionDocumentDto],
    description: 'The complete set of documents; the stored documents are replaced by it.',
  })
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => RequisitionDocumentDto)
  documents?: RequisitionDocumentDto[];

  @ApiPropertyOptional({
    default: false,
    description:
      'true saves and submits in one step — the requisition goes straight to Under Review. ' +
      'false (default) keeps it a draft.',
  })
  @IsOptional() @IsBoolean()
  submit?: boolean;
}
