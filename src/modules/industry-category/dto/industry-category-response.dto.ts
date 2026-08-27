import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Full detail response ───────────────────────────────────────────────────

export class IndustryCategoryResponseDto {
  @ApiProperty({ example: 'uuid' })                  id: string;
  @ApiProperty({ example: 'uuid' })                  dguid: string;
  @ApiProperty({ example: 'uuid' })                  organizationId: string;
  @ApiProperty({ example: 'Acme Corp' })             organizationName: string;
  @ApiProperty()                                     organization: { id: string; name?: string; code?: string };
  @ApiProperty({ example: 'CIV' })                   code: string;
  @ApiProperty({ example: 'Civil' })                 name: string;
  @ApiPropertyOptional({ example: 'CIV' })           shortName: string;
  @ApiPropertyOptional()                             description: string;
  @ApiProperty({ example: 1 })                       displayOrder: number;
  @ApiProperty({ example: false })                   isSystem: boolean;
  @ApiProperty({ example: true })                    isActive: boolean;
  @ApiPropertyOptional()                             remarks: string;
  @ApiPropertyOptional()                             createdBy: string;
  @ApiPropertyOptional()                             updatedBy: string;
  @ApiProperty()                                     createdAt: Date;
  @ApiProperty()                                     updatedAt: Date;
}

// ── Slim response for dropdowns ───────────────────────────────────────────

export class IndustryCategoryDropdownDto {
  @ApiProperty({ example: 'uuid' })       id: string;
  @ApiProperty({ example: 'CIV' })        code: string;
  @ApiProperty({ example: 'Civil' })      name: string;
  @ApiPropertyOptional({ example: 'CIV' }) shortName: string;
  @ApiProperty({ example: 1 })            displayOrder: number;
}

// ── Paginated list response ───────────────────────────────────────────────

export class IndustryCategoryListResponseDto {
  @ApiProperty({ type: [IndustryCategoryResponseDto] }) items: IndustryCategoryResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
