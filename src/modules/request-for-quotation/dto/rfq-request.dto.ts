import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayUnique, IsEmail, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional,
  IsString, IsUUID, IsUrl, Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { RfqDocumentSection, RfqNdaScope, RfqStatus } from '../enums/rfq.enums';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const text = (max = 10000) => [IsOptional(), IsString(), MaxLength(max)];
const OptionalText = (max = 10000): PropertyDecorator =>
  (target, key) => text(max).forEach((d) => d(target, key));

// ── Pieces ───────────────────────────────────────────────────────────

export class RfqDocumentDto {
  @ApiProperty({ enum: RfqDocumentSection })
  @IsEnum(RfqDocumentSection)
  section: RfqDocumentSection;

  @ApiProperty({ example: 'General Terms and Conditions' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  documentName: string;

  @ApiProperty({ description: 'URL returned by POST /rfqs/documents/upload (or of the picked document)' })
  @IsUrl({ require_tld: false }, { message: 'documentUrl must be a URL address' }) @MaxLength(1000)
  documentUrl: string;

  @ApiPropertyOptional({ nullable: true }) @OptionalText(255) fileName?: string | null;
  @ApiPropertyOptional({ nullable: true }) @OptionalText(100) mimeType?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsInt() @Min(0)
  fileSizeBytes?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Picked from this material requisition' })
  @IsOptional() @IsUUID()
  sourceRequisitionId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'The material requisition document it was picked from' })
  @IsOptional() @IsUUID()
  sourceDocumentId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: "Picked from the vendor's Vendor Master documents" })
  @IsOptional() @IsUUID()
  vendorDocumentId?: string | null;
}

export class RfqItemDto {
  @ApiProperty({ description: 'The material requisition line put out for quotation' })
  @IsUUID()
  requisitionItemId: string;

  @ApiProperty({ example: 10, description: 'Up to what the requisition line still has open' })
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001)
  rfqQuantity: number;
}

export class RfqComplianceDto {
  @ApiPropertyOptional({ description: 'Existing RFQ compliance item (keeps the vendor answers)' })
  @IsOptional() @IsUUID()
  id?: string;

  @ApiProperty({ example: 'Material to ASTM A106 Gr. B, seamless' })
  @IsString() @IsNotEmpty({ message: 'Requirement is required' }) @MaxLength(2000)
  requirement: string;

  @ApiPropertyOptional({ description: 'The material requisition compliance item it was brought in from' })
  @IsOptional() @IsUUID()
  sourceComplianceId?: string | null;
}

// ── Buyer: create / update ───────────────────────────────────────────

export class CreateRfqDto {
  // NOTE: `code` is absent by design — it is server-generated (0001, 0002, …).

  @ApiPropertyOptional({ nullable: true, description: 'Leave empty to use the system code' })
  @IsOptional() @IsString() @MaxLength(50)
  rfqNumber?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(999)
  revisionNo?: number;

