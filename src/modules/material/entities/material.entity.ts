import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Organization }       from '../../organization/entity/organization.entity';
import { MaterialCategory }   from '../../material-category/entities/material-category.entity';
import { MaterialGroup }      from '../../material-group/entities/material-group.entity';
import { UnitOfMeasurement }  from '../../unit-of-measurement/entities/unit-of-measurement.entity';
import { MaterialStatus }     from '../enums/material-status.enum';
import { CriticalityLevel }   from '../enums/criticality-level.enum';
import { InspectionType }     from '../enums/inspection-type.enum';
import { StockingStrategy }   from '../enums/stocking-strategy.enum';
import { PackagingType }      from '../enums/packaging-type.enum';
import { TransportationMode } from '../enums/transportation-mode.enum';
import { HazardClassification } from '../enums/hazard-classification.enum';

@Entity('materials')
@Index('UQ_mat_org_code',       ['organizationId', 'code'],               { unique: true })
@Index('IDX_mat_org_cat',       ['organizationId', 'materialCategoryId'])
@Index('IDX_mat_org_grp',       ['organizationId', 'materialGroupId'])
@Index('IDX_mat_org_uom',       ['organizationId', 'unitOfMeasurementId'])
@Index('IDX_mat_org_status',    ['organizationId', 'status'])
@Index('IDX_mat_org_deleted',   ['organizationId', 'isDeleted'])
@Index('IDX_mat_manufacturer',  ['organizationId', 'manufacturerName'])
@Index('IDX_mat_short_desc',    ['organizationId', 'shortDescription'])
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  // ── Organization scope ────────────────────────────────────────────

  @Column({ nullable: false })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // ── Generated code (immutable) ────────────────────────────────────
  // Server-generated, concurrency-safe via material_code_counters table.
  // Format: <3-char category prefix><6-digit zero-padded sequence>
  // Examples: RAW000001, CON000002, EQU000001

  @Column({ length: 20, nullable: false })
  code: string;

  // ── Core classification ───────────────────────────────────────────

  @Column({ nullable: false })
  materialCategoryId: string;

  @ManyToOne(() => MaterialCategory, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'materialCategoryId' })
  materialCategory: MaterialCategory;

  @Column({ nullable: false })
  materialGroupId: string;

  @ManyToOne(() => MaterialGroup, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'materialGroupId' })
  materialGroup: MaterialGroup;

  @Column({ nullable: false })
  unitOfMeasurementId: string;

  @ManyToOne(() => UnitOfMeasurement, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unitOfMeasurementId' })
  unitOfMeasurement: UnitOfMeasurement;

  @Column({ nullable: true })
  // Future enhancement: link to a Vendor entity for manufacturer details
  manufacturerId: string; // future FK → vendor_masters.id

  // ── Description ───────────────────────────────────────────────────

  @Column({ length: 500, nullable: false })
  shortDescription: string;

  @Column({ type: 'text', nullable: true })
  longDescription: string;

  // ── Status & classification ───────────────────────────────────────

  @Column({ type: 'enum', enum: MaterialStatus, default: MaterialStatus.ACTIVE })
  status: MaterialStatus;

  @Column({ type: 'enum', enum: CriticalityLevel, default: CriticalityLevel.LOW })
  criticalityLevel: CriticalityLevel;

  // ── Flags ─────────────────────────────────────────────────────────

  @Column({ default: false })
  isSystem: boolean;

  @Column({ default: true })
  isStockItem: boolean;

  @Column({ default: false })
  isSerialized: boolean;

  @Column({ default: false })
  isBatchManaged: boolean;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  // ══ TECHNICAL SPECIFICATION ═══════════════════════════════════════
  // Generic technical attributes. A future MaterialTechnicalAttribute
  // child table can be introduced for dynamic EAV specs without altering
  // this entity.

  @Column({ type: 'text', nullable: true })
  technicalDescription: string;

  @Column({ length: 255, nullable: true })
  modelPartNumber: string;

  @Column({ length: 255, nullable: true })
  manufacturerName: string;

  @Column({ length: 255, nullable: true })
  manufacturerPartNumber: string;

  @Column({ length: 255, nullable: true })
  brand: string;

  @Column({ length: 500, nullable: true })
  materialComposition: string;

  @Column({ length: 500, nullable: true })
  dimensions: string;

  // stored as string to support various units (kg, lbs, g) with their unit suffix
  @Column({ length: 100, nullable: true })
  weight: string;

  @Column({ length: 100, nullable: true })
  colorFinish: string;

  @Column({ length: 255, nullable: true })
  operatingTemperatureRange: string;

  @Column({ length: 100, nullable: true })
  pressureRating: string;

  @Column({ length: 100, nullable: true })
  voltageCurrentRating: string;

  @Column({ type: 'text', nullable: true })
  certifications: string;

  @Column({ length: 500, nullable: true })
  datasheetReference: string;

  // ══ PROCUREMENT INFORMATION ═══════════════════════════════════════
  // Preferred vendor / price data here is an initial capture point.
  // Once the Vendor Master and Purchase Order modules exist, these
  // should be derived from the approved vendor list and PO history
  // rather than manually maintained.

  @Column({ length: 255, nullable: true })
  preferredVendorId: string;            // future FK → vendor_masters.id

  @Column({ length: 100, nullable: true })
  vendorPartNumber: string;

  @Column({ type: 'int', unsigned: true, nullable: true })
  leadTimeDays: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  minimumOrderQuantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  reorderLevel: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  reorderQuantity: number;

  @Column({ length: 255, nullable: true })
  purchaseUomId: string;                // secondary UOM for purchasing (e.g. buy by pallet, stock by EA)

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  lastPurchasePrice: number;

  @Column({ length: 10, nullable: true })
  currency: string;

  @Column({ length: 255, nullable: true })
  contractReference: string;

  @Column({ length: 50, nullable: true })
  hsCode: string;

  @Column({ length: 100, nullable: true })
  countryOfOrigin: string;

  // ══ INVENTORY & STORAGE ═══════════════════════════════════════════

  @Column({ length: 255, nullable: true })
  storageLocation: string;

  @Column({ length: 100, nullable: true })
  warehouseBinRack: string;

  @Column({ length: 500, nullable: true })
  storageConditions: string;

  @Column({ type: 'int', unsigned: true, nullable: true })
  shelfLifeDays: number;

  @Column({ type: 'enum', enum: StockingStrategy, nullable: true })
  stockingStrategy: StockingStrategy;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  safetyStock: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  maximumStockLevel: number;

  // ══ QUALITY & INSPECTION ══════════════════════════════════════════

  @Column({ type: 'enum', enum: InspectionType, default: InspectionType.NONE })
  inspectionType: InspectionType;

  @Column({ length: 255, nullable: true })
  qualitySpecDocumentNo: string;

  @Column({ type: 'int', unsigned: true, nullable: true })
  inspectionLotSize: number;

  @Column({ type: 'text', nullable: true })
  samplingProcedure: string;

  @Column({ type: 'text', nullable: true })
  testParameters: string;

  @Column({ type: 'text', nullable: true })
  acceptanceCriteria: string;

  @Column({ default: false })
  calibrationRequired: boolean;

  @Column({ type: 'int', unsigned: true, nullable: true })
  calibrationIntervalDays: number;

  // ══ ACCOUNTING & VALUATION ════════════════════════════════════════

  @Column({ length: 50, nullable: true })
  valuationClass: string;

  @Column({ length: 50, nullable: true })
  valuationType: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  standardPrice: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  movingAveragePrice: number;

  @Column({ length: 100, nullable: true })
  costCenter: string;

  @Column({ length: 50, nullable: true })
  glAccountMapping: string;

  @Column({ length: 20, nullable: true })
  taxCode: string;

  // ══ SAFETY, COMPLIANCE & HANDLING ════════════════════════════════

  @Column({ type: 'enum', enum: HazardClassification, default: HazardClassification.NON_HAZARDOUS })
  hazardClassification: HazardClassification;

  @Column({ length: 100, nullable: true })
  msdsReferenceNo: string;

  @Column({ type: 'text', nullable: true })
  ppeRequirements: string;

  @Column({ type: 'text', nullable: true })
  handlingInstructions: string;

  @Column({ type: 'text', nullable: true })
  disposalInstructions: string;

  @Column({ type: 'text', nullable: true })
  regulatoryCompliance: string;

  // ══ LOGISTICS & PACKAGING ══════════════════════════════════════════

  @Column({ type: 'enum', enum: PackagingType, nullable: true })
  packagingType: PackagingType;

  @Column({ length: 255, nullable: true })
  packagingDimensions: string;

  @Column({ length: 100, nullable: true })
  packagingWeight: string;

  @Column({ type: 'int', unsigned: true, nullable: true })
  unitsPerPackage: number;

  @Column({ type: 'enum', enum: TransportationMode, nullable: true })
  transportationMode: TransportationMode;

  @Column({ type: 'text', nullable: true })
  specialTransportRequirements: string;

  @Column({ default: false })
  barcodeQrCodeRequired: boolean;

  // ══ DOCUMENT REFERENCES ══════════════════════════════════════════
  // URLs/paths only — physical files live in cloud storage / DMS.

  @Column({ length: 1000, nullable: true })
  datasheetUrl: string;

  @Column({ length: 1000, nullable: true })
  drawingSketchUrl: string;

  @Column({ length: 1000, nullable: true })
  technicalSpecSheetUrl: string;

  @Column({ length: 1000, nullable: true })
  qualityCertificatesUrl: string;

  @Column({ length: 1000, nullable: true })
  complianceCertificatesUrl: string;

  @Column({ length: 1000, nullable: true })
  vendorQuotationUrl: string;

  @Column({ length: 1000, nullable: true })
  inspectionReportsUrl: string;

  // JSON array of photo URLs (up to ~50 images)
  @Column({ type: 'json', nullable: true })
  photos: string[];

  // ── Soft delete ───────────────────────────────────────────────────

  @Column({ default: false, name: 'is_deleted' })
  isDeleted: boolean;

  @Column({ nullable: true, type: 'datetime' })
  deletedAt: Date;

  @Column({ length: 255, nullable: true })
  deletedBy: string;

  // ── Audit ─────────────────────────────────────────────────────────

  @Column({ length: 255, nullable: true })
  createdBy: string;

  @Column({ length: 255, nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
