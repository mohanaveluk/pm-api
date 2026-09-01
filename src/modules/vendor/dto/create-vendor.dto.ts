import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEmail, IsEnum, IsInt,
  IsISO31661Alpha2, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, IsUUID,
  Length, Matches, Max, Min, ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { VendorProjectExperienceDto } from './vendor-project-experience.dto';

import { VendorClassification } from '../enums/vendor-classification.enum';
import { RiskCategory }         from '../enums/risk-category.enum';
import { ReviewCycle }          from '../enums/review-cycle.enum';
import { TaxDocumentType }      from '../enums/tax-document-type.enum';
import { PaymentTerms }         from '../enums/payment-terms.enum';
import { PaymentMethod }        from '../enums/payment-method.enum';
import { DeliveryCapability }   from '../enums/delivery-capability.enum';
import { VendorAddressType }    from '../enums/vendor-address-type.enum';
import { VendorDocumentType }   from '../enums/vendor-document-type.enum';
import { TransportationMode }   from '../../material/enums/transportation-mode.enum';

const trim = ({ value }) => (typeof value === 'string' ? value.trim() : value);

// Accepts international numbers with optional leading '+', spaces, hyphens,
// parentheses and dots. Deliberately permissive about country format — an EPC
// vendor register spans dozens of dialing plans.
const PHONE_REGEX = /^\+?[0-9\s\-().]{6,20}$/;
const PHONE_MESSAGE =
  'must be a valid international phone number (digits, optional leading +, spaces, hyphens, parentheses)';

// Any public TLD is accepted — .com, .ae, .co.in, .co.uk all pass.
const URL_OPTIONS = { require_protocol: true, require_tld: true, protocols: ['http', 'https'] };

// ── Child section DTOs ─────────────────────────────────────────────────────

export class VendorAddressDto {
  @ApiProperty({ enum: VendorAddressType, example: VendorAddressType.REGISTERED })
  @IsEnum(VendorAddressType)
  addressType: VendorAddressType;

  @ApiPropertyOptional({ example: 'Plot 42, Industrial Area Phase II' })
  @IsOptional() @IsString() @Length(1, 255) @Transform(trim)
  addressLine1?: string;

  @ApiPropertyOptional({ example: 'Near Central Workshop' })
  @IsOptional() @IsString() @Length(1, 255) @Transform(trim)
  addressLine2?: string;

  @ApiPropertyOptional({ example: 'Jubail' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  city?: string;

  @ApiPropertyOptional({ example: 'Eastern Province' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  state?: string;

  @ApiPropertyOptional({ example: 'SA', description: 'ISO 3166-1 alpha-2 country code' })
  @IsOptional() @IsISO31661Alpha2()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  country?: string;

  @ApiPropertyOptional({ example: '31961' })
  @IsOptional() @IsString() @Length(1, 20) @Transform(trim)
  postalCode?: string;

  @ApiPropertyOptional({ example: '+966 13 340 1234' })
  @IsOptional() @IsString() @Matches(PHONE_REGEX, { message: `phoneNumber ${PHONE_MESSAGE}` }) @Transform(trim)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'works@vendor.example' })
  @IsOptional() @IsEmail() @Transform(trim)
  email?: string;

  @ApiPropertyOptional({ example: true, description: 'Primary address of this type' })
  @IsOptional() @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: 'Main fabrication yard' })
  @IsOptional() @IsString() @Transform(trim)
  remarks?: string;
}

export class VendorContactDto {
  @ApiProperty({ example: 'A. Rahman' })
  @IsString() @IsNotEmpty() @Length(2, 255) @Transform(trim)
  contactPerson: string;

  @ApiPropertyOptional({ example: 'Sales Manager' })
  @IsOptional() @IsString() @Length(1, 150) @Transform(trim)
  designation?: string;

  @ApiPropertyOptional({ example: 'Commercial' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  department?: string;

  @ApiPropertyOptional({ example: 'sales@vendor.example' })
  @IsOptional() @IsEmail() @Transform(trim)
  email?: string;

  @ApiPropertyOptional({ example: '+971 50 123 4567' })
  @IsOptional() @IsString() @Matches(PHONE_REGEX, { message: `mobileNumber ${PHONE_MESSAGE}` }) @Transform(trim)
  mobileNumber?: string;

  @ApiPropertyOptional({ example: '+971 4 123 4567' })
  @IsOptional() @IsString() @Matches(PHONE_REGEX, { message: `landlineNumber ${PHONE_MESSAGE}` }) @Transform(trim)
  landlineNumber?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Exactly one contact may be primary; it is mirrored onto the vendor record',
  })
  @IsOptional() @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: 'Preferred point of contact for technical queries' })
  @IsOptional() @IsString() @Transform(trim)
  remarks?: string;
}

