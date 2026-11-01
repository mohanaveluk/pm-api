import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MaterialRequisitionStatus, RequisitionParticipantRole } from '../enums/material-requisition.enums';

export const MR_SORT_FIELDS = [
  'code', 'mrNumber', 'project', 'status', 'requiredOnSiteDate', 'createdAt', 'updatedAt',
] as const;

export class MaterialRequisitionQueryDto {
  @ApiPropertyOptional({ description: 'Search by MR number, code, project number or name, or client' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: MaterialRequisitionStatus })
  @IsOptional() @IsEnum(MaterialRequisitionStatus)
  status?: MaterialRequisitionStatus;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: MR_SORT_FIELDS, default: 'createdAt' })
  @IsOptional() @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional() @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

/** Search of the Material Master for the requisition's "select materials" step. */
/** "My reviews" / "My approvals": requisitions the signed-in user is assigned to. */
export class AssignedRequisitionQueryDto extends MaterialRequisitionQueryDto {
  @ApiPropertyOptional({
    description: 'true (default): only those still waiting for my decision in the current round',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === undefined ? undefined : value === true || value === 'true')
  @IsBoolean()
  pendingOnly?: boolean = true;
}

/** Internal participants as the service sees them. */
export interface AssignedFilter {
  userId: string;
  role: RequisitionParticipantRole;
  pendingOnly: boolean;
}

export class RequisitionMaterialQueryDto {
  @ApiPropertyOptional({ description: 'Material code or description' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  materialCategoryId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  materialGroupId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  unitOfMeasurementId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number = 25;
}

/** Other Projects source: projects whose requisitions can be copied from. */
export class SourceProjectsQueryDto {
  @ApiPropertyOptional({ description: 'The project of the requisition being written — left out of the list' })
  @IsOptional() @IsUUID()
  excludeProjectId?: string;

  @ApiPropertyOptional({ description: 'Project code or name, or client' })
  @IsOptional() @IsString() @MaxLength(200)
  search?: string;
}

export class ProjectItemsQueryDto {
  @ApiPropertyOptional() @IsUUID()
  projectId: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  wbsCostCodeId?: string;
}
