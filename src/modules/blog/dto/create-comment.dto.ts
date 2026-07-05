import {
  IsString, IsNotEmpty, IsArray, IsBoolean, IsOptional,
  IsIn, MaxLength, MinLength, IsInt, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
 

export class CreateCommentDto {
  @ApiProperty({ example: 'This was really helpful, thank you!' })
  @IsString() @IsNotEmpty() @MinLength(3) @MaxLength(2000)
  text: string;
 
  @ApiPropertyOptional({ example: 'Arjun P.' })
  @IsOptional() @IsString() @MaxLength(100)
  name?: string;
 
  @ApiPropertyOptional({ description: 'Parent comment UUID for replies' })
  @IsOptional() @IsString()
  parentId?: string;
}