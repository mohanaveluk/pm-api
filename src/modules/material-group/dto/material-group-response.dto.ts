import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Full detail response ───────────────────────────────────────────────────

export class MaterialGroupResponseDto {
  @ApiProperty({ example: 'uuid' })                       id: string;
  @ApiProperty({ example: 'uuid' })                       dguid: string;
  @ApiProperty({ example: 'uuid' })                       organizationId: string;
  @ApiProperty({ example: 'Acme Corp' })                  organizationName: string;
  @ApiProperty()                                          organization: { id: string; name?: string; code?: string };
  @ApiProperty({ example: 'uuid' })                       materialCategoryId: string;
  @ApiProperty({ example: 'RM' })                         materialCategoryCode: string;
  @ApiProperty({ example: 'Raw Material' })               materialCategoryName: string;
  @ApiProperty({ example: 'STEEL' })                      code: string;
  @ApiProperty({ example: 'Steel Products' })             name: string;
  @ApiPropertyOptional({ example: 'Steel' })              shortName: string;
  @ApiPropertyOptional()                                  description: string;
  @ApiProperty({ example: 1 })                            displayOrder: number;
  @ApiProperty({ example: false })                        isSystem: boolean;
  @ApiProperty({ example: true })                         isActive: boolean;
  @ApiPropertyOptional()                                  remarks: string;
  @ApiPropertyOptional()                                  createdBy: string;
  @ApiPropertyOptional()                                  updatedBy: string;
  @ApiProperty()                                          createdAt: Date;
  @ApiProperty()                                          updatedAt: Date;
}

// ── Slim response for dropdowns ───────────────────────────────────────────

export class MaterialGroupDropdownDto {
  @ApiProperty({ example: 'uuid' })              id: string;
  @ApiProperty({ example: 'uuid' })              materialCategoryId: string;
  @ApiProperty({ example: 'RM' })                materialCategoryCode: string;
  @ApiProperty({ example: 'STEEL' })             code: string;
  @ApiProperty({ example: 'Steel Products' })    name: string;
  @ApiPropertyOptional({ example: 'Steel' })     shortName: string;
  @ApiProperty({ example: 1 })                   displayOrder: number;
}

// ── Paginated list response ───────────────────────────────────────────────

export class MaterialGroupListResponseDto {
  @ApiProperty({ type: [MaterialGroupResponseDto] }) items: MaterialGroupResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
