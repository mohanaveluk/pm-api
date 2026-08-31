import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString,
  IsUUID, MaxLength, Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateActivityDto {
  // NOTE: `code` is absent by design — it is server-generated as a
  // per-organization sequence starting at 0001. Supplying it has no effect.

  @ApiProperty({ example: 'uuid-dd', description: 'DepartmentDiscipline mapping UUID' })
  @IsUUID()
  @IsNotEmpty()
  departmentDisciplineId: string;

  @ApiProperty({ example: 'uuid-dept', description: 'Department UUID (must match the mapping)' })
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

  @ApiProperty({ example: 'uuid-disc', description: 'Discipline UUID (must match the mapping)' })
  @IsUUID()
  @IsNotEmpty()
  disciplineId: string;

  @ApiProperty({ example: 'Request for Quotation', description: 'Full activity name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({ example: 'RFQ', description: 'Short display name' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  shortName?: string;

  @ApiPropertyOptional({ example: 'Raises a formal quotation request to approved vendors' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'Sort order for display', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: 'Procurement', description: 'Module category / group' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  moduleGroup?: string;

  @ApiPropertyOptional({ example: 'request_quote', description: 'Material icon name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  icon?: string;

  @ApiPropertyOptional({ example: '/procurement/rfq', description: 'Angular route path' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  routeUrl?: string;

  @ApiPropertyOptional({ example: 'PROC_RFQ', description: 'Stable unique key for RBAC / menu / feature modules' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  featureKey?: string;

  @ApiPropertyOptional({ example: 'Standard RFQ workflow activity' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  remarks?: string;

  @ApiPropertyOptional({ example: false, description: 'System-defined activity (cannot be deleted)' })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Default activity for the mapping' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Bulk create ───────────────────────────────────────────────────────────────

export class BulkActivityItemDto {
  // `code` is server-generated per item, same sequence as single create.
  // Duplicate detection for bulk therefore keys on NAME, not code.

  @ApiProperty({ example: 'Request for Quotation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({ example: 'RFQ' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  shortName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  moduleGroup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  routeUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  featureKey?: string;
}

export class BulkCreateActivityDto {
  @ApiProperty({ example: 'uuid-dd', description: 'DepartmentDiscipline mapping UUID' })
  @IsUUID()
  @IsNotEmpty()
  departmentDisciplineId: string;

  @ApiProperty({ type: [BulkActivityItemDto], description: 'Activities to create under this mapping' })
  activities: BulkActivityItemDto[];
}
