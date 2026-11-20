import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RfqChecklistSection, RfqDocumentSection, RfqNdaScope, RfqStatus } from '../enums/rfq.enums';
import { WorkflowEventResponseDto } from '../../workflow-tracking/dto/workflow-event-response.dto';

export class RfqRequisitionRefDto {
  @ApiProperty() requisitionId: string;
  @ApiProperty() mrNumber: string;
  @ApiPropertyOptional() shortDescription: string | null;
}

export class RfqItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() lineNumber: number;
  @ApiProperty() requisitionId: string;
  @ApiProperty() mrNumber: string;
  @ApiProperty() requisitionItemId: string;
  @ApiProperty() materialId: string;
  @ApiProperty() itemCode: string;
  @ApiProperty() description: string;
  @ApiPropertyOptional() uom: string | null;
  @ApiProperty({ description: "The requisition line's quantity" }) mrQuantity: number;
  @ApiProperty() rfqQuantity: number;
  @ApiPropertyOptional() unitPrice: number | null;
  @ApiPropertyOptional() totalPrice: number | null;
  @ApiPropertyOptional() exchangeRate: number | null;
  @ApiPropertyOptional() totalPriceUsd: number | null;
  @ApiPropertyOptional() deliveryDuration: string | null;
  @ApiPropertyOptional() remarks: string | null;
}

export class RfqDocumentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: RfqDocumentSection }) section: RfqDocumentSection;
  @ApiProperty() documentName: string;
  @ApiProperty() documentUrl: string;
  @ApiPropertyOptional() fileName: string | null;
  @ApiPropertyOptional() mimeType: string | null;
  @ApiPropertyOptional() fileSizeBytes: number | null;
  @ApiPropertyOptional() sourceRequisitionId: string | null;
  @ApiPropertyOptional() sourceDocumentId: string | null;
  @ApiPropertyOptional() sourceMrNumber: string | null;
  @ApiPropertyOptional() vendorDocumentId: string | null;
  @ApiPropertyOptional() uploadedBy: string | null;
  @ApiProperty() uploadedAt: Date;
}

export class RfqOtherChargeResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() sequence: number;
  @ApiProperty() title: string;
  @ApiProperty() amount: number;
}

export class RfqChecklistItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: RfqChecklistSection }) section: RfqChecklistSection;
  @ApiProperty() key: string;
  @ApiProperty() label: string;
  @ApiProperty() sequence: number;
  @ApiPropertyOptional() provided: boolean | null;
  @ApiPropertyOptional() reason: string | null;
}

export class RfqComplianceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() sequence: number;
  @ApiPropertyOptional() sourceComplianceId: string | null;
  @ApiPropertyOptional() sourceRequisitionId: string | null;
  @ApiPropertyOptional() sourceMrNumber: string | null;
  @ApiProperty() requirement: string;
  @ApiPropertyOptional() vendorResponse: string | null;
  @ApiPropertyOptional() compliant: boolean | null;
  @ApiPropertyOptional() remarks: string | null;
}

export class RfqDeviationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() sequence: number;
  @ApiPropertyOptional() sourceDeviationId: string | null;
  @ApiProperty() clauseNo: string;
  @ApiProperty() rfqRequirement: string;
  @ApiProperty() vendorDeviation: boolean;
  @ApiPropertyOptional() justification: string | null;
}

/** What the signed-in user may do on this RFQ right now. */
export class RfqPermissionsDto {
  @ApiProperty({ enum: ['BUYER', 'VENDOR', 'READER'] }) viewer: 'BUYER' | 'VENDOR' | 'READER';
  @ApiProperty({ description: 'The buyer tabs (letter … price schedule)' }) canEditBuyer: boolean;
  @ApiProperty({ description: 'The compliance requirements' }) canEditCompliance: boolean;
  @ApiProperty({ description: "The vendor's parts" }) canEditVendor: boolean;
  @ApiProperty() canIssue: boolean;
  @ApiProperty({ enum: RfqStatus, isArray: true }) allowedStatuses: RfqStatus[];
  @ApiProperty() canDelete: boolean;
  @ApiProperty({ description: 'The signed-in user — documents they uploaded are theirs to change' }) viewerEmail: string;
}

