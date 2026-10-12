import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectTypeResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() dguid: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() organizationName: string;
  @ApiProperty() organization?: {id: string, name?: string, code?: string};
  @ApiProperty({ example: '0001' }) code: string;
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

export class ProjectTypeListResponseDto {
  @ApiProperty({ type: [ProjectTypeResponseDto] }) items: ProjectTypeResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
