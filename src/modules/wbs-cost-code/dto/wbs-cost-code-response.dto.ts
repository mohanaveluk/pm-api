import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WbsCostCodeResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() dguid: string;
  @ApiProperty() organizationId: string;
  @ApiProperty({ example: '0001' }) code: string;
  @ApiProperty() projectDetails: string;
  @ApiPropertyOptional() areaFacility: string | null;
  @ApiPropertyOptional() systemSubsystem: string | null;
  @ApiPropertyOptional() disciplineId: string | null;
  @ApiPropertyOptional() disciplineName: string | null;
  @ApiPropertyOptional({ description: "The discipline's department" }) departmentName: string | null;
  @ApiPropertyOptional() projectId: string | null;
  @ApiPropertyOptional({ description: 'Read from the project' }) projectCode: string | null;
  @ApiPropertyOptional({ description: 'Read from the project' }) projectName: string | null;
  @ApiPropertyOptional({ description: "Read from the project's client" }) clientId: string | null;
  @ApiPropertyOptional() clientCode: string | null;
  @ApiPropertyOptional() clientName: string | null;
  @ApiPropertyOptional() discipline?: { id: string; name?: string; code?: string } | null;
  @ApiPropertyOptional() workPackage: string | null;
  @ApiPropertyOptional() activities: string | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdBy: string;
  @ApiProperty() updatedBy: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class WbsCostCodeListResponseDto {
  @ApiProperty({ type: [WbsCostCodeResponseDto] }) items: WbsCostCodeResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
