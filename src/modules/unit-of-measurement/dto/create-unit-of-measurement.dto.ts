import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional,
  IsString, Length, Matches, Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UomType } from '../enums/uom-type.enum';

export class CreateUnitOfMeasurementDto {
  @ApiProperty({
    example: 'KG',
    description:
      'Unique UOM code within the organization (1–20 chars, A-Z a-z 0-9 _ only). ' +
      'Auto-uppercased. Referenced by Material Master, PR, PO, and Inventory — immutable after creation.',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: 'code may only contain letters, digits, and underscores (no spaces, hyphens, or special characters)',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  code: string;

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
