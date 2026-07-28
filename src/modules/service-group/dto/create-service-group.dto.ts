import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional,
  IsString, IsUUID, MaxLength, Min, ValidateNested, ArrayNotEmpty,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PermissionType } from '../enums/permission-type.enum';

// ── Activity + permissions line in the create request ────────────────────────

export class ActivityPermissionDto {
  @ApiProperty({ example: 'uuid-activity', description: 'Activity UUID' })
  @IsUUID()
  @IsNotEmpty()
  activityId: string;

  @ApiProperty({
    enum: PermissionType,
    isArray: true,
    example: ['VIEW', 'CREATE', 'MODIFY'],
    description: 'Permission types to grant for this activity',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(PermissionType, { each: true })
  permissions: PermissionType[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

// ── Main create DTO ───────────────────────────────────────────────────────────

export class CreateServiceGroupDto {
  @ApiProperty({ example: 'PROC-OFFICER', description: 'Unique, immutable code (auto-uppercased). Cannot be changed after creation.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  code: string;

  @ApiProperty({ example: 'Procurement Officer', description: 'Unique, immutable name. Cannot be changed after creation.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({ example: 'Grants procurement team access to vendor and material workflows' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({ example: 'Standard procurement role for site engineers', description: 'Internal remarks' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  remarks?: string;

  @ApiPropertyOptional({ example: false, description: 'Mark as default group for new users' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [ActivityPermissionDto],
    description: 'Activities and their permissions to include in this service group',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityPermissionDto)
  activities?: ActivityPermissionDto[];
}

// ── Clone DTO ─────────────────────────────────────────────────────────────────

export class CloneServiceGroupDto {
  @ApiProperty({ example: 'PROC-OFFICER-V2', description: 'New unique code for the cloned group' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  code: string;

  @ApiProperty({ example: 'Procurement Officer V2', description: 'New unique name for the cloned group' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;
}

// ── Copy permissions DTO ──────────────────────────────────────────────────────

export class CopyPermissionsDto {
  @ApiProperty({ example: 'uuid-source-sg', description: 'Source service group UUID to copy permissions from' })
  @IsUUID()
  @IsNotEmpty()
  sourceServiceGroupId: string;
}
