import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber,
  IsOptional, IsString, IsUrl, IsUUID, Length, Max, Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MaterialDocumentInputDto } from './material-document.dto';
import { CriticalityLevel }   from '../enums/criticality-level.enum';
import { InspectionType }     from '../enums/inspection-type.enum';
import { StockingStrategy }   from '../enums/stocking-strategy.enum';
import { PackagingType }      from '../enums/packaging-type.enum';
import { TransportationMode } from '../enums/transportation-mode.enum';
import { HazardClassification } from '../enums/hazard-classification.enum';

// ── Nested section DTOs ───────────────────────────────────────────────────

export class MaterialTechnicalSpecDto {
  @ApiPropertyOptional({ example: 'Seamless carbon steel pipe ASTM A106 Gr B' })
  @IsOptional() @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  technicalDescription?: string;

  @ApiPropertyOptional({ example: 'SCH-40-6IN' })
  @IsOptional() @IsString() @Length(1, 255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  modelPartNumber?: string;

  @ApiPropertyOptional({ description: 'Manufacturer UUID (future FK → vendor_masters)' })
  @IsOptional() @IsString() @Length(1, 36)
  manufacturerId?: string;

  @ApiPropertyOptional({ example: 'Tenaris' })
  @IsOptional() @IsString() @Length(1, 255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  manufacturerName?: string;

  @ApiPropertyOptional({ example: 'T90-1234-SCH40' })
  @IsOptional() @IsString() @Length(1, 255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  manufacturerPartNumber?: string;

  @ApiPropertyOptional({ example: 'Tenaris' })
  @IsOptional() @IsString() @Length(1, 255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  brand?: string;

  @ApiPropertyOptional({ example: 'ASTM A106 Grade B Carbon Steel' })
  @IsOptional() @IsString() @Length(1, 500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  materialComposition?: string;

  @ApiPropertyOptional({ example: '6" NB × 6000mm, SCH 40' })
  @IsOptional() @IsString() @Length(1, 500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  dimensions?: string;

  @ApiPropertyOptional({ example: '28.26 kg/m' })
  @IsOptional() @IsString() @Length(1, 100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  weight?: string;

  @ApiPropertyOptional({ example: 'Black / Mill Finish' })
  @IsOptional() @IsString() @Length(1, 100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  colorFinish?: string;

  @ApiPropertyOptional({ example: '-29°C to 427°C' })
  @IsOptional() @IsString() @Length(1, 255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  operatingTemperatureRange?: string;

  @ApiPropertyOptional({ example: '600 psig (41.4 bar)' })
  @IsOptional() @IsString() @Length(1, 100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  pressureRating?: string;

  @ApiPropertyOptional({ example: '415V / 50Hz / 3-Phase' })
  @IsOptional() @IsString() @Length(1, 100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  voltageCurrentRating?: string;

  @ApiPropertyOptional({ example: 'ASTM A106, ISO 3183, PED 2014/68/EU' })
  @IsOptional() @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  certifications?: string;

  @ApiPropertyOptional({ example: 'DS-2024-001' })
  @IsOptional() @IsString() @Length(1, 500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  datasheetReference?: string;
}

export class MaterialInventoryDto {
  @ApiPropertyOptional({ example: 'WH-A-RACK-04-B' })
  @IsOptional() @IsString() @Length(1, 255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  storageLocation?: string;

  @ApiPropertyOptional({ example: 'R04-B-12' })
  @IsOptional() @IsString() @Length(1, 100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  warehouseBinRack?: string;

  @ApiPropertyOptional({ example: 'Store in dry covered area; avoid direct sunlight' })
  @IsOptional() @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  storageConditions?: string;

  @ApiPropertyOptional({ example: 730, description: 'Shelf life in days' })
  @IsOptional() @IsInt() @Min(0)
  shelfLifeDays?: number;

  @ApiPropertyOptional({ enum: StockingStrategy })
  @IsOptional() @IsEnum(StockingStrategy)
  stockingStrategy?: StockingStrategy;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional() @IsNumber() @Min(0)
  safetyStock?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional() @IsNumber() @Min(0)
  maximumStockLevel?: number;
}

export class MaterialQualityDto {
  @ApiPropertyOptional({ enum: InspectionType })
  @IsOptional() @IsEnum(InspectionType)
  inspectionType?: InspectionType;

  @ApiPropertyOptional({ example: 'QS-PIPE-001' })
  @IsOptional() @IsString() @Length(1, 255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  qualitySpecDocumentNo?: string;

  @ApiPropertyOptional({ example: 25, description: 'Lot size for inspection sampling' })
  @IsOptional() @IsInt() @Min(1)
  inspectionLotSize?: number;

  @ApiPropertyOptional({ example: 'AQL 2.5 per ISO 2859-1' })
  @IsOptional() @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  samplingProcedure?: string;

  @ApiPropertyOptional({ example: 'Wall thickness, OD, straightness, hydro test' })
  @IsOptional() @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  testParameters?: string;

  @ApiPropertyOptional({ example: 'Dimensional tolerance per ASME B36.10M' })
  @IsOptional() @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  acceptanceCriteria?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean()
  calibrationRequired?: boolean;

  @ApiPropertyOptional({ example: 365, description: 'Calibration interval in days' })
  @IsOptional() @IsInt() @Min(1)
  calibrationIntervalDays?: number;
}

export class MaterialAccountingDto {
  @ApiPropertyOptional({ example: '3000', description: 'GL valuation class code' })
  @IsOptional() @IsString() @Length(1, 50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  valuationClass?: string;

  @ApiPropertyOptional({ example: 'MOVING_AVERAGE' })
  @IsOptional() @IsString() @Length(1, 50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  valuationType?: string;

  @ApiPropertyOptional({ example: 1250.0, description: 'Standard price (DECIMAL 18,4)' })
  @IsOptional() @IsNumber() @Min(0)
  standardPrice?: number;

  @ApiPropertyOptional({ example: 1230.5, description: 'Moving average price (DECIMAL 18,4)' })
  @IsOptional() @IsNumber() @Min(0)
  movingAveragePrice?: number;

  @ApiPropertyOptional({ example: 'CC-PROJ-001' })
  @IsOptional() @IsString() @Length(1, 100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  costCenter?: string;

  @ApiPropertyOptional({ example: '1404000' })
  @IsOptional() @IsString() @Length(1, 50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  glAccountMapping?: string;

  @ApiPropertyOptional({ example: 'TX18' })
  @IsOptional() @IsString() @Length(1, 20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  taxCode?: string;
}

export class MaterialSafetyDto {
  @ApiPropertyOptional({ enum: HazardClassification })
  @IsOptional() @IsEnum(HazardClassification)
  hazardClassification?: HazardClassification;

  @ApiPropertyOptional({ example: 'MSDS-2024-0042' })
  @IsOptional() @IsString() @Length(1, 100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  msdsReferenceNo?: string;

  @ApiPropertyOptional({ example: 'Safety gloves, goggles, hard hat' })
  @IsOptional() @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  ppeRequirements?: string;

  @ApiPropertyOptional({ example: 'Handle with rigging slings; no direct contact with bare hands' })
  @IsOptional() @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  handlingInstructions?: string;

  @ApiPropertyOptional({ example: 'Scrap to licensed steel recycler; no landfill' })
  @IsOptional() @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  disposalInstructions?: string;

  @ApiPropertyOptional({ example: 'RoHS compliant; CE marked; REACH registered' })
  @IsOptional() @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  regulatoryCompliance?: string;
}

export class MaterialLogisticsDto {
  @ApiPropertyOptional({ enum: PackagingType })
  @IsOptional() @IsEnum(PackagingType)
  packagingType?: PackagingType;

  @ApiPropertyOptional({ example: '2000mm × 800mm × 800mm' })
  @IsOptional() @IsString() @Length(1, 255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  packagingDimensions?: string;

  @ApiPropertyOptional({ example: '850 kg per bundle' })
  @IsOptional() @IsString() @Length(1, 100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  packagingWeight?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @IsInt() @Min(1)
  unitsPerPackage?: number;

  @ApiPropertyOptional({ enum: TransportationMode })
  @IsOptional() @IsEnum(TransportationMode)
  transportationMode?: TransportationMode;

  @ApiPropertyOptional({ example: 'Flatbed trailer; total length restriction 20m' })
  @IsOptional() @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  specialTransportRequirements?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean()
  barcodeQrCodeRequired?: boolean;
}

export class MaterialDocumentsDto {
  @ApiPropertyOptional({ example: 'https://storage.example.com/datasheets/pipe-a106.pdf' })
  @IsOptional() @IsString() @Length(1, 1000)
  datasheetUrl?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/drawings/pipe-iso.pdf' })
  @IsOptional() @IsString() @Length(1, 1000)
  drawingSketchUrl?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/specs/ts-2024-001.pdf' })
  @IsOptional() @IsString() @Length(1, 1000)
  technicalSpecSheetUrl?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/certs/mill-cert.pdf' })
  @IsOptional() @IsString() @Length(1, 1000)
  qualityCertificatesUrl?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/certs/rohs.pdf' })
  @IsOptional() @IsString() @Length(1, 1000)
  complianceCertificatesUrl?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/quotes/vendor-q-2024.pdf' })
  @IsOptional() @IsString() @Length(1, 1000)
  vendorQuotationUrl?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/inspection/ir-2024-001.pdf' })
  @IsOptional() @IsString() @Length(1, 1000)
  inspectionReportsUrl?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://storage.example.com/photos/pipe-001.jpg'],
    description: 'Array of photo URLs (max 20)',
  })
  @IsOptional() @IsArray() @IsString({ each: true })
  photos?: string[];
}

export class MaterialProcurementDto {
  @ApiPropertyOptional({ description: 'Preferred vendor UUID (future FK → vendor_masters)' })
  @IsOptional() @IsString()
  preferredVendorId?: string;

  @ApiPropertyOptional({ example: 'VND-PART-12345' })
  @IsOptional() @IsString() @Length(1, 100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  vendorPartNumber?: string;

  @ApiPropertyOptional({ example: 90, description: 'Lead time in calendar days' })
  @IsOptional() @IsInt() @Min(0)
  leadTimeDays?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional() @IsNumber() @Min(0)
  minimumOrderQuantity?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional() @IsNumber() @Min(0)
  reorderLevel?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional() @IsNumber() @Min(0)
  reorderQuantity?: number;

  @ApiPropertyOptional({ description: 'Purchase UOM UUID (e.g. buy by pallet while stocking by EA)' })
  @IsOptional() @IsString()
  purchaseUomId?: string;

  @ApiPropertyOptional({ example: 1250.50 })
  @IsOptional() @IsNumber() @Min(0)
  lastPurchasePrice?: number;

  @ApiPropertyOptional({ example: 'USD', description: 'ISO 4217 currency code' })
  @IsOptional() @IsString() @Length(3, 10)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  currency?: string;

  @ApiPropertyOptional({ example: 'FRAME-2024-001' })
  @IsOptional() @IsString() @Length(1, 255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  contractReference?: string;

  @ApiPropertyOptional({ example: '7306.30.00', description: 'Harmonized System tariff code' })
  @IsOptional() @IsString() @Length(1, 50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  hsCode?: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional() @IsString() @Length(1, 100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  countryOfOrigin?: string;
}

// ── Main Create DTO ───────────────────────────────────────────────────────

export class CreateMaterialDto {
  // ── Core (required) ───────────────────────────────────────────────

  @ApiProperty({
    example: 'Carbon Steel Seamless Pipe',
    description: 'Brief searchable description (max 500 chars). Appears in dropdowns and search results.',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  shortDescription: string;

  @ApiProperty({ example: 'uuid-of-material-category', description: 'Parent Material Category UUID' })
  @IsUUID()
  @IsNotEmpty()
  materialCategoryId: string;

  @ApiProperty({ example: 'uuid-of-material-group', description: 'Material Group UUID (must belong to the specified category)' })
  @IsUUID()
  @IsNotEmpty()
  materialGroupId: string;

  @ApiProperty({ example: 'uuid-of-uom', description: 'Primary Unit of Measurement UUID' })
  @IsUUID()
  @IsNotEmpty()
  unitOfMeasurementId: string;

  @ApiProperty({ enum: CriticalityLevel, example: CriticalityLevel.MEDIUM })
  @IsEnum(CriticalityLevel)
  @IsNotEmpty()
  criticalityLevel: CriticalityLevel;

  // ── Core (optional) ───────────────────────────────────────────────

  @ApiPropertyOptional({
    example: 'Carbon steel seamless pipe ASTM A106 Grade B, 6 inch NB, Schedule 40, 6000mm length',
    description: 'Detailed technical description (max 4000 chars)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 4000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  longDescription?: string;

  
  @ApiPropertyOptional({
    example: 'Black color 6 inch NB, Schedule 40, 6000mm length',
    description: 'Special Instruction (max 4000 chars)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 4000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  specialInstruction?: string;



  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ example: true, description: 'true for warehouse-managed items; false for direct-charge services' })
  @IsOptional() @IsBoolean()
  isStockItem?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Each unit has a unique serial number' })
  @IsOptional() @IsBoolean()
  isSerialized?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Material is managed in batches/lots' })
  @IsOptional() @IsBoolean()
  isBatchManaged?: boolean;

  @ApiPropertyOptional({ example: 'High-priority item for plant expansion project' })
  @IsOptional() @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  remarks?: string;

  // ── Nested sections (all optional) ───────────────────────────────

  @ApiPropertyOptional({ type: () => MaterialTechnicalSpecDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MaterialTechnicalSpecDto)
  technicalSpec?: MaterialTechnicalSpecDto;

  @ApiPropertyOptional({ type: () => MaterialProcurementDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MaterialProcurementDto)
  procurement?: MaterialProcurementDto;

  @ApiPropertyOptional({ type: () => MaterialInventoryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MaterialInventoryDto)
  inventory?: MaterialInventoryDto;

  @ApiPropertyOptional({ type: () => MaterialQualityDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MaterialQualityDto)
  quality?: MaterialQualityDto;

  @ApiPropertyOptional({ type: () => MaterialAccountingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MaterialAccountingDto)
  accounting?: MaterialAccountingDto;

  @ApiPropertyOptional({ type: () => MaterialSafetyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MaterialSafetyDto)
  safety?: MaterialSafetyDto;

  @ApiPropertyOptional({ type: () => MaterialLogisticsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MaterialLogisticsDto)
  logistics?: MaterialLogisticsDto;

  @ApiPropertyOptional({
    type: () => MaterialDocumentsDto,
    description:
      'LEGACY flat URL shape, still accepted. Each populated URL is converted into a ' +
      'material_documents row at version 1; photos[] becomes one PHOTO row each. ' +
      'Prefer documentList for new integrations — it carries type, title, and expiry.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MaterialDocumentsDto)
  documents?: MaterialDocumentsDto;

  @ApiPropertyOptional({
    type: [MaterialDocumentInputDto],
    description:
      'Preferred document shape. Each entry becomes a material_documents row at ' +
      'version 1. Can be combined with the legacy `documents` section — both are ' +
      'normalised into the same table.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => MaterialDocumentInputDto)
  documentList?: MaterialDocumentInputDto[];
}
