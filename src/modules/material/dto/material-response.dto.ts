import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaterialStatus }     from '../enums/material-status.enum';
import { CriticalityLevel }   from '../enums/criticality-level.enum';

export class MaterialDropdownDto {
  @ApiProperty() id: string;
  @ApiProperty() dguid: string;
  @ApiProperty() code: string;
  @ApiProperty() shortDescription: string;
  @ApiProperty() unitOfMeasurementId: string;
  @ApiProperty() status: MaterialStatus;
  @ApiProperty() criticalityLevel: CriticalityLevel;
  @ApiProperty() isStockItem: boolean;
}

export class MaterialListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() dguid: string;
  @ApiProperty() code: string;
  @ApiProperty() shortDescription: string;
  @ApiPropertyOptional() longDescription?: string;
  @ApiProperty() materialCategoryId: string;
  @ApiProperty() materialGroupId: string;
  @ApiProperty() unitOfMeasurementId: string;
  @ApiProperty({ enum: MaterialStatus }) status: MaterialStatus;
  @ApiProperty({ enum: CriticalityLevel }) criticalityLevel: CriticalityLevel;
  @ApiProperty() isSystem: boolean;
  @ApiProperty() isStockItem: boolean;
  @ApiProperty() isSerialized: boolean;
  @ApiProperty() isBatchManaged: boolean;
  @ApiPropertyOptional() manufacturerName?: string;
  @ApiPropertyOptional() modelPartNumber?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  // joined names for display
  @ApiPropertyOptional() materialCategoryName?: string;
  @ApiPropertyOptional() materialGroupName?: string;
  @ApiPropertyOptional() uomSymbol?: string;
}

export class MaterialResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() dguid: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() code: string;
  @ApiProperty() shortDescription: string;
  @ApiPropertyOptional() longDescription?: string;
  @ApiProperty({ enum: MaterialStatus }) status: MaterialStatus;
  @ApiProperty({ enum: CriticalityLevel }) criticalityLevel: CriticalityLevel;
  @ApiProperty() isSystem: boolean;
  @ApiProperty() isStockItem: boolean;
  @ApiProperty() isSerialized: boolean;
  @ApiProperty() isBatchManaged: boolean;
  @ApiPropertyOptional() remarks?: string;

  // Relations
  @ApiProperty() materialCategoryId: string;
  @ApiProperty() materialGroupId: string;
  @ApiProperty() unitOfMeasurementId: string;
  @ApiPropertyOptional() materialCategory?: any;
  @ApiPropertyOptional() materialGroup?: any;
  @ApiPropertyOptional() unitOfMeasurement?: any;

  // Technical Spec
  @ApiPropertyOptional() technicalDescription?: string;
  @ApiPropertyOptional() modelPartNumber?: string;
  @ApiPropertyOptional() manufacturerName?: string;
  @ApiPropertyOptional() manufacturerPartNumber?: string;
  @ApiPropertyOptional() brand?: string;
  @ApiPropertyOptional() materialComposition?: string;
  @ApiPropertyOptional() dimensions?: string;
  @ApiPropertyOptional() weight?: string;
  @ApiPropertyOptional() colorFinish?: string;
  @ApiPropertyOptional() operatingTemperatureRange?: string;
  @ApiPropertyOptional() pressureRating?: string;
  @ApiPropertyOptional() voltageCurrentRating?: string;
  @ApiPropertyOptional() certifications?: string;
  @ApiPropertyOptional() datasheetReference?: string;

  // Procurement
  @ApiPropertyOptional() preferredVendorId?: string;
  @ApiPropertyOptional() vendorPartNumber?: string;
  @ApiPropertyOptional() leadTimeDays?: number;
  @ApiPropertyOptional() minimumOrderQuantity?: number;
  @ApiPropertyOptional() reorderLevel?: number;
  @ApiPropertyOptional() reorderQuantity?: number;
  @ApiPropertyOptional() purchaseUomId?: string;
  @ApiPropertyOptional() lastPurchasePrice?: number;
  @ApiPropertyOptional() currency?: string;
  @ApiPropertyOptional() contractReference?: string;
  @ApiPropertyOptional() hsCode?: string;
  @ApiPropertyOptional() countryOfOrigin?: string;

  // Inventory
  @ApiPropertyOptional() storageLocation?: string;
  @ApiPropertyOptional() warehouseBinRack?: string;
  @ApiPropertyOptional() storageConditions?: string;
  @ApiPropertyOptional() shelfLifeDays?: number;
  @ApiPropertyOptional() stockingStrategy?: string;
  @ApiPropertyOptional() safetyStock?: number;
  @ApiPropertyOptional() maximumStockLevel?: number;

  // Quality
  @ApiPropertyOptional() inspectionType?: string;
  @ApiPropertyOptional() qualitySpecDocumentNo?: string;
  @ApiPropertyOptional() inspectionLotSize?: number;
  @ApiPropertyOptional() samplingProcedure?: string;
  @ApiPropertyOptional() testParameters?: string;
  @ApiPropertyOptional() acceptanceCriteria?: string;
  @ApiPropertyOptional() calibrationRequired?: boolean;
  @ApiPropertyOptional() calibrationIntervalDays?: number;

  // Accounting
  @ApiPropertyOptional() valuationClass?: string;
  @ApiPropertyOptional() valuationType?: string;
  @ApiPropertyOptional() standardPrice?: number;
  @ApiPropertyOptional() movingAveragePrice?: number;
  @ApiPropertyOptional() costCenter?: string;
  @ApiPropertyOptional() glAccountMapping?: string;
  @ApiPropertyOptional() taxCode?: string;

  // Safety
  @ApiPropertyOptional() hazardClassification?: string;
  @ApiPropertyOptional() msdsReferenceNo?: string;
  @ApiPropertyOptional() ppeRequirements?: string;
  @ApiPropertyOptional() handlingInstructions?: string;
  @ApiPropertyOptional() disposalInstructions?: string;
  @ApiPropertyOptional() regulatoryCompliance?: string;

  // Logistics
  @ApiPropertyOptional() packagingType?: string;
  @ApiPropertyOptional() packagingDimensions?: string;
  @ApiPropertyOptional() packagingWeight?: string;
  @ApiPropertyOptional() unitsPerPackage?: number;
  @ApiPropertyOptional() transportationMode?: string;
  @ApiPropertyOptional() specialTransportRequirements?: string;
  @ApiPropertyOptional() barcodeQrCodeRequired?: boolean;

  // Documents
  @ApiPropertyOptional() datasheetUrl?: string;
  @ApiPropertyOptional() drawingSketchUrl?: string;
  @ApiPropertyOptional() technicalSpecSheetUrl?: string;
  @ApiPropertyOptional() qualityCertificatesUrl?: string;
  @ApiPropertyOptional() complianceCertificatesUrl?: string;
  @ApiPropertyOptional() vendorQuotationUrl?: string;
  @ApiPropertyOptional() inspectionReportsUrl?: string;
  @ApiPropertyOptional({ type: [String] }) photos?: string[];

  // Audit
  @ApiPropertyOptional() createdBy?: string;
  @ApiPropertyOptional() updatedBy?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class MaterialListResponseDto {
  @ApiProperty({ type: [MaterialListItemDto] }) data: MaterialListItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
