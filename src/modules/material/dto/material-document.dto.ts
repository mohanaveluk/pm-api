import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Length,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MaterialDocumentType } from '../enums/material-document-type.enum';

const trim = ({ value }) => (typeof value === 'string' ? value.trim() : value);

// ── Input: one document on create/update ───────────────────────────────────

export class MaterialDocumentInputDto {
  @ApiProperty({ enum: MaterialDocumentType, example: MaterialDocumentType.DATASHEET })
  @IsEnum(MaterialDocumentType)
  documentType: MaterialDocumentType;

  @ApiProperty({
    example: 'https://storage.example.com/datasheets/pipe-a106.pdf',
    description: 'URL only — upload the binary via POST /materials/specification/document first',
  })
  @IsString() @IsNotEmpty() @Length(1, 1000) @Transform(trim)
  documentUrl: string;

  @ApiPropertyOptional({ example: 'pipe-a106-datasheet.pdf' })
  @IsOptional() @IsString() @Length(1, 255) @Transform(trim)
  fileName?: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  mimeType?: string;

  @ApiPropertyOptional({ example: 'ASTM A106 Grade B datasheet, revision C' })
  @IsOptional() @IsString() @Length(1, 500) @Transform(trim)
  title?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional({ example: '2027-06-30' })
  @IsOptional() @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'Superseded by revision D pending approval' })
  @IsOptional() @IsString() @Transform(trim)
  remarks?: string;
}

// ── Input: add a document to an existing material ──────────────────────────

export class AddMaterialDocumentDto extends MaterialDocumentInputDto {
  @ApiPropertyOptional({
    example: 'uuid-of-the-document-being-replaced',
    description:
      'Supply to file this as a NEW VERSION of an existing document: the version number ' +
      'is incremented and the superseded row is deactivated but retained. ' +
      'Omit to add a brand-new document at version 1 (this is how a second photo is ' +
      'added alongside the first rather than replacing it).',
  })
  @IsOptional() @IsUUID()
  supersedesId?: string;
}

// ── Output ─────────────────────────────────────────────────────────────────

export class MaterialDocumentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() dguid: string;
  @ApiProperty() materialId: string;
  @ApiProperty({ enum: MaterialDocumentType }) documentType: MaterialDocumentType;
  @ApiProperty() documentUrl: string;
  @ApiPropertyOptional() fileName?: string;
  @ApiPropertyOptional() mimeType?: string;
  @ApiPropertyOptional() fileSizeBytes?: number;
  @ApiPropertyOptional() title?: string;
  @ApiProperty({ example: 2 }) version: number;
  @ApiPropertyOptional({ description: 'The document row this version replaced' }) supersedesId?: string;
  @ApiPropertyOptional() effectiveFrom?: Date;
  @ApiPropertyOptional() effectiveTo?: Date;
  @ApiPropertyOptional() expiryDate?: Date;
  @ApiProperty({ description: 'False once a newer version supersedes this row' }) isActive: boolean;
  @ApiProperty({ description: 'Derived: expiryDate is in the past' }) isExpired: boolean;
  @ApiPropertyOptional({ description: 'Derived: days until expiry (negative when expired)' }) daysToExpiry?: number;
  @ApiProperty({ description: 'True when migrated from a legacy flat URL column' }) isMigrated: boolean;
  @ApiPropertyOptional() remarks?: string;
  @ApiPropertyOptional() uploadedBy?: string;
  @ApiPropertyOptional() uploadedAt?: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

// ── Query ──────────────────────────────────────────────────────────────────

export class MaterialDocumentQueryDto {
  @ApiPropertyOptional({ enum: MaterialDocumentType, description: 'Filter by document type' })
  @IsOptional() @IsEnum(MaterialDocumentType)
  documentType?: MaterialDocumentType;

  @ApiPropertyOptional({
    example: false,
    description:
      'Include superseded versions. Defaults to false, which returns only the current ' +
      'active document of each chain.',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeSuperseded?: boolean = false;
}

// ── Purchase-order lock ────────────────────────────────────────────────────

export class MarkPurchaseOrderIssuedDto {
  @ApiProperty({
    example: 'PO-2026-0451',
    description: 'Reference of the purchase order that locks this material. Reported in the 409 on later edits.',
  })
  @IsString() @IsNotEmpty() @Length(1, 100) @Transform(trim)
  purchaseOrderReference: string;
}
