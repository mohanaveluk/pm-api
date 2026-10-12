import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsISO31661Alpha2, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ProjectStatus } from '../enums/project.enums';

export const PROJECT_SORT_FIELDS = [
  'code', 'projectName', 'client', 'projectType', 'status',
  'startDate', 'endDate', 'createdAt', 'updatedAt',
] as const;

export class ProjectQueryDto {
  @ApiPropertyOptional({
    description:
      'Search by project number, name, client code or name, contract number, ' +
      'client project reference or site location',
  })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional() @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'Filter by client' })
  @IsOptional() @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filter by project type' })
  @IsOptional() @IsUUID()
  projectTypeId?: string;

  @ApiPropertyOptional({ description: 'Filter by project manager' })
  @IsOptional() @IsUUID()
  projectManagerId?: string;

  @ApiPropertyOptional({ description: 'Filter by project country (ISO alpha-2)' })
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value)) @IsISO31661Alpha2()
  countryCode?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: PROJECT_SORT_FIELDS, default: 'createdAt' })
  @IsOptional() @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional() @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
