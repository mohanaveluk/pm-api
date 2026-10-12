import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ClientAddressType, ClientAuditAction, ClientContactRole, ClientDocumentType,
  ClientStatus, MeasurementSystem, PreferredContactMethod,
} from '../enums/client.enums';

export class ClientAddressResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: ClientAddressType }) addressType: ClientAddressType;
  @ApiPropertyOptional() label: string | null;
  @ApiPropertyOptional() addressLine1: string | null;
  @ApiPropertyOptional() addressLine2: string | null;
  @ApiPropertyOptional() city: string | null;
  @ApiPropertyOptional() state: string | null;
  @ApiPropertyOptional() postalCode: string | null;
  @ApiPropertyOptional() countryCode: string | null;
  @ApiProperty() isActive: boolean;
}

export class ClientContactResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() contactName: string;
  @ApiPropertyOptional() jobTitle: string | null;
  @ApiPropertyOptional() department: string | null;
  @ApiPropertyOptional({ enum: ClientContactRole }) contactRole: ClientContactRole | null;
  @ApiPropertyOptional() email: string | null;
  @ApiPropertyOptional() phone: string | null;
  @ApiPropertyOptional() mobile: string | null;
  @ApiPropertyOptional({ enum: PreferredContactMethod }) preferredContactMethod: PreferredContactMethod | null;
  @ApiProperty() isPrimary: boolean;
  @ApiProperty() isProjectContact: boolean;
  @ApiProperty() isProcurementContact: boolean;
  @ApiProperty() isFinanceContact: boolean;
  @ApiProperty() isActive: boolean;
}

export class ClientDocumentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: ClientDocumentType }) documentType: ClientDocumentType;
  @ApiProperty() documentName: string;
  @ApiPropertyOptional() documentNumber: string | null;
  @ApiPropertyOptional() issueDate: string | null;
  @ApiPropertyOptional() expiryDate: string | null;
  @ApiProperty() documentUrl: string;
  @ApiPropertyOptional() fileName: string | null;
  @ApiPropertyOptional() mimeType: string | null;
  @ApiPropertyOptional() fileSizeBytes: number | null;
  @ApiPropertyOptional() documentVersion: string | null;
  @ApiPropertyOptional() remarks: string | null;
  @ApiPropertyOptional() uploadedBy: string | null;
  @ApiPropertyOptional() uploadedAt: Date | null;
  @ApiProperty() isExpired: boolean;
}

export class ClientCommercialResponseDto {
  @ApiPropertyOptional() legalEntityName: string | null;
  @ApiPropertyOptional() legalEntityType: string | null;
  @ApiPropertyOptional() registrationNumber: string | null;
  @ApiPropertyOptional() taxRegistrationNumber: string | null;
  @ApiPropertyOptional() externalBusinessId: string | null;
  @ApiPropertyOptional() contractingEntityName: string | null;
  @ApiPropertyOptional() defaultCurrencyCode: string | null;
  @ApiPropertyOptional() defaultPaymentTerms: string | null;
  @ApiPropertyOptional() contractReferenceFormat: string | null;
  @ApiPropertyOptional() purchaseOrderReferenceFormat: string | null;
  @ApiPropertyOptional() defaultIncoterms: string | null;
  @ApiPropertyOptional() taxRegion: string | null;
  @ApiPropertyOptional() dateFormat: string | null;
}

export class ClientProjectDefaultsResponseDto {
  @ApiPropertyOptional() defaultProjectTypeId: string | null;
  @ApiPropertyOptional() defaultProjectTypeName: string | null;
  @ApiPropertyOptional() defaultProjectCurrencyCode: string | null;
  @ApiPropertyOptional({ enum: MeasurementSystem }) measurementSystem: MeasurementSystem | null;
  @ApiPropertyOptional() documentNumberingScheme: string | null;
  @ApiPropertyOptional() defaultWbsTemplate: string | null;
  @ApiPropertyOptional() defaultCostCodeScheme: string | null;
  @ApiPropertyOptional() defaultApprovalWorkflow: string | null;
  @ApiPropertyOptional() defaultProcurementTerms: string | null;
  @ApiPropertyOptional() documentPortalUrl: string | null;
  @ApiProperty() requiresClientApproval: boolean;
  @ApiProperty() requiresDocumentControl: boolean;
}

/** A row of the list: identity, classification and the primary contact. */
export class ClientListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() clientName: string;
  @ApiPropertyOptional() displayName: string | null;
  @ApiProperty() clientTypeId: string;
  @ApiPropertyOptional() clientTypeName: string | null;
  @ApiPropertyOptional() industryCategoryId: string | null;
  @ApiPropertyOptional() industryCategoryName: string | null;
  @ApiPropertyOptional() parentClientId: string | null;
  @ApiPropertyOptional() parentClientName: string | null;
  @ApiPropertyOptional() countryCode: string | null;
  @ApiPropertyOptional() website: string | null;
  @ApiProperty({ enum: ClientStatus }) status: ClientStatus;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() primaryContactName: string | null;
  @ApiPropertyOptional() primaryContactEmail: string | null;
  @ApiPropertyOptional() primaryContactPhone: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class ClientResponseDto extends ClientListItemDto {
  @ApiProperty() dguid: string;
  @ApiProperty() organizationId: string;
  @ApiPropertyOptional() description: string | null;
  @ApiPropertyOptional() notes: string | null;
  @ApiProperty() version: number;

  @ApiProperty() operationalAddressSameAsRegistered: boolean;
  @ApiPropertyOptional() timeZone: string | null;
  @ApiPropertyOptional() preferredLanguage: string | null;

  @ApiProperty({ type: [ClientAddressResponseDto] }) addresses: ClientAddressResponseDto[];
  @ApiProperty({ type: [ClientContactResponseDto] }) contacts: ClientContactResponseDto[];
  @ApiProperty({ type: [ClientDocumentResponseDto] }) documents: ClientDocumentResponseDto[];
  @ApiProperty({ type: ClientCommercialResponseDto }) commercial: ClientCommercialResponseDto;
  @ApiProperty({ type: ClientProjectDefaultsResponseDto }) projectDefaults: ClientProjectDefaultsResponseDto;

  @ApiPropertyOptional() deactivatedBy: string | null;
  @ApiPropertyOptional() deactivatedAt: Date | null;
  @ApiPropertyOptional() deactivationReason: string | null;
  @ApiPropertyOptional() createdBy: string | null;
  @ApiPropertyOptional() updatedBy: string | null;
}

export class ClientListResponseDto {
  @ApiProperty({ type: [ClientListItemDto] }) items: ClientListItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}

export class ClientOptionDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() clientName: string;
  @ApiPropertyOptional() displayName: string | null;
  @ApiProperty() clientTypeId: string;
  @ApiPropertyOptional() countryCode: string | null;

  // Defaults a project created for this client starts from (all optional).
  @ApiPropertyOptional() defaultCurrencyCode: string | null;
  @ApiPropertyOptional() defaultProjectCurrencyCode: string | null;
  @ApiPropertyOptional() defaultProjectTypeId: string | null;
  @ApiPropertyOptional({ enum: MeasurementSystem }) measurementSystem: MeasurementSystem | null;
  @ApiPropertyOptional() timeZone: string | null;
}

export class ClientAuditEntryDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: ClientAuditAction }) action: ClientAuditAction;
  @ApiPropertyOptional() summary: string | null;
  @ApiPropertyOptional() changes: Array<{ field: string; from: string | null; to: string | null }> | null;
  @ApiPropertyOptional() performedBy: string | null;
  @ApiPropertyOptional() version: number | null;
  @ApiProperty() createdAt: Date;
}
