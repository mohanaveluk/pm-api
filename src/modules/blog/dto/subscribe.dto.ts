import {
  IsString, IsNotEmpty, IsArray, IsBoolean, IsOptional,
  IsIn, MaxLength, MinLength, IsInt, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

import { IsEmail } from 'class-validator';
 
export class SubscribeDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}