export class VendorBankAccountDto {
  @ApiProperty({ example: 'Emirates NBD' })
  @IsString() @IsNotEmpty() @Length(2, 255) @Transform(trim)
  bankName: string;

  @ApiPropertyOptional({ example: 'Deira Main Branch' })
  @IsOptional() @IsString() @Length(1, 255) @Transform(trim)
  branch?: string;

  @ApiPropertyOptional({ example: 'ABC Engineering LLC' })
  @IsOptional() @IsString() @Length(1, 255) @Transform(trim)
  accountHolderName?: string;

  @ApiPropertyOptional({
    example: '1012345678901',
    description: 'SENSITIVE — masked in responses unless the caller holds the sensitive-data role',
  })
  @IsOptional() @IsString() @Length(4, 100)
  @Matches(/^[A-Za-z0-9\-]+$/, { message: 'accountNumber may only contain letters, digits, and hyphens' })
  @Transform(trim)
  accountNumber?: string;

  @ApiPropertyOptional({ example: 'AE070331234567890123456', description: 'SENSITIVE — masked in responses' })
  @IsOptional() @IsString() @Length(5, 50)
  @Matches(/^[A-Za-z0-9]+$/, { message: 'iban may only contain letters and digits' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase().replace(/\s/g, '') : value))
  iban?: string;

  @ApiPropertyOptional({ example: 'EBILAEAD', description: 'SENSITIVE — masked in responses' })
  @IsOptional() @IsString() @Length(8, 20)
  @Matches(/^[A-Za-z0-9]+$/, { message: 'swiftCode may only contain letters and digits' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  swiftCode?: string;

  @ApiPropertyOptional({ example: 'AED', description: 'ISO 4217 currency code' })
  @IsOptional() @IsString() @Length(3, 10)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  currency?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.BANK_TRANSFER })
  @IsOptional() @IsEnum(PaymentMethod)
  preferredPaymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  isPrimary?: boolean;
}

export class VendorCertificationDto {
  @ApiProperty({ example: 'ISO 9001:2015', description: 'Free text — the set of relevant standards is open-ended' })
  @IsString() @IsNotEmpty() @Length(2, 255) @Transform(trim)
  certificationName: string;

