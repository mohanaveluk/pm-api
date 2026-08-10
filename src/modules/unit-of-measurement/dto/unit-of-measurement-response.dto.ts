import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UomType } from '../enums/uom-type.enum';

// ── Full detail response ───────────────────────────────────────────────────

export class UnitOfMeasurementResponseDto {
  @ApiProperty({ example: 'uuid' })                    id: string;
  @ApiProperty({ example: 'uuid' })                    dguid: string;
  @ApiProperty({ example: 'uuid' })                    organizationId: string;
  @ApiProperty({ example: 'Acme Corp' })               organizationName: string;
  @ApiProperty()                                       organization: { id: string; name?: string; code?: string };
  @ApiProperty({ example: 'KG' })                      code: string;
  @ApiProperty({ example: 'Kilogram' })                name: string;
  @ApiPropertyOptional({ example: 'kg' })              symbol: string;
  @ApiPropertyOptional({ example: 'Kg' })              shortName: string;
  @ApiPropertyOptional()                               description: string;
  @ApiProperty({ enum: UomType, example: UomType.WEIGHT }) uomType: UomType;
  @ApiProperty({ example: 1 })                         displayOrder: number;
  @ApiProperty({ example: true })                      isActive: boolean;
  @ApiPropertyOptional()                               remarks: string;
  @ApiPropertyOptional()                               createdBy: string;
  @ApiPropertyOptional()                               updatedBy: string;
  @ApiProperty()                                       createdAt: Date;
  @ApiProperty()                                       updatedAt: Date;
}

// ── Slim response for dropdowns ───────────────────────────────────────────

export class UnitOfMeasurementDropdownDto {
  @ApiProperty({ example: 'uuid' })               id: string;
  @ApiProperty({ example: 'KG' })                 code: string;
  @ApiProperty({ example: 'Kilogram' })           name: string;
  @ApiPropertyOptional({ example: 'kg' })         symbol: string;
  @ApiPropertyOptional({ example: 'Kg' })         shortName: string;
  @ApiProperty({ enum: UomType, example: UomType.WEIGHT }) uomType: UomType;
  @ApiProperty({ example: 1 })                    displayOrder: number;
}

// ── Paginated list response ───────────────────────────────────────────────

export class UnitOfMeasurementListResponseDto {
  @ApiProperty({ type: [UnitOfMeasurementResponseDto] }) items: UnitOfMeasurementResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
