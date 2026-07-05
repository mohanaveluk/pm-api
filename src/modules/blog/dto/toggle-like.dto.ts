import {
  IsString, IsNotEmpty, IsArray, IsBoolean, IsOptional,
  IsIn, MaxLength, MinLength, IsInt, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ToggleLikeDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  liked: boolean;
}