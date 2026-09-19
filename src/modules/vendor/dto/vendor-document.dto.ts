import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { VendorDocumentType } from '../enums/vendor-document-type.enum';
import { VendorDocumentDto } from './create-vendor.dto';

// ── Input: add a document to an existing vendor ─────────────────────────────

export class AddVendorDocumentDto extends VendorDocumentDto {
  @ApiPropertyOptional({
    example: 'uuid-of-the-document-being-replaced',
    description:
      'Supply to file this as a NEW VERSION of an existing document: the version number ' +
      'is incremented and the superseded row is deactivated but retained. ' +
      'Omit to add a brand-new document (this is how a second ISO certificate is added ' +
      'alongside the first rather than replacing it).',
  })
  @IsOptional() @IsUUID()
  supersedesId?: string;
}

// ── Query ─────────────────────────────────────────────────────────────────

export class VendorDocumentQueryDto {
  @ApiPropertyOptional({ enum: VendorDocumentType, description: 'Filter by document type' })
  @IsOptional() @IsEnum(VendorDocumentType)
  documentType?: VendorDocumentType;

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
