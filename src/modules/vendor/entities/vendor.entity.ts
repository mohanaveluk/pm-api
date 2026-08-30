import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Organization }     from '../../organization/entity/organization.entity';
import { IndustryCategory } from '../../industry-category/entities/industry-category.entity';

import { VendorType }           from '../enums/vendor-type.enum';
import { VendorStatus }         from '../enums/vendor-status.enum';
import { PendingStatusChange }  from '../enums/pending-status-change.enum';
import { VendorClassification } from '../enums/vendor-classification.enum';
import { RiskCategory }         from '../enums/risk-category.enum';
import { ReviewCycle }          from '../enums/review-cycle.enum';
import { TaxDocumentType }      from '../enums/tax-document-type.enum';
import { PaymentTerms }         from '../enums/payment-terms.enum';
import { PaymentMethod }        from '../enums/payment-method.enum';
import { DeliveryCapability }   from '../enums/delivery-capability.enum';
import { TransportationMode }   from '../../material/enums/transportation-mode.enum';

import { VendorContact }       from './vendor-contact.entity';
import { VendorAddress }       from './vendor-address.entity';
import { VendorBankAccount }   from './vendor-bank-account.entity';
import { VendorCertification } from './vendor-certification.entity';
import { VendorDocument }      from './vendor-document.entity';
import { VendorMaterial }      from './vendor-material.entity';
import { VendorTurnover }      from './vendor-turnover.entity';
import { VendorEvaluation }    from './vendor-evaluation.entity';
import { VendorPerformance }   from './vendor-performance.entity';
import { VendorStatusChangeRequest } from './vendor-status-change-request.entity';

@Entity('vendors')
@Index('UQ_ven_org_code',        ['organizationId', 'code'],                     { unique: true })
@Index('IDX_ven_org_name',       ['organizationId', 'vendorName'])
@Index('IDX_ven_org_industry',   ['organizationId', 'industryCategoryId'])
@Index('IDX_ven_org_status',     ['organizationId', 'vendorStatus'])
@Index('IDX_ven_org_type',       ['organizationId', 'vendorType'])
@Index('IDX_ven_org_active',     ['organizationId', 'isActive'])
@Index('IDX_ven_org_deleted',    ['organizationId', 'isDeleted'])
@Index('IDX_ven_org_country',    ['organizationId', 'countryOfRegistration'])
@Index('IDX_ven_org_classific',  ['organizationId', 'vendorClassification'])
@Index('IDX_ven_org_brn',        ['organizationId', 'businessRegistrationNumber'])
@Index('IDX_ven_org_trn',        ['organizationId', 'taxRegistrationNumber'])
@Index('IDX_ven_parent',         ['parentCompanyId'])
@Index('IDX_ven_org_pending',    ['organizationId', 'pendingStatusChange'])
export class Vendor {
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
  // Server-generated and concurrency-safe via the vendor_code_counters table.
  // Format: <3-char industry-category prefix><6-digit zero-padded sequence>
  // The prefix is derived from the linked Industry Category, never hard-coded.

  @Column({ length: 20, nullable: false })
  code: string;

  // ── Identity ──────────────────────────────────────────────────────

  @Column({ length: 255, nullable: false })
  vendorName: string;

  @Column({ type: 'text', nullable: true })
  vendorDescription: string;

  // Operating / brand name when it differs from the legal vendor name.
  @Column({ length: 255, nullable: true })
  tradeName: string;

  @Column({ type: 'enum', enum: VendorType, nullable: false })
  vendorType: VendorType;

  // ── Classification ────────────────────────────────────────────────

  @Column({ nullable: false })
  industryCategoryId: string;

