import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min,
} from 'class-validator';

export class CreateDepartmentDisciplineDto {
  @ApiProperty({ example: 'uuid-dept', description: 'Department UUID' })
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

  @ApiProperty({ example: 'uuid-disc', description: 'Discipline UUID' })
  @IsUUID()
  @IsNotEmpty()
  disciplineId: string;

  @ApiPropertyOptional({ example: 1, description: 'Sort order for display' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: 'Mechanical discipline for Engineering dept' })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ example: false, description: 'Mark as default mapping for the department' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkCreateDepartmentDisciplineDto {
  @ApiProperty({ example: 'uuid-dept', description: 'Department UUID' })
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

  @ApiProperty({ example: ['uuid-disc-1', 'uuid-disc-2'], description: 'Array of Discipline UUIDs' })
  @IsUUID('all', { each: true })
  @IsNotEmpty()
  disciplineIds: string[];
}
