import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Length, Matches, Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateMaterialGroupDto {
  @ApiProperty({
    example: 'uuid-material-category',
    description: 'Parent Material Category UUID. Immutable after creation.',
  })
  @IsUUID()
  @IsNotEmpty()
  materialCategoryId: string;

  @ApiProperty({
    example: 'STEEL',
    description:
      'Unique group code within the organization and category (1–30 chars, A-Z a-z 0-9 _ only). ' +
      'Immutable after creation — referenced by Material Master, PR, PO, and ERP integrations.',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 30)
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: 'code may only contain letters, digits, and underscores (no spaces, hyphens, or special characters)',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  code: string;

  @ApiProperty({ example: 'Steel Products', description: 'Full group name (unique within organization and category)' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({ example: 'Steel', description: 'Abbreviated display name (max 100 chars)' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  shortName?: string;

  @ApiPropertyOptional({
    example: 'All steel and ferrous metal products used in industrial construction',
    description: 'Detailed explanation of the group',
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
    description: 'System groups cannot be deleted. Set true for platform-seeded groups.',
  })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Whether the group is active (default true)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Standard material group per project charter' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  remarks?: string;
}
