import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { UomType } from '../enums/uom-type.enum';

export class UnitOfMeasurementQueryDto {
  @ApiPropertyOptional({ description: 'Search by code, name, symbol, or shortName' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UomType, description: 'Filter by UOM type / measurement family' })
  @IsOptional()
  @IsEnum(UomType)
  uomType?: UomType;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

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

  @ApiPropertyOptional({
    enum: ['name', 'code', 'uomType', 'displayOrder', 'createdAt'],
    default: 'displayOrder',
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'displayOrder';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'ASC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
