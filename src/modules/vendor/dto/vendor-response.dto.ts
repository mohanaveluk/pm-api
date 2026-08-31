import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { VendorStatus }         from '../enums/vendor-status.enum';
import { PendingStatusChange }  from '../enums/pending-status-change.enum';
import { VendorClassification } from '../enums/vendor-classification.enum';
import { RiskCategory }         from '../enums/risk-category.enum';
import { ReviewCycle }          from '../enums/review-cycle.enum';
import { TaxDocumentType }      from '../enums/tax-document-type.enum';
import { PaymentTerms }         from '../enums/payment-terms.enum';
import { PaymentMethod }        from '../enums/payment-method.enum';
import { DeliveryCapability }   from '../enums/delivery-capability.enum';
import { VendorAddressType }    from '../enums/vendor-address-type.enum';
import { VendorDocumentType }   from '../enums/vendor-document-type.enum';
import { EvaluationStage }      from '../enums/evaluation-stage.enum';
import { EvaluationDecision }   from '../enums/evaluation-decision.enum';
import { TransportationMode }   from '../../material/enums/transportation-mode.enum';

// ── Child response shapes ──────────────────────────────────────────────────

export class VendorContactResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() contactPerson: string;
  @ApiPropertyOptional() designation?: string;
  @ApiPropertyOptional() department?: string;
  @ApiPropertyOptional() email?: string;
  @ApiPropertyOptional() mobileNumber?: string;
  @ApiPropertyOptional() landlineNumber?: string;
  @ApiProperty() isPrimary: boolean;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() remarks?: string;
}

export class VendorAddressResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: VendorAddressType }) addressType: VendorAddressType;
  @ApiPropertyOptional() addressLine1?: string;
  @ApiPropertyOptional() addressLine2?: string;
  @ApiPropertyOptional() city?: string;
  @ApiPropertyOptional() state?: string;
  @ApiPropertyOptional() country?: string;
  @ApiPropertyOptional() postalCode?: string;
  @ApiPropertyOptional() phoneNumber?: string;
  @ApiPropertyOptional() email?: string;
  @ApiProperty() isPrimary: boolean;
  @ApiProperty() isActive: boolean;
}

// Bank details are returned MASKED by default. accountNumber and iban only
// carry real values when the caller holds the sensitive-data role and asked
// for them explicitly; otherwise they arrive as ************1234 / null.
export class VendorBankAccountResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() bankName: string;
  @ApiPropertyOptional() branch?: string;
  @ApiPropertyOptional() accountHolderName?: string;

  @ApiPropertyOptional({
    example: '************1234',
    description: 'Masked unless the caller is authorised for sensitive vendor data',
  })
  accountNumber?: string;

  @ApiPropertyOptional({
    example: '************3456',
    description: 'Masked unless the caller is authorised for sensitive vendor data',
  })
  iban?: string;

  @ApiPropertyOptional({ description: 'Omitted entirely unless the caller is authorised' })
  swiftCode?: string;

  @ApiPropertyOptional() currency?: string;
  @ApiPropertyOptional({ enum: PaymentMethod }) preferredPaymentMethod?: PaymentMethod;
  @ApiProperty() isPrimary: boolean;
  @ApiProperty() isActive: boolean;
  @ApiProperty({ description: 'True when the values above are masked' }) isMasked: boolean;
}

export class VendorCertificationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() certificationName: string;
  @ApiPropertyOptional() certificateNumber?: string;
  @ApiPropertyOptional() issuingAuthority?: string;
  @ApiPropertyOptional() issueDate?: Date;
  @ApiPropertyOptional() expiryDate?: Date;
  @ApiPropertyOptional() documentUrl?: string;
  @ApiPropertyOptional() scopeOfCertification?: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty({ description: 'Derived: expiryDate is in the past' }) isExpired: boolean;
  @ApiPropertyOptional({ description: 'Derived: days until expiry (negative when expired)' }) daysToExpiry?: number;
}

export class VendorDocumentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: VendorDocumentType }) documentType: VendorDocumentType;
  @ApiProperty() documentUrl: string;
  @ApiPropertyOptional() fileName?: string;
  @ApiPropertyOptional() mimeType?: string;
  @ApiPropertyOptional() fileSizeBytes?: number;
  @ApiProperty() version: number;
  @ApiPropertyOptional() supersedesId?: string;
  @ApiPropertyOptional() effectiveFrom?: Date;
  @ApiPropertyOptional() effectiveTo?: Date;
  @ApiPropertyOptional() expiryDate?: Date;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() uploadedBy?: string;
  @ApiPropertyOptional() uploadedAt?: Date;
}

