import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MaterialRequisitionStatus, RequisitionDocumentType, RequisitionLineSource,
} from '../enums/material-requisition.enums';

export class RequisitionItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() lineNumber: number;
  @ApiProperty() materialId: string;
  @ApiProperty() materialCode: string;
  @ApiProperty() materialDescription: string;
  @ApiPropertyOptional() uom: string | null;
  @ApiProperty() requestedQty: number;
  @ApiProperty({ description: 'Not tracked yet — always 0' }) stockOnHand: number;
  @ApiProperty({ enum: RequisitionLineSource }) source: RequisitionLineSource;
  @ApiPropertyOptional() sourceReference: string | null;
}

export class RequisitionDocumentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: RequisitionDocumentType }) documentType: RequisitionDocumentType;
  @ApiProperty() documentName: string;
  @ApiProperty() documentUrl: string;
  @ApiPropertyOptional() fileName: string | null;
  @ApiPropertyOptional() mimeType: string | null;
  @ApiPropertyOptional() fileSizeBytes: number | null;
  @ApiPropertyOptional() uploadedBy: string | null;
  @ApiProperty() uploadedAt: Date;
}

/** The WBS / cost code's descriptive fields, read from it. */
export class RequisitionWbsDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty({ description: 'WBS / cost name' }) name: string;
  @ApiPropertyOptional() areaFacility: string | null;
  @ApiPropertyOptional() systemSubsystem: string | null;
  @ApiPropertyOptional() disciplineName: string | null;
  @ApiPropertyOptional() departmentName: string | null;
  @ApiPropertyOptional() workPackage: string | null;
  @ApiPropertyOptional() activities: string | null;
}

export class MaterialRequisitionListItemDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: '0001' }) code: string;
  @ApiProperty() mrNumber: string;
  @ApiProperty({ enum: MaterialRequisitionStatus }) status: MaterialRequisitionStatus;
  @ApiProperty() projectId: string;
  @ApiPropertyOptional() projectCode: string | null;
  @ApiPropertyOptional() projectName: string | null;
  @ApiPropertyOptional({ description: "Read from the project's client" }) clientCode: string | null;
  @ApiPropertyOptional() clientName: string | null;
  @ApiPropertyOptional() wbsCostCodeId: string | null;
  @ApiPropertyOptional() wbsName: string | null;
  @ApiPropertyOptional() budgetHead: string | null;
  @ApiPropertyOptional({ example: '2026-11-15' }) requiredOnSiteDate: string | null;
  @ApiProperty() itemCount: number;
  @ApiPropertyOptional() submittedBy: string | null;
  @ApiPropertyOptional() submittedAt: Date | null;
  @ApiPropertyOptional() createdBy: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class MaterialRequisitionResponseDto extends MaterialRequisitionListItemDto {
  @ApiProperty() dguid: string;
  @ApiProperty() organizationId: string;
  @ApiPropertyOptional({ type: RequisitionWbsDto }) wbs: RequisitionWbsDto | null;
  @ApiPropertyOptional() mtoReference: string | null;
  @ApiPropertyOptional() pidReference: string | null;
  @ApiPropertyOptional() isometricReference: string | null;
  @ApiPropertyOptional() areaUnit: string | null;
  @ApiPropertyOptional() remarks: string | null;
  @ApiProperty({ type: [RequisitionItemResponseDto] }) items: RequisitionItemResponseDto[];
  @ApiProperty({ type: [RequisitionDocumentResponseDto] }) documents: RequisitionDocumentResponseDto[];
  @ApiPropertyOptional() updatedBy: string | null;
}

export class MaterialRequisitionListResponseDto {
  @ApiProperty({ type: [MaterialRequisitionListItemDto] }) items: MaterialRequisitionListItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}

/** A material offered for selection, from any source. */
export class RequisitionCandidateDto {
  @ApiProperty() materialId: string;
  @ApiProperty() code: string;
  @ApiProperty() description: string;
  @ApiPropertyOptional() categoryName: string | null;
  @ApiPropertyOptional() groupName: string | null;
  @ApiPropertyOptional() uom: string | null;
  @ApiProperty({ description: 'Not tracked yet — always 0' }) stockOnHand: number;
  @ApiPropertyOptional({ description: 'Quantity on the source line (earlier MR, BOM, …)' })
  referenceQty: number | null;
}

export class RequisitionCandidateListDto {
  @ApiProperty({ type: [RequisitionCandidateDto] }) items: RequisitionCandidateDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}

export class BomColumnsDto {
  @ApiProperty({ type: [String] }) columns: string[];
  @ApiProperty() rowCount: number;
  @ApiProperty({ description: 'The first few rows, for the mapping preview' })
  sample: Array<Record<string, string>>;
  @ApiPropertyOptional({ description: 'Columns guessed from the headers' })
  suggested: { codeColumn?: string; descriptionColumn?: string; quantityColumn?: string; uomColumn?: string };
}

export class BomRowIssueDto {
  @ApiProperty() rowNumber: number;
  @ApiPropertyOptional() code: string | null;
  @ApiProperty() reason: string;
}

export class BomPreviewDto {
  @ApiProperty({ type: [RequisitionCandidateDto] }) matched: RequisitionCandidateDto[];
  @ApiProperty({ type: [BomRowIssueDto] }) issues: BomRowIssueDto[];
  @ApiProperty() totalRows: number;
}
