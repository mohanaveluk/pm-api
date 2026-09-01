import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Vendor } from './vendor.entity';
import { VendorProjectRole }   from '../enums/vendor-project-role.enum';
import { VendorProjectStatus } from '../enums/vendor-project-status.enum';

// One row per past project a vendor puts forward as evidence of capability.
//
// Replaces four unstructured columns that previously sat on the vendor row and
// could only ever hold one blob each:
//
//   majorClients             → clientName (one per project; the vendor-level
//                              client list is now DISTINCT clientName)
//   projectExperience        → the row itself: projectName, scopeOfWork, dates
//   pastPoContractReferences → contractReference / purchaseOrderReference
//   blacklistingHistory      → wasBlacklisted + blacklistingRemarks, recorded
//                              against the project it actually happened on
//
// Structured rows are what make this usable: "show me every vendor with a
// completed EPC package over USD 10m in Saudi Arabia in the last five years"
// is a query here and impossible against a text blob.
//
// isVerified carries the important distinction between what a vendor CLAIMS and
// what procurement has confirmed with the client. Unverified experience should
// not carry weight in a bid evaluation.

@Entity('vendor_project_experiences')
@Index('IDX_vpe_org_vendor',    ['organizationId', 'vendorId'])
@Index('IDX_vpe_org_client',    ['organizationId', 'clientName'])
@Index('IDX_vpe_org_status',    ['organizationId', 'projectStatus'])
@Index('IDX_vpe_org_role',      ['organizationId', 'projectRole'])
@Index('IDX_vpe_org_country',   ['organizationId', 'country'])
@Index('IDX_vpe_org_verified',  ['organizationId', 'isVerified'])
@Index('IDX_vpe_org_blacklist', ['organizationId', 'wasBlacklisted'])
@Index('IDX_vpe_org_deleted',   ['organizationId', 'isDeleted'])
export class VendorProjectExperience {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  vendorId: string;

  @ManyToOne(() => Vendor, v => v.projectExperiences, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  // ── Project identity ──────────────────────────────────────────────

  @Column({ length: 255, nullable: true })
  projectName: string;

  // The end client. DISTINCT over this column replaces the old majorClients[].
  @Column({ length: 255, nullable: true })
  clientName: string;

  @Column({ type: 'text', nullable: true })
  projectExperience: string;

  @Column({ type: 'text', nullable: true })
  pastPoContractReferences: string;

  @Column({ type: 'text', nullable: true })
  blacklistingHistory: string;

  @Column({ length: 255, nullable: true })
  clientContactPerson: string;

  @Column({ length: 255, nullable: true })
  clientContactEmail: string;

  // Stored as text — international formats must survive a round trip.
  @Column({ length: 30, nullable: true })
  clientContactPhone: string;

  @Column({ length: 100, nullable: true })
  projectLocation: string;

  // ISO 3166-1 alpha-2.
  @Column({ length: 2, nullable: true })
  country: string;

  // ── Scope & role ──────────────────────────────────────────────────

  @Column({ type: 'enum', enum: VendorProjectRole, nullable: true })
  projectRole: VendorProjectRole;

  @Column({ type: 'text', nullable: true })
  scopeOfWork: string;

  // Free text rather than an FK: the sector of a past project belongs to the
  // client's world, not to this organization's Industry Category master.
  @Column({ length: 255, nullable: true })
  sector: string;

  @Column({ type: 'json', nullable: true })
  technologiesUsed: string[];

  // ── Timeline ──────────────────────────────────────────────────────

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  completionDate: Date;

  @Column({ type: 'enum', enum: VendorProjectStatus, nullable: true })
  projectStatus: VendorProjectStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  completionPercentage: number;

  // ── Commercial ────────────────────────────────────────────────────
  // DECIMAL, never float — contract values are money.

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  contractValue: number;

  // ISO 4217.
  @Column({ length: 10, nullable: true })
  currency: string;

  @Column({ length: 100, nullable: true })
  contractReference: string;

  @Column({ length: 100, nullable: true })
  purchaseOrderReference: string;

  // ── Outcome ───────────────────────────────────────────────────────

  @Column({ default: false })
  completedOnTime: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  clientPerformanceRating: number;

  // Recorded against the project it happened on, rather than as one paragraph
  // on the vendor. Indexed so a qualification screen can find every vendor with
  // a blacklisting on record.
  @Column({ default: false })
  wasBlacklisted: boolean;

  @Column({ type: 'text', nullable: true })
  blacklistingRemarks: string;

  @Column({ type: 'text', nullable: true })
  keyAchievements: string;

  @Column({ type: 'text', nullable: true })
  challengesFaced: string;

  // ── Evidence ──────────────────────────────────────────────────────
  // URLs only — binaries go to cloud storage.

  @Column({ length: 1000, nullable: true })
  completionCertificateUrl: string;

  @Column({ length: 1000, nullable: true })
  referenceLetterUrl: string;

  @Column({ type: 'json', nullable: true })
  supportingDocumentUrls: string[];

  // ── Verification ──────────────────────────────────────────────────
  // Claimed vs confirmed. A vendor supplies the row; procurement verifies it.

  @Column({ default: false })
  isVerified: boolean;

  @Column({ length: 255, nullable: true })
  verifiedBy: string;

  @Column({ nullable: true, type: 'datetime' })
  verifiedAt: Date;

  @Column({ type: 'text', nullable: true })
  verificationRemarks: string;

  // ── Display ───────────────────────────────────────────────────────

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  remarks: string;

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