export class VendorMaterialResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() materialId: string;
  @ApiPropertyOptional({ description: 'Joined from Material Master' }) materialCode?: string;
  @ApiPropertyOptional({ description: 'Joined from Material Master' }) materialDescription?: string;
  @ApiPropertyOptional() vendorPartNumber?: string;
  @ApiPropertyOptional() manufacturerPartNumber?: string;
  @ApiPropertyOptional() leadTimeDays?: number;
  @ApiPropertyOptional() minimumOrderQuantity?: number;
  @ApiPropertyOptional() unitPrice?: number;
  @ApiPropertyOptional() currency?: string;
  @ApiPropertyOptional() effectiveFrom?: Date;
  @ApiPropertyOptional() effectiveTo?: Date;
  @ApiProperty({ description: 'Preference is per material, not global' }) isPreferred: boolean;
  @ApiProperty() isActive: boolean;
}

export class VendorTurnoverResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() financialYear: number;
  @ApiProperty() turnover: number;
  @ApiProperty() currency: string;
  @ApiProperty() isAudited: boolean;
  @ApiPropertyOptional() financialStatementUrl?: string;
}

export class VendorEvaluationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: EvaluationStage }) stage: EvaluationStage;
  @ApiProperty({ enum: EvaluationDecision }) decision: EvaluationDecision;
  @ApiPropertyOptional() score?: number;
  @ApiPropertyOptional() referenceNumber?: string;
  @ApiPropertyOptional() comments?: string;
  @ApiProperty() evaluatedBy: string;
  @ApiProperty() evaluatedAt: Date;
  @ApiProperty() createdAt: Date;
}

export class VendorPerformanceResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() projectId?: string;
  @ApiPropertyOptional() purchaseOrderId?: string;
  @ApiPropertyOptional() evaluationPeriodStart?: Date;
  @ApiPropertyOptional() evaluationPeriodEnd?: Date;
  @ApiPropertyOptional() qualityScore?: number;
  @ApiPropertyOptional() deliveryScore?: number;
  @ApiPropertyOptional() commercialScore?: number;
  @ApiPropertyOptional() hseScore?: number;
  @ApiPropertyOptional() overallScore?: number;
  @ApiPropertyOptional() remarks?: string;
  @ApiProperty() evaluatedBy: string;
  @ApiProperty() evaluatedAt: Date;
}

// ── Dropdown / list / detail ───────────────────────────────────────────────

export class VendorDropdownDto {
  @ApiProperty() id: string;
  @ApiProperty() dguid: string;
  @ApiProperty({ example: 'CIV000001' }) code: string;
  @ApiProperty() vendorName: string;
  @ApiPropertyOptional() tradeName?: string;
  @ApiProperty() vendorTypeId: string;
  @ApiPropertyOptional({ description: 'Joined for display' }) vendorTypeName?: string;
  @ApiProperty({ enum: VendorStatus }) vendorStatus: VendorStatus;
  @ApiPropertyOptional({ enum: VendorClassification }) vendorClassification?: VendorClassification;
  @ApiProperty() industryCategoryId: string;
}