export class RfqListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() rfqNumber: string;
  @ApiProperty() revisionNo: number;
  @ApiPropertyOptional() issueDate: string | null;
  @ApiProperty({ enum: RfqStatus }) status: RfqStatus;
  @ApiProperty() projectId: string;
  @ApiPropertyOptional() projectCode: string | null;
  @ApiPropertyOptional() projectName: string | null;
  @ApiPropertyOptional() clientId: string | null;
  @ApiPropertyOptional() clientName: string | null;
  @ApiPropertyOptional() vendorId: string | null;
  @ApiPropertyOptional() vendorCode: string | null;
  @ApiPropertyOptional() vendorName: string | null;
  @ApiPropertyOptional() vendorEmail: string | null;
  @ApiPropertyOptional() subject: string | null;
  @ApiPropertyOptional() bidClosingDate: string | null;
  @ApiProperty() sealedBid: boolean;
  @ApiProperty({ type: [RfqRequisitionRefDto] }) requisitions: RfqRequisitionRefDto[];
  @ApiProperty() itemCount: number;
  @ApiPropertyOptional() trackingId: string | null;
  @ApiPropertyOptional() createdBy: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

/** The vendor's RFQ Acknowledgement Form, as submitted. */
export class RfqAcknowledgementResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() participate: boolean;
  @ApiProperty() willSubmitQuotation: boolean;
  @ApiProperty() vendorName: string;
  @ApiProperty() contactPerson: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional() phone: string | null;
  @ApiProperty() acknowledgedBy: string;
  @ApiProperty() acknowledgedAt: Date;
  @ApiProperty({ type: [RfqDocumentResponseDto] }) documents: RfqDocumentResponseDto[];
}

export class RfqResponseDto extends RfqListItemDto {
  @ApiPropertyOptional() contactName: string | null;
  @ApiPropertyOptional() contactEmail: string | null;
  @ApiPropertyOptional() contactPhone: string | null;
  @ApiPropertyOptional({ enum: RfqNdaScope }) ndaScope: RfqNdaScope | null;
  @ApiPropertyOptional() vendorAddress: string | null;
  @ApiPropertyOptional() content: string | null;
  @ApiPropertyOptional() instructionsToBidders: string | null;
  @ApiPropertyOptional() scopeDescription: string | null;
  @ApiPropertyOptional() scopeQuantityNotes: string | null;
  @ApiPropertyOptional() deliveryLocation: string | null;
  @ApiPropertyOptional() deliverySchedule: string | null;
  @ApiPropertyOptional() materialGradeStandards: string | null;
  @ApiPropertyOptional() designConditions: string | null;
  @ApiPropertyOptional() dimensionalRequirements: string | null;
  @ApiPropertyOptional() applicableCodes: string | null;
  @ApiPropertyOptional() qualityRequirements: string | null;
  @ApiPropertyOptional() regulatoryCompliance: string | null;
  @ApiPropertyOptional() inspectionTesting: string | null;
  @ApiPropertyOptional() documentationRequirements: string | null;
  @ApiPropertyOptional() pricingFormat: string | null;
  @ApiPropertyOptional() incoterms: string | null;
  @ApiPropertyOptional() paymentTerms: string | null;
  @ApiPropertyOptional() taxesDuties: string | null;
  @ApiPropertyOptional() warranty: string | null;
  @ApiPropertyOptional() liquidatedDamages: string | null;
  @ApiPropertyOptional() performanceGuarantee: string | null;
  @ApiPropertyOptional() insuranceRequirements: string | null;
  @ApiPropertyOptional() packingMarking: string | null;
  @ApiPropertyOptional() commercialDocumentation: string | null;
  @ApiPropertyOptional() quotedCurrency: string | null;
  @ApiPropertyOptional() quotedAt: Date | null;
  @ApiPropertyOptional() quotedBy: string | null;
  @ApiPropertyOptional() issuedAt: Date | null;
  @ApiPropertyOptional() issuedBy: string | null;
  @ApiProperty({ type: [RfqItemResponseDto] }) items: RfqItemResponseDto[];
  @ApiProperty({ type: [RfqDocumentResponseDto] }) documents: RfqDocumentResponseDto[];
  @ApiProperty({ type: [RfqOtherChargeResponseDto] }) otherCharges: RfqOtherChargeResponseDto[];
  @ApiProperty({ type: [RfqChecklistItemResponseDto] }) checklist: RfqChecklistItemResponseDto[];
  @ApiProperty({ type: [RfqComplianceResponseDto] }) compliances: RfqComplianceResponseDto[];
  @ApiProperty({ type: [RfqDeviationResponseDto] }) deviations: RfqDeviationResponseDto[];
  @ApiProperty({ description: 'Sum of the item totals plus other charges, in the quoted currency' }) quotedTotal: number | null;
  @ApiProperty({ description: 'Sum of the item totals in USD' }) quotedTotalUsd: number | null;
  @ApiProperty({ type: [WorkflowEventResponseDto] }) history: WorkflowEventResponseDto[];
  @ApiPropertyOptional({ type: RfqPermissionsDto }) permissions: RfqPermissionsDto | null;
  @ApiPropertyOptional({ type: () => RfqAcknowledgementResponseDto, nullable: true }) acknowledgement: RfqAcknowledgementResponseDto | null;
  @ApiPropertyOptional() updatedBy: string | null;
}

