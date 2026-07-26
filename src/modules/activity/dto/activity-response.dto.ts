import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivityResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() dguid: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() departmentId: string;
  @ApiProperty() departmentName: string;
  @ApiPropertyOptional() departmentCode: string;
  @ApiProperty() disciplineId: string;
  @ApiProperty() disciplineName: string;
  @ApiPropertyOptional() disciplineCode: string;
  @ApiProperty() departmentDisciplineId: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() shortName: string;
  @ApiPropertyOptional() description: string;
  @ApiProperty() displayOrder: number;
  @ApiPropertyOptional() moduleGroup: string;
  @ApiPropertyOptional() icon: string;
  @ApiPropertyOptional() routeUrl: string;
  @ApiPropertyOptional() featureKey: string;
  @ApiPropertyOptional() remarks: string;
  @ApiProperty() isSystem: boolean;
  @ApiProperty() isDefault: boolean;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() createdBy: string;
  @ApiPropertyOptional() updatedBy: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class ActivityListResponseDto {
  @ApiProperty({ type: [ActivityResponseDto] }) items: ActivityResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}

export class BulkCreateActivityResultDto {
  @ApiProperty({ type: [ActivityResponseDto] }) created: ActivityResponseDto[];
  @ApiProperty() skipped: number;
  @ApiProperty({ description: 'Activity codes that were skipped (already exist)' }) skippedCodes: string[];
}

export class ActivityDropdownItemDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() shortName: string;
  @ApiPropertyOptional() moduleGroup: string;
  @ApiPropertyOptional() icon: string;
  @ApiPropertyOptional() routeUrl: string;
  @ApiPropertyOptional() featureKey: string;
  @ApiProperty() displayOrder: number;
}
