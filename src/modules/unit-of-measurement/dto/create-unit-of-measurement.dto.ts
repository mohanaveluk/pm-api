import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional,
  IsString, Length, Matches, Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UomType } from '../enums/uom-type.enum';

export class CreateUnitOfMeasurementDto {
  // NOTE: `code` is absent by design — it is server-generated as a
  // per-organization sequence starting at 0001. Supplying it has no effect.

  @ApiProperty({ example: 'Kilogram', description: 'Full UOM name (unique within organization)' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({
    example: 'kg',
    description:
      'Display symbol shown in UI and printed documents (1–20 chars). ' +
      'May contain special characters: kg, L, m, yd, in, °C, m², ft³.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  symbol?: string;

  @ApiPropertyOptional({ example: 'Kg', description: 'Abbreviated display name (max 50 chars)' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  shortName?: string;

  @ApiPropertyOptional({
    example: 'Standard SI unit of mass used for bulk material procurement',
    description: 'Detailed explanation of the unit',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({
    enum: UomType,
    example: UomType.WEIGHT,
    description:
      'Measurement family this UOM belongs to. ' +
      'Used for filtering cascading dropdowns in Material Master and PR/PO forms.',
  })
  @IsOptional()
  @IsEnum(UomType)
  uomType?: UomType;

  @ApiPropertyOptional({ example: 1, description: 'Controls dropdown/UI ordering (default 0)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether the UOM is active (default true)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Standard SI unit per ISO 80000-1' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  remarks?: string;
}
