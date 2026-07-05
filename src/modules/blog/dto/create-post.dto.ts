import {
  IsString, IsNotEmpty, IsArray, IsBoolean, IsOptional,
  IsIn, MaxLength, MinLength, IsInt, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
 
const CATEGORIES = ['guide','vote','party','survey','tips','news'] as const;
type Category = typeof CATEGORIES[number];
 
export class CreatePostDto {
  @ApiProperty({ description: 'Blog post title', example: 'How to Create Your First Election Survey' })
  @IsString() @IsNotEmpty() @MaxLength(300)
  title: string;
 
  @ApiProperty({ description: '2–3 sentence teaser shown on the card', example: 'A complete guide to...' })
  @IsString() @IsNotEmpty() @MaxLength(600)
  excerpt: string;
 
  @ApiProperty({ description: 'Full HTML content of the article' })
  @IsString() @IsNotEmpty() @MinLength(50)
  content_html: string;
 
  @ApiProperty({ enum: CATEGORIES, description: 'Post category' })
  @IsIn(CATEGORIES)
  category: Category;
 
  @ApiProperty({ example: ['election','survey','tutorial'] })
  @IsArray() @IsString({ each: true })
  @Transform(({ value }) => typeof value === 'string' ? value.split(',').map((t: string) => t.trim()) : value)
  tags: string[];
 
  // Author (taken from JWT in production; passed manually in dev)
  @ApiPropertyOptional({ example: 'Priya Nair' })
  @IsOptional() @IsString() @MaxLength(100)
  author_name?: string;
 
  @ApiPropertyOptional({ example: 'Platform Lead' })
  @IsOptional() @IsString() @MaxLength(100)
  author_role?: string;
 
  @ApiPropertyOptional({ default: 5 })
  @IsOptional() @IsInt() @Min(1) @Max(60)
  read_time?: number;
 
  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  featured?: boolean;
 
  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  trending?: boolean;
}