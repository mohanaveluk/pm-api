import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }) => (typeof value === 'string' ? value.trim() : value);

// All fields are optional — POST /vendors/:id/clone works with an empty body.
//
// They exist because three columns on the vendor are constrained to be unique
// within the organization, so a byte-for-byte copy would violate the module's
// own duplicate rules:
//
//   vendorName                 — unique per organization
//   businessRegistrationNumber — unique per organization + country
//   taxRegistrationNumber      — unique per organization + country
//
// Defaults when omitted: vendorName gets a " (Copy)" suffix (" (Copy 2)", … if
// that is taken), and the two statutory identifiers are left empty for the new
// legal entity to be filled in. Everything else is copied verbatim.
export class CloneVendorDto {
  @ApiPropertyOptional({
    example: 'ABC Engineering LLC — Qatar',
    description:
      'Name for the clone. Defaults to the source name with a " (Copy)" suffix, ' +
      'since vendor names must be unique within the organization.',
  })
  @IsOptional() @IsString() @Length(2, 255) @Transform(trim)
  vendorName?: string;

  @ApiPropertyOptional({
    example: 'CN-7654321',
    description:
      'Business registration number for the clone. Left empty when omitted — a ' +
      'registration number identifies one legal entity and cannot be shared.',
  })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  businessRegistrationNumber?: string;

  @ApiPropertyOptional({
    example: '100987654300003',
    description: 'Tax registration number for the clone. Left empty when omitted.',
  })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  taxRegistrationNumber?: string;
}
