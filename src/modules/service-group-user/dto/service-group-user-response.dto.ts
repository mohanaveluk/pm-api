import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentType } from '../enums/assignment-type.enum';

// ── Single assignment ──────────────────────────────────────────────────────

export class ServiceGroupUserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() dguid: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() serviceGroupId: string;
  @ApiProperty() serviceGroupCode: string;
  @ApiProperty() serviceGroupName: string;
  @ApiProperty() userId: string;
  @ApiProperty() userFullName: string;
  @ApiProperty() userEmail: string;
  @ApiPropertyOptional() userPosition: string;
  @ApiProperty({ enum: AssignmentType }) assignmentType: AssignmentType;
  @ApiPropertyOptional() effectiveFrom: Date;
  @ApiPropertyOptional() effectiveTo: Date;
  @ApiProperty() isPrimary: boolean;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() remarks: string;
  @ApiPropertyOptional() disabledAt: Date;
  @ApiPropertyOptional() disabledBy: string;
  @ApiProperty() createdBy: string;
  @ApiPropertyOptional() updatedBy: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

// ── User row inside a service-group → users response ─────────────────────

export class ServiceGroupMemberDto {
  @ApiProperty() assignmentId: string;
  @ApiProperty() userId: string;
  @ApiProperty() userFullName: string;
  @ApiProperty() userEmail: string;
  @ApiPropertyOptional() userPosition: string;
  @ApiProperty({ enum: AssignmentType }) assignmentType: AssignmentType;
  @ApiProperty() isPrimary: boolean;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() effectiveFrom: Date;
  @ApiPropertyOptional() effectiveTo: Date;
  @ApiProperty() createdAt: Date;
}

// ── User's service groups (with activity + permission counts) ─────────────

export class UserServiceGroupDto {
  @ApiProperty() assignmentId: string;
  @ApiProperty() serviceGroupId: string;
  @ApiProperty() serviceGroupCode: string;
  @ApiProperty() serviceGroupName: string;
  @ApiPropertyOptional() serviceGroupDescription: string;
  @ApiProperty() groupType: string;
  @ApiProperty({ enum: AssignmentType }) assignmentType: AssignmentType;
  @ApiProperty() isPrimary: boolean;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() effectiveFrom: Date;
  @ApiPropertyOptional() effectiveTo: Date;
  @ApiProperty() activityCount: number;
  @ApiProperty() createdAt: Date;
}

// ── Sync result ───────────────────────────────────────────────────────────

export class SyncResultDto {
  @ApiProperty({ description: 'Number of new assignments created' })  added: number;
  @ApiProperty({ description: 'Number of assignments soft-deleted' }) removed: number;
  @ApiProperty({ description: 'Previously disabled assignments re-enabled' }) reEnabled: number;
  @ApiProperty({ description: 'Assignments not touched' }) unchanged: number;
  @ApiProperty({ type: [ServiceGroupUserResponseDto] }) assignments: ServiceGroupUserResponseDto[];
}

// ── Batch operation result ────────────────────────────────────────────────

export class BulkOperationResultDto {
  @ApiProperty() succeeded: number;
  @ApiProperty() failed: number;
  @ApiProperty({ type: [String], description: 'IDs that could not be processed' }) failedIds: string[];
}

// ── Paginated list ────────────────────────────────────────────────────────

export class ServiceGroupUserListResponseDto {
  @ApiProperty({ type: [ServiceGroupUserResponseDto] }) items: ServiceGroupUserResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