export class RfqListResponseDto {
  @ApiProperty({ type: [RfqListItemDto] }) items: RfqListItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
  @ApiPropertyOptional({ type: () => [RfqGroupSummaryDto], description: 'With groupBy: the totals of the groups on this page (across every page)' })
  groups?: RfqGroupSummaryDto[];
}

export class RfqGroupSummaryDto {
  @ApiPropertyOptional({ nullable: true, description: 'The vendor or project id; null for RFQs with no vendor yet' }) key: string | null;
  @ApiProperty() total: number;
  @ApiProperty({ description: 'Still open: draft, issued, acknowledged or quoted' }) open: number;
}

// ── Sources for the RFQ editor ───────────────────────────────────────

export class RfqRequisitionOptionDto {
  @ApiProperty() id: string;
  @ApiProperty() mrNumber: string;
  @ApiPropertyOptional() shortDescription: string | null;
  @ApiProperty() projectId: string;
  @ApiPropertyOptional() projectCode: string | null;
  @ApiPropertyOptional() projectName: string | null;
  @ApiPropertyOptional() clientName: string | null;
  @ApiProperty() itemCount: number;
  @ApiProperty() documentCount: number;
  @ApiPropertyOptional() approvedAt: Date | null;
}

export class RfqSourceItemDto {
  @ApiProperty() requisitionId: string;
  @ApiProperty() mrNumber: string;
  @ApiProperty() requisitionItemId: string;
  @ApiProperty() lineNumber: number;
  @ApiProperty() materialId: string;
  @ApiProperty() itemCode: string;
  @ApiProperty() description: string;
  @ApiPropertyOptional() uom: string | null;
  @ApiProperty() mrQuantity: number;
  @ApiProperty({ description: 'Already put out for quotation in other RFQs (cancelled ones excepted)' }) quotedElsewhere: number;
  @ApiProperty({ description: 'Still open for quotation' }) balance: number;
}

export class RfqSourceComplianceDto {
  @ApiProperty() id: string;
  @ApiProperty() requisitionId: string;
  @ApiProperty() mrNumber: string;
  @ApiProperty() sequence: number;
  @ApiProperty() requirement: string;
}

export class RfqSourceDeviationDto {
  @ApiProperty() id: string;
  @ApiProperty() requisitionId: string;
  @ApiProperty() mrNumber: string;
  @ApiProperty() clauseNo: string;
  @ApiProperty() rfqRequirement: string;
  @ApiProperty() vendorDeviation: boolean;
  @ApiPropertyOptional() justification: string | null;
}

