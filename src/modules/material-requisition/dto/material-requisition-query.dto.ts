import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MaterialRequisitionStatus } from '../enums/material-requisition.enums';

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

export class ProjectItemsQueryDto {
  @ApiPropertyOptional() @IsUUID()
  projectId: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  wbsCostCodeId?: string;
}
