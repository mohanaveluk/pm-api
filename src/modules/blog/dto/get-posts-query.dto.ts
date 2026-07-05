import {
  IsString, IsNotEmpty, IsArray, IsBoolean, IsOptional,
  IsIn, MaxLength, MinLength, IsInt, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';
const SORT_OPTIONS = ['newest','popular','discussed','trending'] as const;

const CATEGORIES = ['guide','vote','party','survey','tips','news'] as const;
type Category = typeof CATEGORIES[number];

export class GetPostsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  page?: number = 1;
 
  @ApiPropertyOptional({ default: 10 })
  @IsOptional() @IsInt() @Min(1) @Max(50) @Type(() => Number)
  pageSize?: number = 10;
 
  @ApiPropertyOptional({ enum: CATEGORIES })
  @IsOptional() @IsIn([...CATEGORIES, 'all'])
  category?: string;
 
  @ApiPropertyOptional({ description: 'Full-text search term' })
  @IsOptional() @IsString() @MaxLength(200)
  search?: string;
 
  @ApiPropertyOptional({ enum: SORT_OPTIONS, default: 'newest' })
  @IsOptional() @IsIn(SORT_OPTIONS)
  sort?: string = 'newest';
}