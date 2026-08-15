import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MaterialStatus }   from '../enums/material-status.enum';
import { CriticalityLevel } from '../enums/criticality-level.enum';

export class MaterialQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'shortDescription' })
  @IsOptional() @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], example: 'DESC' })
  @IsOptional() @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ example: 'pipe', description: 'Searches shortDescription, code, manufacturerName' })
  @IsOptional() @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ example: 'uuid-of-category' })
  @IsOptional() @IsString()
  materialCategoryId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-group' })
  @IsOptional() @IsString()
  materialGroupId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-uom' })
  @IsOptional() @IsString()
  unitOfMeasurementId?: string;

  @ApiPropertyOptional({ enum: MaterialStatus })
  @IsOptional() @IsEnum(MaterialStatus)
  status?: MaterialStatus;

  @ApiPropertyOptional({ enum: CriticalityLevel })
  @IsOptional() @IsEnum(CriticalityLevel)
  criticalityLevel?: CriticalityLevel;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isStockItem?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Filter by system-seeded materials' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ example: 'Tenaris' })
  @IsOptional() @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  manufacturerName?: string;
}