export class VendorListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() dguid: string;
  @ApiProperty({ example: 'CIV000001' }) code: string;
  @ApiProperty() vendorName: string;
  @ApiPropertyOptional() tradeName?: string;
  @ApiProperty() vendorTypeId: string;
  @ApiPropertyOptional({ description: 'Joined for display' }) vendorTypeName?: string;
  @ApiProperty({ enum: VendorStatus }) vendorStatus: VendorStatus;
  @ApiProperty() isActive: boolean;
  @ApiProperty() industryCategoryId: string;
  @ApiPropertyOptional({ description: 'Joined for display' }) industryCategoryName?: string;

  // Already on the loaded entity as a JSON column, so surfacing it here costs
  // no extra query — the list screen shows it as the vendor's supply scope.
  @ApiPropertyOptional({
    type: [String],
    description: 'Material categories this vendor supplies',
    example: ['Piping', 'Structural Steel'],
  })
  productCategories?: string[];

  @ApiPropertyOptional() parentCompanyId?: string;
  @ApiPropertyOptional({ description: 'Joined for display' }) parentCompanyName?: string;
  @ApiPropertyOptional() primaryContactPerson?: string;
  @ApiPropertyOptional() email?: string;
  @ApiPropertyOptional() mobileNumber?: string;
  @ApiPropertyOptional() countryOfRegistration?: string;
  @ApiPropertyOptional({ enum: VendorClassification }) vendorClassification?: VendorClassification;
  @ApiPropertyOptional({ enum: PendingStatusChange, description: 'Awaiting manager approval' }) pendingStatusChange?: PendingStatusChange;
  @ApiPropertyOptional({ enum: RiskCategory }) riskCategory?: RiskCategory;
  @ApiPropertyOptional() vendorEvaluationScore?: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class VendorResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() dguid: string;
  @ApiProperty() organizationId: string;
  @ApiProperty({ example: 'CIV000001', description: 'Server-generated and immutable' }) code: string;

  // ── Identity ──────────────────────────────────────────────────────
  @ApiProperty() vendorName: string;
  @ApiPropertyOptional() vendorDescription?: string;
  @ApiPropertyOptional() tradeName?: string;
  @ApiProperty() vendorTypeId: string;
  @ApiPropertyOptional({ description: 'Joined Vendor Type master record' }) vendorType?: any;

  // ── Classification ────────────────────────────────────────────────
  @ApiProperty() industryCategoryId: string;
  @ApiPropertyOptional() industryCategory?: any;
  @ApiPropertyOptional() parentCompanyId?: string;
  @ApiPropertyOptional() parentCompany?: any;

  // ── Status ────────────────────────────────────────────────────────
  @ApiProperty({ enum: VendorStatus, description: 'Business status' }) vendorStatus: VendorStatus;
  @ApiProperty({ description: 'Technical availability — independent of vendorStatus' }) isActive: boolean;
  @ApiPropertyOptional({
    enum: PendingStatusChange,
    description:
      'Set while a blacklist/un-blacklist request awaits manager approval. ' +
      'vendorStatus is unchanged until the decision lands.',
  })
  pendingStatusChange?: PendingStatusChange;
  @ApiPropertyOptional({ description: 'Id of the request awaiting approval' }) pendingStatusChangeRequestId?: string;
  @ApiPropertyOptional() blacklistReason?: string;
  @ApiPropertyOptional() blacklistedAt?: Date;
  @ApiPropertyOptional() blacklistedBy?: string;

  // ── Primary contact ───────────────────────────────────────────────
  @ApiPropertyOptional() primaryContactPerson?: string;
  @ApiPropertyOptional() designation?: string;
  @ApiPropertyOptional() email?: string;
  @ApiPropertyOptional() mobileNumber?: string;
  @ApiPropertyOptional() landlineNumber?: string;
  @ApiPropertyOptional() website?: string;
  @ApiPropertyOptional() countryOfRegistration?: string;

  // ── Statutory ─────────────────────────────────────────────────────
  @ApiPropertyOptional() businessRegistrationNumber?: string;
  @ApiPropertyOptional() taxRegistrationNumber?: string;
  @ApiPropertyOptional() taxDocumentNumber?: string;
  @ApiPropertyOptional({ enum: TaxDocumentType }) taxDocumentType?: TaxDocumentType;
  @ApiPropertyOptional() importExportCode?: string;
  @ApiPropertyOptional() msmeSmeRegistration?: string;

  // ── Commercial & financial ────────────────────────────────────────
  @ApiPropertyOptional({ enum: PaymentTerms }) paymentTerms?: PaymentTerms;
  @ApiPropertyOptional() paymentMilestones?: string;
  @ApiPropertyOptional({ enum: PaymentMethod }) preferredPaymentMethod?: PaymentMethod;
  @ApiPropertyOptional() creditLimitRequested?: number;
  @ApiPropertyOptional() currency?: string;
  @ApiPropertyOptional() creditRating?: string;
  @ApiPropertyOptional() auditedFinancialStatementsUrl?: string;
  @ApiPropertyOptional() priceStructure?: string;
  @ApiPropertyOptional() discountTerms?: string;
  @ApiPropertyOptional({ type: [String] }) contractReferenceNumbers?: string[];
  @ApiPropertyOptional() insuranceCoverage?: string;

  // ── Technical capability ──────────────────────────────────────────
  @ApiPropertyOptional({ type: [String] }) productCategories?: string[];
  @ApiPropertyOptional({ type: [String] }) serviceCategories?: string[];
  @ApiPropertyOptional() technicalExpertiseAreas?: string;
  @ApiPropertyOptional() manufacturingCapabilities?: string;
  @ApiPropertyOptional() productionCapacity?: string;
  @ApiPropertyOptional() keyEquipmentList?: string;
  @ApiPropertyOptional() qualityControlProcesses?: string;
  @ApiPropertyOptional({ type: [String] }) technicalDatasheets?: string[];
  @ApiPropertyOptional() complianceStandards?: string;

  // ── Quality / HSE ─────────────────────────────────────────────────
  @ApiPropertyOptional() qualityManagementSystemDetails?: string;
  @ApiPropertyOptional() hsePolicyUrl?: string;
  @ApiPropertyOptional() incidentAccidentHistory?: string;
  @ApiPropertyOptional() csrCompliance?: string;
  @ApiPropertyOptional() ethicalSourcingPolicy?: string;
  @ApiPropertyOptional() antiBriberyPolicy?: string;

  // ── Experience ────────────────────────────────────────────────────
  @ApiPropertyOptional({ type: [String] }) majorClients?: string[];
  @ApiPropertyOptional() projectExperience?: string;
  @ApiPropertyOptional() pastPoContractReferences?: string;
  @ApiPropertyOptional() blacklistingHistory?: string;
  @ApiPropertyOptional({ type: [String] }) geographicalExperience?: string[];

  // ── Logistics ─────────────────────────────────────────────────────
  @ApiPropertyOptional() standardLeadTimeDays?: number;
  @ApiPropertyOptional() minimumOrderQuantity?: number;
  @ApiPropertyOptional({ enum: DeliveryCapability }) deliveryCapability?: DeliveryCapability;
  @ApiPropertyOptional({ type: [String] }) warehouseLocations?: string[];
  @ApiPropertyOptional({ enum: TransportationMode, isArray: true }) transportModesSupported?: TransportationMode[];
  @ApiPropertyOptional() exportDocumentationCapability?: boolean;

  // ── Evaluation summary (current rolled-up values) ─────────────────
  @ApiPropertyOptional() vendorEvaluationScore?: number;
  @ApiPropertyOptional({ enum: RiskCategory }) riskCategory?: RiskCategory;
  @ApiPropertyOptional({ enum: VendorClassification, description: 'AVL standing' }) vendorClassification?: VendorClassification;
  @ApiPropertyOptional() approvalReference?: string;
  @ApiPropertyOptional() approvalDate?: Date;
  @ApiPropertyOptional({ enum: ReviewCycle }) reviewCycle?: ReviewCycle;
  @ApiPropertyOptional() nextReviewDate?: Date;
  @ApiPropertyOptional() remarks?: string;

  // ── Child collections ─────────────────────────────────────────────
  @ApiPropertyOptional({ type: [VendorContactResponseDto] })       contacts?: VendorContactResponseDto[];
  @ApiPropertyOptional({ type: [VendorAddressResponseDto] })       addresses?: VendorAddressResponseDto[];
  @ApiPropertyOptional({ type: [VendorBankAccountResponseDto], description: 'Masked unless authorised' })
  bankAccounts?: VendorBankAccountResponseDto[];
  @ApiPropertyOptional({ type: [VendorCertificationResponseDto] }) certifications?: VendorCertificationResponseDto[];
  @ApiPropertyOptional({ type: [VendorDocumentResponseDto] })      documents?: VendorDocumentResponseDto[];
  @ApiPropertyOptional({ type: [VendorMaterialResponseDto] })      materials?: VendorMaterialResponseDto[];
  @ApiPropertyOptional({ type: [VendorTurnoverResponseDto] })      turnovers?: VendorTurnoverResponseDto[];

  // ── Audit ─────────────────────────────────────────────────────────
  @ApiPropertyOptional() createdBy?: string;
  @ApiPropertyOptional() updatedBy?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

// Paginated envelope. Matches the `items` shape used by the master-data
// modules (Department, Material Category, Industry Category); the Material
// Master's own list endpoint uses `data` for the same field.
export class VendorListResponseDto {
  @ApiProperty({ type: [VendorListItemDto] }) items: VendorListItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
