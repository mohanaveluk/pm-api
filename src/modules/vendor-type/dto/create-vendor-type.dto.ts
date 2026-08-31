import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Length, Min,
} from 'class-validator';

export class CreateVendorTypeDto {
  // NOTE: `code` is absent by design — it is server-generated as a
  // per-organization sequence starting at 0001. Supplying it has no effect.

  @ApiProperty({ example: 'Manufacturer', description: 'Full vendor type name' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  name: string;

  @ApiPropertyOptional({ example: 'MFR', description: 'Short display name (max 50 chars)' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  shortName?: string;

  @ApiPropertyOptional({ example: 'Produces the goods it supplies' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'Sort order for display' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether the vendor type is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Created during org setup' })
  @IsOptional()
  @IsString()
  remarks?: string;
}