  @ApiPropertyOptional({ example: 'CERT-2024-88231' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  certificateNumber?: string;

  @ApiPropertyOptional({ example: 'TUV Rheinland' })
  @IsOptional() @IsString() @Length(1, 255) @Transform(trim)
  issuingAuthority?: string;

  @ApiPropertyOptional({ example: '2024-03-15' })
  @IsOptional() @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional({ example: '2027-03-14', description: 'Drives future expiry notifications and re-qualification' })
  @IsOptional() @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/certs/iso9001.pdf' })
  @IsOptional() @IsUrl(URL_OPTIONS) @Length(1, 1000) @Transform(trim)
  documentUrl?: string;

  @ApiPropertyOptional({ example: 'Fabrication and erection of pressure vessels' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  scopeOfCertification?: string;
}

export class VendorDocumentDto {
  @ApiProperty({ enum: VendorDocumentType, example: VendorDocumentType.TRADE_LICENSE })
  @IsEnum(VendorDocumentType)
  documentType: VendorDocumentType;

  @ApiProperty({
    example: 'https://storage.example.com/vendors/trade-licence.pdf',
    description: 'URL only — upload the binary via POST /vendors/documents/upload first',
  })
  @IsUrl(URL_OPTIONS) @IsNotEmpty() @Length(1, 1000) @Transform(trim)
  documentUrl: string;

  @ApiPropertyOptional({ example: 'trade-licence-2026.pdf' })
  @IsOptional() @IsString() @Length(1, 255) @Transform(trim)
  fileName?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsDateString()
  expiryDate?: string;
}

export class VendorMaterialDto {
  @ApiProperty({ example: 'uuid-of-material', description: 'Existing Material Master UUID' })
  @IsUUID() @IsNotEmpty()
  materialId: string;

  @ApiPropertyOptional({ example: 'VP-CS-6IN-S40' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  vendorPartNumber?: string;

  @ApiPropertyOptional({ example: 'TEN-A106B-6-40' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  manufacturerPartNumber?: string;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  leadTimeDays?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0)
  minimumOrderQuantity?: number;

  @ApiPropertyOptional({ example: 245.5 })
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional() @IsString() @Length(3, 10)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  currency?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Preference is per material, not a global vendor property',
  })
  @IsOptional() @IsBoolean()
  isPreferred?: boolean;
}

export class VendorTurnoverDto {
  @ApiProperty({ example: 2025 })
  @Type(() => Number) @IsInt() @Min(1900) @Max(2200)
  financialYear: number;

  @ApiProperty({ example: 15000000.0, description: 'Stored as DECIMAL(18,4) — never floating point' })
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0)
  turnover: number;

  @ApiProperty({ example: 'USD', description: 'ISO 4217 currency code' })
  @IsString() @IsNotEmpty() @Length(3, 10)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  currency: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  isAudited?: boolean;

  @ApiPropertyOptional({ example: 'https://storage.example.com/fin/2025.pdf' })
  @IsOptional() @IsUrl(URL_OPTIONS) @Length(1, 1000) @Transform(trim)
  financialStatementUrl?: string;
}

// ── Grouped optional sections on the vendor itself ─────────────────────────

export class VendorStatutoryDto {
  @ApiPropertyOptional({ example: 'CN-1234567' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  businessRegistrationNumber?: string;

  @ApiPropertyOptional({ example: '100123456700003' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  taxRegistrationNumber?: string;

  @ApiPropertyOptional({ example: 'AAACX1234C' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  taxDocumentNumber?: string;

  @ApiPropertyOptional({
    enum: TaxDocumentType,
    example: TaxDocumentType.VAT,
    description: 'Tax regime varies by country — GST is not assumed',
  })
  @IsOptional() @IsEnum(TaxDocumentType)
  taxDocumentType?: TaxDocumentType;

  @ApiPropertyOptional({ example: 'IEC0912345' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  importExportCode?: string;

  @ApiPropertyOptional({ example: 'UDYAM-XX-00-0000000' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  msmeSmeRegistration?: string;
}

export class VendorCommercialDto {
  @ApiPropertyOptional({ enum: PaymentTerms, example: PaymentTerms.NET_45 })
  @IsOptional() @IsEnum(PaymentTerms)
  paymentTerms?: PaymentTerms;

  @ApiPropertyOptional({ example: '30% advance, 60% on delivery, 10% on commissioning' })
  @IsOptional() @IsString() @Transform(trim)
  paymentMilestones?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.BANK_TRANSFER })
  @IsOptional() @IsEnum(PaymentMethod)
  preferredPaymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 500000.0 })
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0)
  creditLimitRequested?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional() @IsString() @Length(3, 10)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  currency?: string;

  @ApiPropertyOptional({ example: 'A- (Dun & Bradstreet)' })
  @IsOptional() @IsString() @Length(1, 50) @Transform(trim)
  creditRating?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/fin/audited-2025.pdf' })
  @IsOptional() @IsUrl(URL_OPTIONS) @Length(1, 1000) @Transform(trim)
  auditedFinancialStatementsUrl?: string;

  @ApiPropertyOptional({ example: 'Rate contract with quarterly price revision' })
  @IsOptional() @IsString() @Transform(trim)
  priceStructure?: string;

  @ApiPropertyOptional({ example: '5% on orders above USD 250,000' })
  @IsOptional() @IsString() @Transform(trim)
  discountTerms?: string;

  @ApiPropertyOptional({ type: [String], example: ['CT-2024-0091', 'CT-2025-0140'] })
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true })
  contractReferenceNumbers?: string[];

  @ApiPropertyOptional({ example: 'Public liability USD 5M, workmen compensation as per local law' })
  @IsOptional() @IsString() @Transform(trim)
  insuranceCoverage?: string;
}

export class VendorTechnicalDto {
  @ApiPropertyOptional({ type: [String], example: ['Piping', 'Structural Steel'] })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true })
  productCategories?: string[];

  @ApiPropertyOptional({ type: [String], example: ['NDT Inspection', 'Heat Treatment'] })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true })
  serviceCategories?: string[];

  @ApiPropertyOptional({ example: 'ASME Section VIII pressure vessel design and fabrication' })
  @IsOptional() @IsString() @Transform(trim)
  technicalExpertiseAreas?: string;

  @ApiPropertyOptional({ example: 'CNC machining, plate rolling up to 60mm, automated SAW welding' })
  @IsOptional() @IsString() @Transform(trim)
  manufacturingCapabilities?: string;

  @ApiPropertyOptional({ example: '4,000 MT per annum structural fabrication' })
  @IsOptional() @IsString() @Transform(trim)
  productionCapacity?: string;

  @ApiPropertyOptional({ example: '2 x 50T EOT cranes, 1 x 5-axis CNC, radiography bunker' })
  @IsOptional() @IsString() @Transform(trim)
  keyEquipmentList?: string;

  @ApiPropertyOptional({ example: 'ITP-driven inspection with third-party witness points' })
  @IsOptional() @IsString() @Transform(trim)
  qualityControlProcesses?: string;

  @ApiPropertyOptional({ type: [String], example: ['https://storage.example.com/ds/pipe.pdf'] })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true })
  technicalDatasheets?: string[];

  @ApiPropertyOptional({ example: 'ASME, API 5L, EN 10204 3.2' })
  @IsOptional() @IsString() @Transform(trim)
  complianceStandards?: string;
}

export class VendorQualityHseDto {
  @ApiPropertyOptional({ example: 'ISO 9001:2015 certified QMS with documented procedures' })
  @IsOptional() @IsString() @Transform(trim)
  qualityManagementSystemDetails?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/hse/policy.pdf' })
  @IsOptional() @IsUrl(URL_OPTIONS) @Length(1, 1000) @Transform(trim)
  hsePolicyUrl?: string;

