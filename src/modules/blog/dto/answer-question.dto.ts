//admin to user question dto
import {
  IsString, IsNotEmpty, IsArray, IsBoolean, IsOptional,
  IsIn, MaxLength, MinLength, IsInt, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

const CATEGORIES = ['guide','vote','party','survey','tips','news'] as const;
type Category = typeof CATEGORIES[number];

export class AnswerQuestionDto {
  @ApiProperty({ example: 'No. Once published, the party list is locked to protect result integrity.' })
  @IsString() @IsNotEmpty() @MinLength(10) @MaxLength(5000)
  answer: string;
 
  @ApiPropertyOptional({ example: 'Project Management Team' })
  @IsOptional() @IsString() @MaxLength(100)
  answeredBy?: string;
 
  @ApiPropertyOptional({ description: 'Whether to promote this Q&A to the public sidebar' })
  @IsOptional() @IsBoolean()
  promoteToPublic?: boolean;
 
  @ApiPropertyOptional({ example: 'survey' })
  @IsOptional() @IsIn(CATEGORIES)
  category?: string;
}