export class RfqSourceDocumentDto {
  @ApiProperty() id: string;
  @ApiProperty() requisitionId: string;
  @ApiProperty() mrNumber: string;
  @ApiPropertyOptional() shortDescription: string | null;
  @ApiProperty() documentType: string;
  @ApiProperty() documentName: string;
  @ApiProperty() documentUrl: string;
  @ApiPropertyOptional() fileName: string | null;
  @ApiPropertyOptional() mimeType: string | null;
  @ApiPropertyOptional() fileSizeBytes: number | null;
}

/** Everything the RFQ editor brings in from the chosen requisitions. */
export class RfqRequisitionContentDto {
  @ApiProperty({ type: [RfqSourceItemDto] }) items: RfqSourceItemDto[];
  @ApiProperty({ type: [RfqSourceComplianceDto] }) compliances: RfqSourceComplianceDto[];
  @ApiProperty({ type: [RfqSourceDeviationDto] }) deviations: RfqSourceDeviationDto[];
  @ApiProperty({ type: [RfqSourceDocumentDto] }) documents: RfqSourceDocumentDto[];
}

export class RfqVendorOptionDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() vendorName: string;
  @ApiPropertyOptional() email: string | null;
  @ApiPropertyOptional() address: string | null;
}

export class RfqVendorDocumentDto {
  @ApiProperty() id: string;
  @ApiProperty() documentType: string;
  @ApiProperty() documentUrl: string;
  @ApiPropertyOptional() fileName: string | null;
  @ApiPropertyOptional() mimeType: string | null;
  @ApiPropertyOptional() fileSizeBytes: number | null;
  @ApiPropertyOptional() expiryDate: Date | null;
}

export class RfqDefaultsDto {
  @ApiProperty() subject: string;
  @ApiProperty() content: string;
  @ApiProperty() instructionsToBidders: string;
  @ApiPropertyOptional() contactName: string | null;
  @ApiPropertyOptional() contactEmail: string | null;
  @ApiPropertyOptional() contactPhone: string | null;
  @ApiProperty({ type: [String] }) otherChargeTypes: string[];
}

// ── RFQ Acknowledgement Form ─────────────────────────────────────────


/** What the vendor's Acknowledgement Form shows: the RFQ, the form's defaults and any earlier answer. */
export class RfqAcknowledgementFormDto {
  @ApiProperty() rfqId: string;
  @ApiProperty() rfqNumber: string;
  @ApiProperty() revisionNo: number;
  @ApiPropertyOptional() subject: string | null;
  @ApiProperty({ enum: RfqStatus }) status: RfqStatus;
  @ApiPropertyOptional() issueDate: string | null;
  @ApiPropertyOptional() issuedAt: Date | null;
  @ApiPropertyOptional() bidClosingDate: string | null;
  @ApiProperty() sealedBid: boolean;
  @ApiPropertyOptional() projectCode: string | null;
  @ApiPropertyOptional() projectName: string | null;
  @ApiPropertyOptional() clientName: string | null;
  @ApiPropertyOptional() buyerName: string | null;
  @ApiPropertyOptional() buyerEmail: string | null;
  @ApiPropertyOptional() buyerPhone: string | null;
  @ApiPropertyOptional() vendorName: string | null;
  @ApiProperty({ description: 'Whether the signed-in vendor can submit the form now (the RFQ is issued and not yet acknowledged)' })
  canAcknowledge: boolean;
  @ApiProperty({ description: 'Prefilled from the vendor and the signed-in user' })
  defaults: { vendorName: string; contactPerson: string; email: string; phone: string | null };
  @ApiPropertyOptional({ type: RfqAcknowledgementResponseDto, nullable: true }) acknowledgement: RfqAcknowledgementResponseDto | null;
}

/** The vendor's RFQs by stage (drives its menu). */
export class RfqVendorSummaryDto {
  @ApiProperty({ description: 'Issued, waiting for the Acknowledgement Form' }) awaitingAcknowledgement: number;
  @ApiProperty({ description: 'Acknowledged, response not submitted yet' }) acknowledged: number;
  @ApiProperty({ description: 'Response submitted' }) responded: number;
  @ApiProperty({ description: 'Every RFQ the vendor has acknowledged or declined (any later stage too)' }) acknowledgedTotal: number;
  @ApiProperty() total: number;
}
