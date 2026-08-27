import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Length, Matches, Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateIndustryCategoryDto {
  @ApiProperty({
    example: 'CIV',
    description:
      'Unique industry category code within the organization (1–30 chars, A-Z a-z 0-9 _ only). ' +
      'Immutable after creation — referenced by Project, Department, Discipline, Activity, ' +
      'Material Category, Supplier, and ERP integrations.',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 30)
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: 'code may only contain letters, digits, and underscores (no spaces, hyphens, or special characters)',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  code: string;

  @ApiProperty({ example: 'Civil', description: 'Full industry category name (unique within organization)' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({ example: 'CIV', description: 'Abbreviated display name (max 100 chars)' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  shortName?: string;

  @ApiPropertyOptional({
    example:
      'Engineering and construction activities related to civil infrastructure, foundations, ' +
      'buildings, roads, structural works and related activities',
    description: 'Detailed explanation of the industry category',
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

  @ApiPropertyOptional({ example: 'Standard industry classification per project charter' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  remarks?: string;
}
