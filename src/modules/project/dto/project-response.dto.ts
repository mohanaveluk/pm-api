import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeasurementSystem } from '../../client/enums/client.enums';
import { ProjectStatus } from '../enums/project.enums';

export class ProjectResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() dguid: string;
  @ApiProperty() organizationId: string;
  @ApiProperty({ example: '0001' }) code: string;
  @ApiProperty() projectName: string;

  @ApiProperty() clientId: string;
  @ApiPropertyOptional({ description: "Read from the client relationship — never stored on the project" })
  clientCode: string | null;
  @ApiPropertyOptional({ description: "Read from the client relationship — never stored on the project" })
  clientName: string | null;
  @ApiPropertyOptional() clientDisplayName: string | null;

  @ApiProperty() projectTypeId: string;
  @ApiPropertyOptional() projectTypeName: string | null;

  @ApiProperty({ enum: ProjectStatus }) status: ProjectStatus;
  @ApiPropertyOptional() statusReason: string | null;
  @ApiPropertyOptional() statusChangedBy: string | null;
  @ApiPropertyOptional() statusChangedAt: Date | null;

  @ApiPropertyOptional() description: string | null;
  @ApiProperty({ example: '2026-11-01' }) startDate: string;
  @ApiPropertyOptional({ example: '2028-10-31' }) endDate: string | null;

  @ApiPropertyOptional() projectManagerId: string | null;
  @ApiPropertyOptional() projectManagerName: string | null;

  @ApiPropertyOptional() siteLocation: string | null;
  @ApiPropertyOptional() addressLine1: string | null;
  @ApiPropertyOptional() city: string | null;
  @ApiPropertyOptional() state: string | null;
  @ApiPropertyOptional() postalCode: string | null;
  @ApiPropertyOptional() countryCode: string | null;

  @ApiPropertyOptional() contractNumber: string | null;
  @ApiPropertyOptional() clientProjectReference: string | null;
  @ApiPropertyOptional() currencyCode: string | null;
  @ApiPropertyOptional({ enum: MeasurementSystem }) measurementSystem: MeasurementSystem | null;
  @ApiPropertyOptional() timeZone: string | null;

  @ApiPropertyOptional() createdBy: string | null;
  @ApiPropertyOptional() updatedBy: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class ProjectListResponseDto {
  @ApiProperty({ type: [ProjectResponseDto] }) items: ProjectResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}

/** A row of the dropdown of open projects. */
export class ProjectOptionDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() projectName: string;
  @ApiProperty() clientId: string;
  @ApiPropertyOptional() clientCode: string | null;
  @ApiPropertyOptional() clientName: string | null;
  @ApiProperty({ enum: ProjectStatus }) status: ProjectStatus;
  @ApiPropertyOptional() currencyCode: string | null;
}

export class ProjectManagerOptionDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
}

export class ProjectSummaryClientDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() clientName: string;
  @ApiPropertyOptional() displayName: string | null;
  @ApiPropertyOptional() clientTypeName: string | null;
  @ApiPropertyOptional() industryCategoryName: string | null;
  @ApiPropertyOptional() countryCode: string | null;
  @ApiProperty() status: string;
  @ApiPropertyOptional() defaultCurrencyCode: string | null;
  @ApiPropertyOptional() primaryContactName: string | null;
  @ApiPropertyOptional() primaryContactEmail: string | null;
  @ApiPropertyOptional() primaryContactPhone: string | null;
}

export class ProjectScheduleSummaryDto {
  @ApiPropertyOptional({ description: 'Planned length in days, inclusive of both ends' })
  durationDays: number | null;
  @ApiPropertyOptional({ description: 'Days from today to the planned end; negative once past' })
  daysToEnd: number | null;
  @ApiProperty({ description: 'Planned end has passed while the project is still open' })
  isOverdue: boolean;
}

export class ProjectSummaryResponseDto {
  @ApiProperty({ type: ProjectResponseDto }) project: ProjectResponseDto;
  @ApiProperty({ type: ProjectSummaryClientDto }) client: ProjectSummaryClientDto;
  @ApiProperty({ type: ProjectScheduleSummaryDto }) schedule: ProjectScheduleSummaryDto;
  @ApiProperty({ description: 'Statuses this project may move to next', type: [String] })
  allowedStatuses: ProjectStatus[];
}
