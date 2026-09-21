import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional, IsString, IsEmail, Length, IsArray, ArrayMaxSize, ValidateNested, IsUUID, IsNotEmpty, IsInt, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// One attached document, as the profile form holds it at Save time.
// `id` present = an existing row (its title/file may have changed);
// absent = newly attached. The URL comes from POST /organizations/documents/upload.
export class OrganizationDocumentInputDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() id?: string;
  @ApiPropertyOptional() @IsString() @IsNotEmpty() @Length(1, 255) title: string;
  @ApiPropertyOptional() @IsString() @IsNotEmpty() @Length(1, 1000) documentUrl: string;
  @ApiPropertyOptional() @IsString() @IsNotEmpty() @Length(1, 255) fileName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 100) mimeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) fileSizeBytes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}


export class UpdateOrganizationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 255) organizationName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 255) legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(7, 30) phoneNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 255) website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 255) addressLine1?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 255) addressLine2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 100) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 100) state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 100) country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 20)  postalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 50)  taxNumber?: string;

  @ApiPropertyOptional({
    type: [OrganizationDocumentInputDto],
    description:
      'The complete list of attached documents. Omit to leave documents untouched; ' +
      'send [] to remove them all. Rows not listed are deleted.',
  })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => OrganizationDocumentInputDto)
  documents?: OrganizationDocumentInputDto[];
}
