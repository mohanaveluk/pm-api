import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Length, Min,
} from 'class-validator';

export class CreateDisciplineDto {
  @ApiProperty({ example: 'ENG', description: 'Unique code within the organization (max 20 chars)' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  code: string;

  @ApiProperty({ example: 'Engineering', description: 'Full discipline name' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  name: string;

  @ApiPropertyOptional({ example: 'Eng', description: 'Short display name (max 50 chars)' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  shortName?: string;

  @ApiPropertyOptional({ example: 'Handles all engineering activities' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'Sort order for display' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether the discipline is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Created during org setup' })
  @IsOptional()
  @IsString()
  remarks?: string;
}