  @ApiPropertyOptional({ example: 'Zero LTI in the last 36 months; 2 first-aid cases in 2024' })
  @IsOptional() @IsString() @Transform(trim)
  incidentAccidentHistory?: string;

  @ApiPropertyOptional({ example: 'Local community skills programme; annual CSR report published' })
  @IsOptional() @IsString() @Transform(trim)
  csrCompliance?: string;

  @ApiPropertyOptional({ example: 'Conflict-minerals declaration on file' })
  @IsOptional() @IsString() @Transform(trim)
  ethicalSourcingPolicy?: string;

  @ApiPropertyOptional({ example: 'Signed anti-bribery and anti-corruption undertaking' })
  @IsOptional() @IsString() @Transform(trim)
  antiBriberyPolicy?: string;
}

export class VendorExperienceDto {
  @ApiPropertyOptional({ type: [String], example: ['Client A', 'Client B'] })
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true })
  majorClients?: string[];

  @ApiPropertyOptional({ example: 'Refinery revamp packages, 3 x offshore platform modules' })
  @IsOptional() @IsString() @Transform(trim)
  projectExperience?: string;

  @ApiPropertyOptional({ example: 'PO-2023-0451, PO-2024-0912' })
  @IsOptional() @IsString() @Transform(trim)
  pastPoContractReferences?: string;

  @ApiPropertyOptional({ example: 'No prior blacklisting declared' })
  @IsOptional() @IsString() @Transform(trim)
  blacklistingHistory?: string;

  @ApiPropertyOptional({ type: [String], example: ['AE', 'SA', 'IN'] })
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true })
  geographicalExperience?: string[];
}

export class VendorLogisticsDto {
  @ApiPropertyOptional({ example: 30 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  standardLeadTimeDays?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0)
  minimumOrderQuantity?: number;

  @ApiPropertyOptional({ enum: DeliveryCapability, example: DeliveryCapability.BOTH })
  @IsOptional() @IsEnum(DeliveryCapability)
  deliveryCapability?: DeliveryCapability;

  @ApiPropertyOptional({ type: [String], example: ['Jebel Ali FZ', 'Dammam Port'] })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true })
  warehouseLocations?: string[];

  @ApiPropertyOptional({
    enum: TransportationMode,
    isArray: true,
    example: [TransportationMode.SEA, TransportationMode.ROAD],
    description: 'Reuses the Material Master TransportationMode vocabulary',
  })
  @IsOptional() @IsArray() @IsEnum(TransportationMode, { each: true })
  transportModesSupported?: TransportationMode[];

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  exportDocumentationCapability?: boolean;
}