  @ApiProperty() @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ nullable: true, description: "The project's client when omitted" })
  @IsOptional() @IsUUID()
  clientId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2026-12-15', description: 'Today or later' })
  @IsOptional() @Matches(ISO_DATE, { message: 'bidClosingDate must be YYYY-MM-DD' })
  bidClosingDate?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  sealedBid?: boolean;

  @ApiPropertyOptional({ enum: RfqNdaScope, nullable: true })
  @IsOptional() @IsEnum(RfqNdaScope)
  ndaScope?: RfqNdaScope | null;

  @ApiPropertyOptional({ nullable: true, description: 'Vendor from the Vendor Master (required to issue)' })
  @IsOptional() @IsUUID()
  vendorId?: string | null;

  @ApiPropertyOptional() @OptionalText(500) subject?: string | null;
  @ApiPropertyOptional() @OptionalText() content?: string | null;
  @ApiPropertyOptional() @OptionalText() instructionsToBidders?: string | null;

  @ApiPropertyOptional() @OptionalText() scopeDescription?: string | null;
  @ApiPropertyOptional() @OptionalText() scopeQuantityNotes?: string | null;
  @ApiPropertyOptional() @OptionalText() deliveryLocation?: string | null;
  @ApiPropertyOptional() @OptionalText() deliverySchedule?: string | null;

  @ApiPropertyOptional() @OptionalText() materialGradeStandards?: string | null;
  @ApiPropertyOptional() @OptionalText() designConditions?: string | null;
  @ApiPropertyOptional() @OptionalText() dimensionalRequirements?: string | null;
  @ApiPropertyOptional() @OptionalText() applicableCodes?: string | null;
  @ApiPropertyOptional() @OptionalText() qualityRequirements?: string | null;
  @ApiPropertyOptional() @OptionalText() regulatoryCompliance?: string | null;
  @ApiPropertyOptional() @OptionalText() inspectionTesting?: string | null;
  @ApiPropertyOptional() @OptionalText() documentationRequirements?: string | null;

  @ApiPropertyOptional() @OptionalText() pricingFormat?: string | null;
  @ApiPropertyOptional() @OptionalText() incoterms?: string | null;
  @ApiPropertyOptional() @OptionalText() paymentTerms?: string | null;
  @ApiPropertyOptional() @OptionalText() taxesDuties?: string | null;
  @ApiPropertyOptional() @OptionalText() warranty?: string | null;
  @ApiPropertyOptional() @OptionalText() liquidatedDamages?: string | null;
  @ApiPropertyOptional() @OptionalText() performanceGuarantee?: string | null;
  @ApiPropertyOptional() @OptionalText() insuranceRequirements?: string | null;
  @ApiPropertyOptional() @OptionalText() packingMarking?: string | null;
  @ApiPropertyOptional() @OptionalText() commercialDocumentation?: string | null;

  @ApiPropertyOptional({ type: [String], description: 'Approved material requisitions the RFQ is raised from' })
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ArrayUnique() @IsUUID('all', { each: true })
  requisitionIds?: string[];

  @ApiPropertyOptional({ type: [RfqItemDto], description: 'The complete price schedule; replaces the stored one' })
  @IsOptional() @IsArray() @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => RfqItemDto)
  items?: RfqItemDto[];

  @ApiPropertyOptional({ type: [RfqComplianceDto], description: 'The complete compliance list, in Sr# order' })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => RfqComplianceDto)
  compliances?: RfqComplianceDto[];

  @ApiPropertyOptional({ type: [RfqDocumentDto], description: "The buyer's documents (all sections but VENDOR_QUALIFICATION)" })
  @IsOptional() @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => RfqDocumentDto)
  documents?: RfqDocumentDto[];
}

export class UpdateRfqDto extends PartialType(CreateRfqDto) {}

// ── Vendor: the quotation ────────────────────────────────────────────

export class RfqItemPriceDto {
  @ApiProperty() @IsUUID()
  id: string;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  unitPrice?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Quoted currency → USD' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  exchangeRate?: number | null;

  @ApiPropertyOptional({ nullable: true, example: '12 weeks ex-works' }) @OptionalText(100)
  deliveryDuration?: string | null;

  @ApiPropertyOptional({ nullable: true }) @OptionalText(2000)
  remarks?: string | null;
}

export class RfqOtherChargeDto {
  @ApiProperty({ example: 'Freight charges' })
  @IsString() @IsNotEmpty({ message: 'Enter the title of the charge' }) @MaxLength(255)
  title: string;

  @ApiProperty({ example: 1250 })
  @Type(() => Number) @IsNumber() @Min(0)
  amount: number;
}

export class RfqChecklistAnswerDto {
  @ApiProperty({ example: 'DATASHEETS' }) @IsString() @MaxLength(50)
  key: string;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsBoolean()
  provided?: boolean | null;

  @ApiPropertyOptional({ nullable: true, description: 'Required when provided is false' }) @OptionalText(2000)
  reason?: string | null;
}

export class RfqComplianceAnswerDto {
  @ApiProperty() @IsUUID()
  id: string;

  @ApiPropertyOptional({ nullable: true }) @OptionalText(2000)
  vendorResponse?: string | null;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsBoolean()
  compliant?: boolean | null;

  @ApiPropertyOptional({ nullable: true, description: 'Required when compliant is false' }) @OptionalText(2000)
  remarks?: string | null;
}

export class RfqDeviationDto {
  @ApiProperty({ example: '4.2.1' })
  @IsString() @IsNotEmpty({ message: 'Clause No. is required' }) @MaxLength(50)
  clauseNo: string;

  @ApiProperty({ example: 'Hydrotest at 1.5 x design pressure' })
  @IsString() @IsNotEmpty({ message: 'RFQ requirement is required' }) @MaxLength(2000)
  rfqRequirement: string;

  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean()
  vendorDeviation?: boolean;

  @ApiPropertyOptional({ nullable: true, description: 'Required when vendorDeviation is false' }) @OptionalText(2000)
  justification?: string | null;
}

