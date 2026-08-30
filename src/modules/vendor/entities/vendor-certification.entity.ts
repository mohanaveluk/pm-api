import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Vendor } from './vendor.entity';

// ISO 9001 / 14001 / 45001, API, ASME, CE, ATEX, local authority licences.
//
// certificationName is free text rather than an enum: the set of certificates
// an EPC organisation cares about is open-ended and differs by country and
// discipline, so constraining it would force schema changes on every new
// standard. issuingAuthority + certificateNumber carry the provenance.
//
// expiryDate is indexed because certificate expiry will drive qualification
// notifications and AVL re-validation jobs.

@Entity('vendor_certifications')
@Index('IDX_vcr_org_vendor',  ['organizationId', 'vendorId'])
@Index('IDX_vcr_org_expiry',  ['organizationId', 'expiryDate'])
@Index('IDX_vcr_org_deleted', ['organizationId', 'isDeleted'])
export class VendorCertification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  vendorId: string;

  @ManyToOne(() => Vendor, v => v.certifications, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column({ length: 255, nullable: false })
  certificationName: string;

  @Column({ length: 100, nullable: true })
  certificateNumber: string;

  @Column({ length: 255, nullable: true })
  issuingAuthority: string;

  @Column({ type: 'date', nullable: true })
  issueDate: Date;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  // URL only — binary files live in cloud storage, never in the database.
  @Column({ length: 1000, nullable: true })
  documentUrl: string;

  @Column({ length: 100, nullable: true })
  scopeOfCertification: string;

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