export class VendorEvaluationSummaryDto {
  @ApiPropertyOptional({ example: 82.5, description: 'Rolled-up score 0–100' })
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100)
  vendorEvaluationScore?: number;

  @ApiPropertyOptional({ enum: RiskCategory, example: RiskCategory.LOW })
  @IsOptional() @IsEnum(RiskCategory)
  riskCategory?: RiskCategory;

  @ApiPropertyOptional({
    enum: VendorClassification,
    example: VendorClassification.APPROVED,
    description: 'AVL standing — distinct from vendorStatus and isActive',
  })
  @IsOptional() @IsEnum(VendorClassification)
  vendorClassification?: VendorClassification;

  @ApiPropertyOptional({ example: 'AVL-2026-0031' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  approvalReference?: string;

  @ApiPropertyOptional({ example: '2026-02-01' })
  @IsOptional() @IsDateString()
  approvalDate?: string;

  @ApiPropertyOptional({ enum: ReviewCycle, example: ReviewCycle.ANNUAL })
  @IsOptional() @IsEnum(ReviewCycle)
  reviewCycle?: ReviewCycle;

  @ApiPropertyOptional({ example: '2027-02-01' })
  @IsOptional() @IsDateString()
  nextReviewDate?: string;
}

// ── Root create DTO ────────────────────────────────────────────────────────

export class CreateVendorDto {
  // ── Core (required) ───────────────────────────────────────────────
  // NOTE: `code` is absent by design — it is server-generated from the
  // Industry Category prefix and a locked counter. Supplying it is rejected.

  @ApiProperty({ example: 'ABC Engineering LLC', description: 'Legal vendor name (unique within the organization)' })
  @IsString() @IsNotEmpty() @Length(2, 255) @Transform(trim)
  vendorName: string;

  @ApiProperty({
    example: 'uuid-of-vendor-type',
    description:
      'Vendor Type UUID (GET /vendor-types/active). Must exist, belong to this ' +
      'organization, be active and not deleted.',
  })
  @IsUUID() @IsNotEmpty()
  vendorTypeId: string;

  @ApiProperty({
    example: 'uuid-of-industry-category',
    description:
      'Industry Category UUID. Must exist, belong to this organization, be active and not deleted. ' +
      'Its name supplies the 3-character vendor-code prefix.',
  })
  @IsUUID() @IsNotEmpty()
  industryCategoryId: string;

  // ── Core (optional) ───────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'Fabrication and supply of piping spools and structural steel' })
  @IsOptional() @IsString() @Length(1, 4000) @Transform(trim)
  vendorDescription?: string;

  @ApiPropertyOptional({ example: 'ABC Fabricators', description: 'Operating/brand name if different from the legal name' })
  @IsOptional() @IsString() @Length(1, 255) @Transform(trim)
  tradeName?: string;

  @ApiPropertyOptional({
    example: 'uuid-of-parent-vendor',
    description: 'Parent company (another Vendor). Self-reference and cycles are rejected.',
  })
  @IsOptional() @IsUUID()
  parentCompanyId?: string;

  // ── Primary contact (mirrored to/from the primary VendorContact row) ──

  @ApiPropertyOptional({ example: 'A. Rahman' })
  @IsOptional() @IsString() @Length(1, 255) @Transform(trim)
  primaryContactPerson?: string;

  @ApiPropertyOptional({ example: 'Sales Manager' })
  @IsOptional() @IsString() @Length(1, 150) @Transform(trim)
  designation?: string;

  @ApiPropertyOptional({ example: 'contact@vendor.example' })
  @IsOptional() @IsEmail({}, { message: 'email must be a valid email address' }) @Length(1, 255) @Transform(trim)
  email?: string;

  @ApiPropertyOptional({ example: '+971 50 123 4567', description: 'Stored as text — international formats supported' })
  @IsOptional() @IsString() @Matches(PHONE_REGEX, { message: `mobileNumber ${PHONE_MESSAGE}` }) @Transform(trim)
  mobileNumber?: string;

  @ApiPropertyOptional({ example: '+971 4 123 4567' })
  @IsOptional() @IsString() @Matches(PHONE_REGEX, { message: `landlineNumber ${PHONE_MESSAGE}` }) @Transform(trim)
  landlineNumber?: string;

  @ApiPropertyOptional({
    example: 'https://vendor.example.ae',
    description: 'Any public TLD is accepted (.com, .ae, .co.in, .co.uk, …)',
  })
  @IsOptional() @IsUrl(URL_OPTIONS, { message: 'website must be a valid URL including http:// or https://' })
  @Length(1, 500) @Transform(trim)
  website?: string;

  @ApiPropertyOptional({ example: 'AE', description: 'ISO 3166-1 alpha-2 country of legal registration' })
  @IsOptional() @IsISO31661Alpha2({ message: 'countryOfRegistration must be an ISO 3166-1 alpha-2 code' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  countryOfRegistration?: string;

  @ApiPropertyOptional({ example: 'Introduced by the projects team for the expansion package' })
  @IsOptional() @IsString() @Transform(trim)
  remarks?: string;

  // ── Grouped optional sections ─────────────────────────────────────

  @ApiPropertyOptional({ type: () => VendorStatutoryDto })
  @IsOptional() @ValidateNested() @Type(() => VendorStatutoryDto)
  statutory?: VendorStatutoryDto;

  @ApiPropertyOptional({ type: () => VendorCommercialDto })
  @IsOptional() @ValidateNested() @Type(() => VendorCommercialDto)
  commercial?: VendorCommercialDto;

  @ApiPropertyOptional({ type: () => VendorTechnicalDto })
  @IsOptional() @ValidateNested() @Type(() => VendorTechnicalDto)
  technical?: VendorTechnicalDto;

  @ApiPropertyOptional({ type: () => VendorQualityHseDto })
  @IsOptional() @ValidateNested() @Type(() => VendorQualityHseDto)
  qualityHse?: VendorQualityHseDto;

  @ApiPropertyOptional({ type: () => VendorExperienceDto })
  @IsOptional() @ValidateNested() @Type(() => VendorExperienceDto)
  experience?: VendorExperienceDto;

  @ApiPropertyOptional({ type: () => VendorLogisticsDto })
  @IsOptional() @ValidateNested() @Type(() => VendorLogisticsDto)
  logistics?: VendorLogisticsDto;

  @ApiPropertyOptional({
    type: () => VendorEvaluationSummaryDto,
    description:
      'Optional pre-qualification summary. Supplying it does NOT approve the vendor — ' +
      'a new vendor always starts UNDER_EVALUATION.',
  })
  @IsOptional() @ValidateNested() @Type(() => VendorEvaluationSummaryDto)
  evaluation?: VendorEvaluationSummaryDto;

  // ── Child collections (all created inside the same transaction) ───

  @ApiPropertyOptional({ type: [VendorAddressDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => VendorAddressDto)
  addresses?: VendorAddressDto[];

  @ApiPropertyOptional({ type: [VendorContactDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => VendorContactDto)
  contacts?: VendorContactDto[];

  @ApiPropertyOptional({ type: [VendorBankAccountDto], description: 'SENSITIVE — masked in responses' })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => VendorBankAccountDto)
  bankAccounts?: VendorBankAccountDto[];

  @ApiPropertyOptional({ type: [VendorCertificationDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => VendorCertificationDto)
  certifications?: VendorCertificationDto[];

  @ApiPropertyOptional({ type: [VendorDocumentDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => VendorDocumentDto)
  documents?: VendorDocumentDto[];

  @ApiPropertyOptional({ type: [VendorMaterialDto], description: 'Materials this vendor can supply' })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => VendorMaterialDto)
  materials?: VendorMaterialDto[];

  @ApiPropertyOptional({ type: [VendorTurnoverDto], description: 'Multi-year declared turnover' })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => VendorTurnoverDto)
  turnovers?: VendorTurnoverDto[];

  @ApiPropertyOptional({
    type: [VendorProjectExperienceDto],
    description:
      "Past projects offered as evidence of capability. Supersedes the deprecated " +
      "experience.majorClients / projectExperience / pastPoContractReferences / " +
      "blacklistingHistory text fields — one structured row per project.",
  })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true })
  @Type(() => VendorProjectExperienceDto)
  projectExperiences?: VendorProjectExperienceDto[];
}
