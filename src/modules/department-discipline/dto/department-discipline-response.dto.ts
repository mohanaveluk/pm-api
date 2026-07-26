import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DepartmentDisciplineResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() dguid: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() departmentId: string;
  @ApiProperty() departmentName: string;
  @ApiPropertyOptional() departmentCode: string;
  @ApiProperty() disciplineId: string;
  @ApiProperty() disciplineName: string;
  @ApiPropertyOptional() disciplineCode: string;
  @ApiProperty() displayOrder: number;
  @ApiPropertyOptional() remarks: string;
  @ApiProperty() isDefault: boolean;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() createdBy: string;
  @ApiPropertyOptional() updatedBy: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class DisciplineInDepartmentDto {
  @ApiProperty() id: string;
  @ApiProperty() disciplineId: string;
  @ApiProperty() disciplineName: string;
  @ApiPropertyOptional() disciplineCode: string;
  @ApiProperty() displayOrder: number;
  @ApiProperty() isDefault: boolean;
  @ApiProperty() isActive: boolean;
}

export class DepartmentInDisciplineDto {
  @ApiProperty() id: string;
  @ApiProperty() departmentId: string;
  @ApiProperty() departmentName: string;
  @ApiPropertyOptional() departmentCode: string;
  @ApiProperty() displayOrder: number;
  @ApiProperty() isDefault: boolean;
  @ApiProperty() isActive: boolean;
}

export class DepartmentDisciplineListResponseDto {
  @ApiProperty({ type: [DepartmentDisciplineResponseDto] }) items: DepartmentDisciplineResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}

export class BulkCreateResultDto {
  @ApiProperty({ type: [DepartmentDisciplineResponseDto] }) created: DepartmentDisciplineResponseDto[];
  @ApiProperty() skipped: number;
  @ApiProperty({ description: 'Discipline IDs that were skipped (already mapped)' }) skippedIds: string[];
}