export class RfqVendorResponseDto {
  @ApiPropertyOptional({ nullable: true, example: 'EUR' })
  @IsOptional() @Matches(/^[A-Za-z]{3}$/, { message: 'quotedCurrency must be a 3-letter currency code' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  quotedCurrency?: string | null;

  @ApiPropertyOptional({ type: [RfqItemPriceDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => RfqItemPriceDto)
  items?: RfqItemPriceDto[];

  @ApiPropertyOptional({ type: [RfqOtherChargeDto], description: 'Complete set; replaces the stored one' })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => RfqOtherChargeDto)
  otherCharges?: RfqOtherChargeDto[];

  @ApiPropertyOptional({ type: [RfqChecklistAnswerDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => RfqChecklistAnswerDto)
  checklist?: RfqChecklistAnswerDto[];

  @ApiPropertyOptional({ type: [RfqComplianceAnswerDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => RfqComplianceAnswerDto)
  compliances?: RfqComplianceAnswerDto[];

  @ApiPropertyOptional({ type: [RfqDeviationDto], description: 'Complete set, in Sr# order; replaces the stored one' })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => RfqDeviationDto)
  deviations?: RfqDeviationDto[];

  @ApiPropertyOptional({ type: [RfqDocumentDto], description: 'Qualification documents (section VENDOR_QUALIFICATION)' })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => RfqDocumentDto)
  qualificationDocuments?: RfqDocumentDto[];

  @ApiPropertyOptional({ default: false, description: 'true submits the quotation (status QUOTED); it can still be revised' })
  @IsOptional() @IsBoolean()
  submit?: boolean;
}

// ── Status & queries ─────────────────────────────────────────────────

export class UpdateRfqStatusDto {
  @ApiProperty({ enum: [RfqStatus.COMPLETED, RfqStatus.APPROVED, RfqStatus.CANCELLED] })
  @IsIn([RfqStatus.COMPLETED, RfqStatus.APPROVED, RfqStatus.CANCELLED])
  status: RfqStatus;
}

export const RFQ_SORT_FIELDS = ['rfqNumber', 'issueDate', 'bidClosingDate', 'status', 'createdAt', 'updatedAt'] as const;

export class RfqQueryDto {
  @ApiPropertyOptional({ description: 'RFQ number, subject, project, client or vendor' })
  @IsOptional() @IsString() @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: RfqStatus }) @IsOptional() @IsEnum(RfqStatus)
  status?: RfqStatus;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  projectId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: RFQ_SORT_FIELDS, default: 'createdAt' })
  @IsOptional() @IsIn(RFQ_SORT_FIELDS as unknown as string[])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' }) @IsOptional() @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ enum: ['vendor', 'project'], description: 'Order the page by vendor or project first (grouped view); the response then carries each group\'s totals' })
  @IsOptional() @IsIn(['vendor', 'project'])
  groupBy?: 'vendor' | 'project';
}

export class RfqRequisitionOptionsQueryDto {
  @ApiPropertyOptional({ description: 'MR number, description, project or client' })
  @IsOptional() @IsString() @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ description: 'Only the requisitions of this project' })
  @IsOptional() @IsUUID()
  projectId?: string;
}

export class RfqRequisitionContentQueryDto {
  @ApiProperty({ description: 'Comma-separated requisition ids' })
  @Transform(({ value }) => (Array.isArray(value) ? value : String(value ?? '').split(',').map((v) => v.trim()).filter(Boolean)))
  @IsArray() @ArrayMaxSize(50) @IsUUID('all', { each: true })
  ids: string[];

  @ApiPropertyOptional({ description: 'The RFQ being edited — its own quantities do not count against the balance' })
  @IsOptional() @IsUUID()
  excludeRfqId?: string;
}

export class RfqVendorOptionsQueryDto {
  @ApiPropertyOptional({ description: 'Vendor code, name or email' })
  @IsOptional() @IsString() @MaxLength(200)
  search?: string;
}

// ── Vendor: RFQ Acknowledgement Form ─────────────────────────────────

export class RfqAcknowledgementDto {
  @ApiProperty({ description: 'Vendor confirms participation' })
  @IsBoolean()
  participate: boolean;

  @ApiPropertyOptional({ description: 'Will the vendor submit a quotation — required when it participates' })
  @IsOptional() @IsBoolean()
  willSubmitQuotation?: boolean | null;

  @ApiProperty({ maxLength: 200 }) @IsString() @IsNotEmpty() @MaxLength(200)
  vendorName: string;

  @ApiProperty({ maxLength: 150 }) @IsString() @IsNotEmpty() @MaxLength(150)
  contactPerson: string;

  @ApiProperty({ maxLength: 150 }) @IsEmail() @MaxLength(150)
  email: string;

  @ApiPropertyOptional({ maxLength: 50 }) @OptionalText(50)
  phone?: string | null;

  @ApiProperty({ type: [RfqDocumentDto], description: 'The acknowledgement documents (section ACKNOWLEDGEMENT); at least one' })
  @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => RfqDocumentDto)
  documents: RfqDocumentDto[];
}
