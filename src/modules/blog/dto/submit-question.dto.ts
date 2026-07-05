import {
  IsString, IsNotEmpty, IsArray, IsBoolean, IsOptional,
  IsIn, MaxLength, MinLength, IsInt, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SubmitQuestionDto {
  @ApiProperty({ example: 'Can I add a party after publishing a survey?' })
  @IsString() @IsNotEmpty() @MinLength(10) @MaxLength(500)
  question: string;
 
  @ApiPropertyOptional({ example: 'Sunita M.' })
  @IsOptional() @IsString() @MaxLength(100)
  askerName?: string;
 
  @ApiPropertyOptional({ example: 'sunita@example.com' })
  @IsOptional() @IsString()
  askerEmail?: string;
}