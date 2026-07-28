import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsNotEmpty,
  IsOptional, IsString, IsUUID, ValidateNested, ArrayNotEmpty,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AssignmentType } from '../enums/assignment-type.enum';

// ── Single user line within a batch request ────────────────────────────────

export class AssignUserItemDto {
  @ApiProperty({ example: 'uuid-user', description: 'User UUID' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({ example: true, description: 'Mark as primary Service Group for this user' })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: 'MANUAL', enum: AssignmentType })
  @IsOptional()
  @IsEnum(AssignmentType)
  assignmentType?: AssignmentType;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'Optional effective start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z', description: 'Optional effective end date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional({ example: 'Assigned during project kick-off' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  remarks?: string;
}

// ── Batch assign DTO ───────────────────────────────────────────────────────

export class CreateServiceGroupUserDto {
  @ApiProperty({ example: 'uuid-service-group', description: 'Service Group UUID' })
  @IsUUID()
  @IsNotEmpty()
  serviceGroupId: string;

  @ApiProperty({ type: [AssignUserItemDto], description: 'Users to assign to the service group' })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AssignUserItemDto)
  users: AssignUserItemDto[];
}

// ── Sync / update DTO (replaces the full membership for a service group) ──────

export class SyncServiceGroupUsersDto {
  @ApiProperty({
    type: [AssignUserItemDto],
    description: 'Complete target membership. Users missing from this list will be soft-removed.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignUserItemDto)
  users: AssignUserItemDto[];
}

// ── Bulk-status DTOs ───────────────────────────────────────────────────────

export class BulkAssignmentIdsDto {
  @ApiProperty({ example: ['uuid-1', 'uuid-2'], description: 'Assignment UUIDs to operate on' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  assignmentIds: string[];
}
