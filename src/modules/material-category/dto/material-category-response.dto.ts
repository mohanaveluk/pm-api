import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Full detail response ───────────────────────────────────────────────────

export class MaterialCategoryResponseDto {
  @ApiProperty({ example: 'uuid' })                  id: string;
  @ApiProperty({ example: 'uuid' })                  dguid: string;
  @ApiProperty({ example: 'uuid' })                  organizationId: string;
  @ApiProperty({ example: 'Acme Corp' })             organizationName: string;
  @ApiProperty()                                     organization: { id: string; name?: string; code?: string };
  @ApiProperty({ example: 'RM' })                    code: string;
  @ApiProperty({ example: 'Raw Material' })          name: string;
  @ApiPropertyOptional({ example: 'RM' })            shortName: string;
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

export class MaterialCategoryDropdownDto {
  @ApiProperty({ example: 'uuid' })         id: string;
  @ApiProperty({ example: 'RM' })           code: string;
  @ApiProperty({ example: 'Raw Material' }) name: string;
  @ApiPropertyOptional({ example: 'RM' })   shortName: string;
  @ApiProperty({ example: 1 })              displayOrder: number;
}

// ── Paginated list response ───────────────────────────────────────────────

export class MaterialCategoryListResponseDto {
  @ApiProperty({ type: [MaterialCategoryResponseDto] }) items: MaterialCategoryResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
