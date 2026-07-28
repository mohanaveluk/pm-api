import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionType } from '../enums/permission-type.enum';

// ── Granular permission item ──────────────────────────────────────────────────

export class ServiceGroupPermissionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: PermissionType }) permissionType: PermissionType;
  @ApiProperty() isAllowed: boolean;
}

// ── Activity row inside a service group response ──────────────────────────────

export class ServiceGroupActivityResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() activityId: string;
  @ApiProperty() activityCode: string;
  @ApiProperty() activityName: string;
  @ApiPropertyOptional() activityShortName: string;
  @ApiPropertyOptional() moduleGroup: string;
  @ApiPropertyOptional() icon: string;
  @ApiPropertyOptional() routeUrl: string;
  @ApiPropertyOptional() featureKey: string;
  @ApiProperty() displayOrder: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty({ type: [ServiceGroupPermissionResponseDto] }) permissions: ServiceGroupPermissionResponseDto[];
}

// ── Full service group ────────────────────────────────────────────────────────

export class ServiceGroupResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() dguid: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description: string;
  @ApiProperty() groupType: string;
  @ApiProperty() isSystem: boolean;
  @ApiProperty() isDefault: boolean;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() remarks: string;
  @ApiPropertyOptional() createdBy: string;
  @ApiPropertyOptional() updatedBy: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: [ServiceGroupActivityResponseDto] }) activities: ServiceGroupActivityResponseDto[];
}

// ── Paginated list (activities omitted for performance) ───────────────────────

export class ServiceGroupListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() dguid: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description: string;
  @ApiProperty() groupType: string;
  @ApiProperty() isSystem: boolean;
  @ApiProperty() isDefault: boolean;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() remarks: string;
  @ApiProperty() activityCount: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class ServiceGroupListResponseDto {
  @ApiProperty({ type: [ServiceGroupListItemDto] }) items: ServiceGroupListItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}

// ── Permission matrix ─────────────────────────────────────────────────────────

export class PermissionMatrixRowDto {
  @ApiProperty() activityId: string;
  @ApiProperty() activityCode: string;
  @ApiProperty() activityName: string;
  @ApiPropertyOptional() moduleGroup: string;
  @ApiProperty({ description: 'Map of PermissionType → isAllowed' })
  permissions: Record<PermissionType, boolean>;
}

export class PermissionMatrixDto {
  @ApiProperty() serviceGroupId: string;
  @ApiProperty() serviceGroupName: string;
  @ApiProperty({ type: [String], enum: PermissionType })
  columns: PermissionType[];
  @ApiProperty({ type: [PermissionMatrixRowDto] }) rows: PermissionMatrixRowDto[];
}
