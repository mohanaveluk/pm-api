import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { CreateServiceGroupDto } from './create-service-group.dto';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ActivityPermissionDto } from './create-service-group.dto';

// Code and name are permanently immutable — omit them from update
export class UpdateServiceGroupDto extends PartialType(
  OmitType(CreateServiceGroupDto, ['code', 'name'] as const),
) {
  @ApiPropertyOptional({ description: 'Full replacement of activities and permissions. Omit to leave unchanged.' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityPermissionDto)
  activities?: ActivityPermissionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
