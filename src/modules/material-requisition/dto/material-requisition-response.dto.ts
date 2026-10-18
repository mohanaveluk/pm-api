import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MaterialRequisitionStatus, RequisitionDecision, RequisitionDocumentType, RequisitionLineSource,
  RequisitionParticipantRole,
} from '../enums/material-requisition.enums';
import { WorkflowEventResponseDto } from '../../workflow-tracking/dto/workflow-event-response.dto';

/** A reviewer or approver, with their decision in the current round. */
export class RequisitionParticipantResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: RequisitionParticipantRole }) role: RequisitionParticipantRole;
  @ApiProperty() userId: string;
  @ApiProperty() userName: string;
  @ApiProperty() userEmail: string;
  @ApiProperty() sequence: number;
  @ApiPropertyOptional({ enum: RequisitionDecision }) decision: RequisitionDecision | null;
  @ApiPropertyOptional() decisionComments: string | null;
  @ApiPropertyOptional() decidedAt: Date | null;
  @ApiProperty() editedInRound: boolean;
}

/** A reviewer or approver as the list shows them. */
export class RequisitionParticipantSummaryDto {
  @ApiProperty() userId: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ enum: RequisitionDecision }) decision: RequisitionDecision | null;
}

/** An internal user who can be picked as reviewer or approver. */
export class RequisitionUserOptionDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional() position: string | null;
  @ApiPropertyOptional() role: string | null;
}

/** What the signed-in user may do on this requisition right now. */
export class RequisitionPermissionsDto {
  @ApiProperty() canEdit: boolean;
  @ApiProperty() canSubmit: boolean;
  @ApiProperty({ description: 'An assigned reviewer whose decision is still due' }) canReview: boolean;
  @ApiProperty({ description: 'An assigned approver whose decision is still due' }) canApprove: boolean;
  @ApiProperty({ description: 'Reviewers can still be changed (until reviewed) by this user' }) canEditReviewers: boolean;
  @ApiProperty({ description: 'Approvers can still be changed (until approved) by this user' }) canEditApprovers: boolean;
  @ApiPropertyOptional({ enum: RequisitionParticipantRole, isArray: true }) myRoles: RequisitionParticipantRole[];
}

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
  @ApiProperty({ type: [RequisitionParticipantSummaryDto] }) reviewers: RequisitionParticipantSummaryDto[];
  @ApiProperty({ type: [RequisitionParticipantSummaryDto] }) approvers: RequisitionParticipantSummaryDto[];
  @ApiPropertyOptional({ example: 'TRK-7F3A9C2E-B41D0A55-9E2C6B10' }) trackingId: string | null;
  @ApiProperty() reviewRound: number;
  @ApiPropertyOptional() reviewedAt: Date | null;
  @ApiPropertyOptional() approvedAt: Date | null;
  @ApiPropertyOptional({ enum: MaterialRequisitionStatus }) statusBeforeHold: MaterialRequisitionStatus | null;
  @ApiPropertyOptional({ description: 'Set once a purchase order is raised — no further edits' }) lockedAt: Date | null;
  @ApiPropertyOptional() lockedReason: string | null;
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
  @ApiProperty({ type: [RequisitionParticipantResponseDto] }) participants: RequisitionParticipantResponseDto[];
  @ApiProperty({ type: [WorkflowEventResponseDto], description: 'Every step taken on this requisition, oldest first' })
  history: WorkflowEventResponseDto[];
  @ApiPropertyOptional({ type: RequisitionPermissionsDto }) permissions: RequisitionPermissionsDto | null;
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
