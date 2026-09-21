import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Length, Min,
} from 'class-validator';

export class CreateDisciplineDto {
  // NOTE: `code` is absent by design — it is server-generated as a
  // per-organization sequence starting at 0001. Supplying it has no effect.

  @ApiProperty({ example: 'Engineering', description: 'Full discipline name' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  name: string;

  @ApiProperty({ example: 'uuid-of-department', description: 'The single active department this discipline belongs to' })
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

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
