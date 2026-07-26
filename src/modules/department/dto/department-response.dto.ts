import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DepartmentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() dguid: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() shortName: string;
  @ApiPropertyOptional() description: string;
  @ApiProperty() displayOrder: number;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() remarks: string;
  @ApiProperty() createdBy: string;
  @ApiProperty() updatedBy: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class DepartmentListResponseDto {
  @ApiProperty({ type: [DepartmentResponseDto] }) items: DepartmentResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
