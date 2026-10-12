import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export const WBS_COST_CODE_SORT_FIELDS = [
  'code', 'projectDetails', 'areaFacility', 'systemSubsystem',
  'discipline', 'project', 'workPackage', 'createdAt',
] as const;

export class WbsCostCodeQueryDto {
  @ApiPropertyOptional({
    description:
      'Search by code, project details, area / facility, system / sub-system, ' +
      'work package, activities or discipline name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by discipline' })
  @IsOptional()
  @IsUUID()
  disciplineId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: WBS_COST_CODE_SORT_FIELDS, default: 'code' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'code';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'ASC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
