import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Length, Matches, Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateMaterialCategoryDto {
  // NOTE: `code` is absent by design — it is server-generated as a
  // per-organization sequence starting at 0001. Supplying it has no effect.

  @ApiProperty({ example: 'Raw Material', description: 'Full category name (unique within organization)' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({ example: 'RM', description: 'Abbreviated display name (max 100 chars)' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  shortName?: string;

  @ApiPropertyOptional({
    example: 'Primary materials used for industrial construction and project execution',
    description: 'Detailed explanation of the category',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'Controls dropdown/UI ordering (default 0)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'System categories cannot be deleted. Set true for platform-seeded categories.',
  })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Whether the category is active (default true)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Standard material category per project charter' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  remarks?: string;
}
