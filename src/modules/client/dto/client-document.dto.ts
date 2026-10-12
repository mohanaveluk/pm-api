import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, MaxLength, Min,
} from 'class-validator';
import { ClientDocumentType } from '../enums/client.enums';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class AddClientDocumentDto {
  @ApiProperty({ enum: ClientDocumentType })
  @IsEnum(ClientDocumentType)
  documentType: ClientDocumentType;

  @ApiProperty({ example: 'Master Services Agreement 2026' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  documentName: string;

  @ApiPropertyOptional({ example: 'MSA-2026-014', nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  documentNumber?: string | null;

  @ApiPropertyOptional({ example: '2026-01-15', description: 'ISO date (YYYY-MM-DD)', nullable: true })
  @IsOptional() @Matches(ISO_DATE, { message: 'issueDate must be a YYYY-MM-DD date' })
  issueDate?: string | null;

  @ApiPropertyOptional({ example: '2028-01-14', description: 'ISO date (YYYY-MM-DD)', nullable: true })
  @IsOptional() @Matches(ISO_DATE, { message: 'expiryDate must be a YYYY-MM-DD date' })
  expiryDate?: string | null;

  @ApiProperty({ description: 'URL returned by POST /clients/documents/upload' })
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

  @ApiPropertyOptional({ example: 'Rev B', description: "The document's own revision label", nullable: true })
  @IsOptional() @IsString() @MaxLength(30)
  documentVersion?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(2000)
  remarks?: string | null;
}
