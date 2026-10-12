import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsEnum, IsISO31661Alpha2, IsNotEmpty,
  IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaymentTerms } from '../../vendor/enums/payment-terms.enum';
import {
  ClientAddressType, ClientContactRole, ClientStatus, Incoterm, LegalEntityType,
  MeasurementSystem, PreferredContactMethod,
} from '../enums/client.enums';

// Optional text fields accept `null` as well as a string: on update, null is how
// a caller clears a value that was previously set (undefined means "unchanged").

/** `+` and country code followed by the number, as the other masters store it. */
export const CLIENT_PHONE_REGEX = /^\+[0-9\s\-().]{6,24}$/;
/** Letters, digits and the separators business registers use. */
export const CLIENT_REGISTRATION_REGEX = /^[A-Za-z0-9][A-Za-z0-9\-./ ]{1,48}[A-Za-z0-9]$/;
/** A bare domain or a full http(s) URL. */
export const CLIENT_WEBSITE_REGEX = /^(https?:\/\/)?([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(:\d+)?(\/\S*)?$/;

const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

// ── Address ─────────────────────────────────────────────────────────────────

export class ClientAddressDto {
  @ApiPropertyOptional({ description: 'Present when updating an existing address' })
  @IsOptional() @IsUUID()
  id?: string;

  @ApiProperty({ enum: ClientAddressType })
  @IsEnum(ClientAddressType)
  addressType: ClientAddressType;

  @ApiPropertyOptional({ example: 'Dubai Regional Office', nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  label?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(255)
  addressLine1?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(255)
  addressLine2?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  city?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  state?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(20)
  postalCode?: string | null;

  @ApiPropertyOptional({ example: 'AE', description: 'ISO 3166-1 alpha-2', nullable: true })
  @IsOptional() @Transform(upper) @IsISO31661Alpha2()
  countryCode?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

// ── Contact ─────────────────────────────────────────────────────────────────

export class ClientContactDto {
  @ApiPropertyOptional({ description: 'Present when updating an existing contact' })
  @IsOptional() @IsUUID()
  id?: string;

  @ApiProperty({ example: 'Priya Raman' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  contactName: string;

  @ApiPropertyOptional({ example: 'Senior Procurement Lead', nullable: true })
  @IsOptional() @IsString() @MaxLength(150)
  jobTitle?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  department?: string | null;

  @ApiPropertyOptional({ enum: ClientContactRole, nullable: true })
  @IsOptional() @IsEnum(ClientContactRole)
  contactRole?: ClientContactRole | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsEmail() @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ example: '+971 4 123 4567', nullable: true })
  @IsOptional() @Matches(CLIENT_PHONE_REGEX, { message: 'phone must start with + and the country code' })
  phone?: string | null;

  @ApiPropertyOptional({ example: '+971 50 123 4567', nullable: true })
  @IsOptional() @Matches(CLIENT_PHONE_REGEX, { message: 'mobile must start with + and the country code' })
  mobile?: string | null;

  @ApiPropertyOptional({ enum: PreferredContactMethod, nullable: true })
  @IsOptional() @IsEnum(PreferredContactMethod)
  preferredContactMethod?: PreferredContactMethod | null;

  @ApiPropertyOptional({ default: false, description: 'At most one active contact may be primary' })
  @IsOptional() @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  isProjectContact?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  isProcurementContact?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  isFinanceContact?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

// ── Commercial ──────────────────────────────────────────────────────────────

export class ClientCommercialDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(255)
  legalEntityName?: string | null;

  @ApiPropertyOptional({ enum: LegalEntityType, nullable: true })
  @IsOptional() @IsEnum(LegalEntityType)
  legalEntityType?: LegalEntityType | null;

  @ApiPropertyOptional({ description: 'Business registration number', nullable: true })
  @IsOptional() @Matches(CLIENT_REGISTRATION_REGEX, { message: 'registrationNumber contains invalid characters' })
  registrationNumber?: string | null;

  @ApiPropertyOptional({ description: 'Tax / VAT / GST number', nullable: true })
  @IsOptional() @Matches(CLIENT_REGISTRATION_REGEX, { message: 'taxRegistrationNumber contains invalid characters' })
  taxRegistrationNumber?: string | null;

  @ApiPropertyOptional({ description: 'D-U-N-S or another external business identifier', nullable: true })
  @IsOptional() @IsString() @MaxLength(50)
  externalBusinessId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(255)
  contractingEntityName?: string | null;

  @ApiPropertyOptional({ example: 'USD', description: 'ISO 4217', nullable: true })
  @IsOptional() @Transform(upper) @Matches(/^[A-Z]{3}$/, { message: 'defaultCurrencyCode must be a 3-letter ISO 4217 code' })
  defaultCurrencyCode?: string | null;

  @ApiPropertyOptional({ enum: PaymentTerms, nullable: true })
  @IsOptional() @IsEnum(PaymentTerms)
  defaultPaymentTerms?: PaymentTerms | null;

  @ApiPropertyOptional({ example: 'CTR-{CLIENT}-{YEAR}-{SEQ}', nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  contractReferenceFormat?: string | null;

  @ApiPropertyOptional({ example: 'PO-{PROJECT}-{SEQ}', nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  purchaseOrderReferenceFormat?: string | null;

  @ApiPropertyOptional({ enum: Incoterm, nullable: true })
  @IsOptional() @IsEnum(Incoterm)
  defaultIncoterms?: Incoterm | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  taxRegion?: string | null;

  @ApiPropertyOptional({ example: 'DD-MMM-YYYY', nullable: true })
  @IsOptional() @IsString() @MaxLength(20)
  dateFormat?: string | null;
}

// ── Project defaults ────────────────────────────────────────────────────────

export class ClientProjectDefaultsDto {
  @ApiPropertyOptional({ description: 'Project Type master id', nullable: true })
  @IsOptional() @IsUUID()
  defaultProjectTypeId?: string | null;

  @ApiPropertyOptional({ example: 'USD', nullable: true })
  @IsOptional() @Transform(upper) @Matches(/^[A-Z]{3}$/, { message: 'defaultProjectCurrencyCode must be a 3-letter ISO 4217 code' })
  defaultProjectCurrencyCode?: string | null;

  @ApiPropertyOptional({ enum: MeasurementSystem, nullable: true })
  @IsOptional() @IsEnum(MeasurementSystem)
  measurementSystem?: MeasurementSystem | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  documentNumberingScheme?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  defaultWbsTemplate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  defaultCostCodeScheme?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  defaultApprovalWorkflow?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(255)
  defaultProcurementTerms?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @Matches(CLIENT_WEBSITE_REGEX, { message: 'documentPortalUrl must be a valid URL' }) @MaxLength(500)
  documentPortalUrl?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  requiresClientApproval?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  requiresDocumentControl?: boolean;
}

// ── Client ──────────────────────────────────────────────────────────────────

export class CreateClientDto {
  // NOTE: `code` is absent by design — it is server-generated as a
  // per-organization sequence starting at 0001. Supplying it has no effect.

  @ApiProperty({ example: 'Gulf Petrochemical Holdings' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  clientName: string;

  @ApiPropertyOptional({ example: 'GPH', nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  displayName?: string | null;

  @ApiProperty({ description: 'Client Type master id (Owner, Operator, EPC Contractor …)' })
  @IsUUID()
  clientTypeId: string;

  @ApiPropertyOptional({ description: 'Industry Category master id', nullable: true })
  @IsOptional() @IsUUID()
  industryCategoryId?: string | null;

  @ApiPropertyOptional({ description: 'Parent organization of a subsidiary', nullable: true })
  @IsOptional() @IsUUID()
  parentClientId?: string | null;

  @ApiPropertyOptional({ example: 'www.example.com', nullable: true })
  @IsOptional() @Matches(CLIENT_WEBSITE_REGEX, { message: 'website must be a valid URL' }) @MaxLength(255)
  website?: string | null;

  @ApiPropertyOptional({ example: 'AE', description: 'Country of registration, ISO 3166-1 alpha-2', nullable: true })
  @IsOptional() @Transform(upper) @IsISO31661Alpha2()
  countryCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(4000)
  description?: string | null;

  @ApiPropertyOptional({ description: 'Internal remarks', nullable: true })
  @IsOptional() @IsString() @MaxLength(4000)
  notes?: string | null;

  @ApiPropertyOptional({ enum: ClientStatus, default: ClientStatus.ACTIVE })
  @IsOptional() @IsEnum(ClientStatus)
  status?: ClientStatus;

  // ── Addresses ──
  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  operationalAddressSameAsRegistered?: boolean;

  @ApiPropertyOptional({ example: 'Asia/Dubai', nullable: true })
  @IsOptional() @IsString() @MaxLength(64)
  timeZone?: string | null;

  @ApiPropertyOptional({ example: 'en', nullable: true })
  @IsOptional() @IsString() @MaxLength(10)
  preferredLanguage?: string | null;

  @ApiPropertyOptional({
    type: [ClientAddressDto],
    description:
      'The complete set of addresses. Entries with an id are updated, entries without one are ' +
      'created, and existing addresses that are not listed are removed.',
  })
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ClientAddressDto)
  addresses?: ClientAddressDto[];

  @ApiPropertyOptional({
    type: [ClientContactDto],
    description: 'The complete set of contacts, synchronised the same way as addresses.',
  })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => ClientContactDto)
  contacts?: ClientContactDto[];

  @ApiPropertyOptional({ type: ClientCommercialDto })
  @IsOptional() @ValidateNested() @Type(() => ClientCommercialDto)
  commercial?: ClientCommercialDto;

  @ApiPropertyOptional({ type: ClientProjectDefaultsDto })
  @IsOptional() @ValidateNested() @Type(() => ClientProjectDefaultsDto)
  projectDefaults?: ClientProjectDefaultsDto;
}

