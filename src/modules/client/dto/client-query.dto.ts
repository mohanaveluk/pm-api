import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsISO31661Alpha2, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ClientStatus } from '../enums/client.enums';

export const CLIENT_SORT_FIELDS = [
  'code', 'clientName', 'clientType', 'industryCategory',
  'countryCode', 'status', 'createdAt', 'updatedAt',
] as const;

export class ClientQueryDto {
  @ApiPropertyOptional({ description: 'Search by client code, name, display name or legal entity name' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by Client Type' })
  @IsOptional() @IsUUID()
  clientTypeId?: string;

  @ApiPropertyOptional({ description: 'Filter by Industry Category' })
  @IsOptional() @IsUUID()
  industryCategoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by country of registration (ISO alpha-2)' })
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value)) @IsISO31661Alpha2()
  countryCode?: string;

  @ApiPropertyOptional({ enum: ClientStatus })
  @IsOptional() @IsEnum(ClientStatus)
  status?: ClientStatus;

  @ApiPropertyOptional({ description: 'Only the subsidiaries of this client' })
  @IsOptional() @IsUUID()
  parentClientId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: CLIENT_SORT_FIELDS, default: 'createdAt' })
  @IsOptional() @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional() @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