  @ManyToOne(() => IndustryCategory, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'industryCategoryId' })
  industryCategory: IndustryCategory;

  // Self-referencing corporate hierarchy:
  //   ABC Global Holdings → ABC Engineering LLC → ABC Engineering India Pvt Ltd
  // Self-reference and cycles are rejected by the service layer.
  @Column({ nullable: true })
  parentCompanyId: string;

  @ManyToOne(() => Vendor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentCompanyId' })
  parentCompany: Vendor;

  // ── Status ────────────────────────────────────────────────────────
  // vendorStatus is the BUSINESS state (qualification / blacklisting).
  // isActive is the TECHNICAL availability flag used by the application.
  // They are intentionally independent: a BLACKLISTED vendor is isActive=false,
  // but an isActive=false vendor is not necessarily blacklisted.

  @Column({ type: 'enum', enum: VendorStatus, default: VendorStatus.UNDER_EVALUATION })
  vendorStatus: VendorStatus;

  @Column({ default: false })
  isActive: boolean;

  // Set while a blacklist / un-blacklist request awaits manager approval.
  // vendorStatus and isActive are NOT touched until the decision lands, so a
  // rejected request needs no compensating update. Null means no request is
  // in flight.
  @Column({ type: 'enum', enum: PendingStatusChange, nullable: true })
  pendingStatusChange: PendingStatusChange;

  @Column({ nullable: true })
  pendingStatusChangeRequestId: string;

  @Column({ type: 'text', nullable: true })
  blacklistReason: string;

  @Column({ nullable: true, type: 'datetime' })
  blacklistedAt: Date;

  @Column({ length: 255, nullable: true })
  blacklistedBy: string;

  // ── Primary contact (denormalised convenience copy) ───────────────
  // The authoritative, multi-row contact list lives in vendor_contacts.
  // These columns hold the single primary contact so list/search endpoints
  // avoid a join; they are kept in sync from the primary VendorContact row.

  @Column({ length: 255, nullable: true })
  primaryContactPerson: string;

  @Column({ length: 150, nullable: true })
  designation: string;

  @Column({ length: 255, nullable: true })
  email: string;

  // Phone numbers are stored as strings, never numerics: leading '+', country
  // codes, and separators must survive a round trip.
  @Column({ length: 30, nullable: true })
  mobileNumber: string;

  @Column({ length: 30, nullable: true })
  landlineNumber: string;

  @Column({ length: 500, nullable: true })
  website: string;

  // ISO 3166-1 alpha-2 country code of legal registration.
  @Column({ length: 2, nullable: true })
  countryOfRegistration: string;

  // ── Statutory & legal ─────────────────────────────────────────────

  @Column({ length: 100, nullable: true })
  businessRegistrationNumber: string;

  @Column({ length: 100, nullable: true })
  taxRegistrationNumber: string;

  @Column({ length: 100, nullable: true })
  taxDocumentNumber: string;

  @Column({ type: 'enum', enum: TaxDocumentType, nullable: true })
  taxDocumentType: TaxDocumentType;

  @Column({ length: 100, nullable: true })
  importExportCode: string;

  @Column({ length: 100, nullable: true })
  msmeSmeRegistration: string;

  // ── Commercial terms ──────────────────────────────────────────────
  // Bank account details are NOT stored here — see vendor_bank_accounts.

  @Column({ type: 'enum', enum: PaymentTerms, nullable: true })
  paymentTerms: PaymentTerms;

  @Column({ type: 'text', nullable: true })
  paymentMilestones: string;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  preferredPaymentMethod: PaymentMethod;

  // ── Financial ─────────────────────────────────────────────────────
  // Multi-year turnover history lives in vendor_turnovers. Monetary values
  // use DECIMAL(18,4) — never float — matching the Material Master convention.

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  creditLimitRequested: number;

  @Column({ length: 10, nullable: true })
  currency: string;

  @Column({ length: 50, nullable: true })
  creditRating: string;

  @Column({ length: 1000, nullable: true })
  auditedFinancialStatementsUrl: string;

  @Column({ type: 'text', nullable: true })
  priceStructure: string;

  @Column({ type: 'text', nullable: true })
  discountTerms: string;

  @Column({ type: 'json', nullable: true })
  contractReferenceNumbers: string[];

  @Column({ type: 'text', nullable: true })
  insuranceCoverage: string;

  // ── Technical capability ──────────────────────────────────────────
  // Supplied materials are modelled relationally in vendor_materials.
  // These columns capture narrative capability that has no master data yet.

  @Column({ type: 'json', nullable: true })
  productCategories: string[];

  @Column({ type: 'json', nullable: true })
  serviceCategories: string[];

  @Column({ type: 'text', nullable: true })
  technicalExpertiseAreas: string;

  @Column({ type: 'text', nullable: true })
  manufacturingCapabilities: string;

  @Column({ type: 'text', nullable: true })
  productionCapacity: string;

  @Column({ type: 'text', nullable: true })
  keyEquipmentList: string;

  @Column({ type: 'text', nullable: true })
  qualityControlProcesses: string;

  @Column({ type: 'json', nullable: true })
  technicalDatasheets: string[];

  @Column({ type: 'text', nullable: true })
  complianceStandards: string;

  // ── Quality, HSE & compliance ─────────────────────────────────────
  // Certificates themselves are child records (vendor_certifications) so that
  // expiry can drive notifications; these columns hold narrative policy text.

  @Column({ type: 'text', nullable: true })
  qualityManagementSystemDetails: string;

  @Column({ length: 1000, nullable: true })
  hsePolicyUrl: string;

  @Column({ type: 'text', nullable: true })
  incidentAccidentHistory: string;

  @Column({ type: 'text', nullable: true })
  csrCompliance: string;

  @Column({ type: 'text', nullable: true })
  ethicalSourcingPolicy: string;

  @Column({ type: 'text', nullable: true })
  antiBriberyPolicy: string;

  // ── Experience ────────────────────────────────────────────────────
  // Scored performance is append-only in vendor_performances; these are the
  // vendor's own declared credentials captured at registration.

  @Column({ type: 'json', nullable: true })
  majorClients: string[];

  @Column({ type: 'text', nullable: true })
  projectExperience: string;

  @Column({ type: 'text', nullable: true })
  pastPoContractReferences: string;

  @Column({ type: 'text', nullable: true })
  blacklistingHistory: string;

  @Column({ type: 'json', nullable: true })
  geographicalExperience: string[];

  // ── Logistics & supply chain ──────────────────────────────────────

  @Column({ type: 'int', nullable: true })
  standardLeadTimeDays: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  minimumOrderQuantity: number;

  @Column({ type: 'enum', enum: DeliveryCapability, nullable: true })
  deliveryCapability: DeliveryCapability;

  @Column({ type: 'json', nullable: true })
  warehouseLocations: string[];

  // Reuses the Material Master TransportationMode enum rather than declaring
  // a second, divergent copy of the same domain vocabulary.
  @Column({ type: 'json', nullable: true })
  transportModesSupported: TransportationMode[];

  @Column({ default: false })
  exportDocumentationCapability: boolean;

  // ── Internal evaluation & approval ────────────────────────────────
  // These are the CURRENT rolled-up values. The immutable decision trail is
  // in vendor_evaluations — approvals are appended there, never overwritten.

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  vendorEvaluationScore: number;

  @Column({ type: 'enum', enum: RiskCategory, nullable: true })
  riskCategory: RiskCategory;

  @Column({ type: 'enum', enum: VendorClassification, nullable: true })
  vendorClassification: VendorClassification;

  @Column({ length: 100, nullable: true })
  approvalReference: string;

  @Column({ nullable: true, type: 'datetime' })
  approvalDate: Date;

  @Column({ type: 'enum', enum: ReviewCycle, nullable: true })
  reviewCycle: ReviewCycle;

  @Column({ nullable: true, type: 'datetime' })
  nextReviewDate: Date;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  // ── Child collections ─────────────────────────────────────────────

  @OneToMany(() => VendorContact,       c => c.vendor) contacts: VendorContact[];
  @OneToMany(() => VendorAddress,       a => a.vendor) addresses: VendorAddress[];
  @OneToMany(() => VendorBankAccount,   b => b.vendor) bankAccounts: VendorBankAccount[];
  @OneToMany(() => VendorCertification, c => c.vendor) certifications: VendorCertification[];
  @OneToMany(() => VendorDocument,      d => d.vendor) documents: VendorDocument[];
  @OneToMany(() => VendorMaterial,      m => m.vendor) materials: VendorMaterial[];
  @OneToMany(() => VendorTurnover,      t => t.vendor) turnovers: VendorTurnover[];
  @OneToMany(() => VendorEvaluation,    e => e.vendor) evaluations: VendorEvaluation[];
  @OneToMany(() => VendorPerformance,   p => p.vendor) performances: VendorPerformance[];
  @OneToMany(() => VendorStatusChangeRequest, r => r.vendor) statusChangeRequests: VendorStatusChangeRequest[];

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
