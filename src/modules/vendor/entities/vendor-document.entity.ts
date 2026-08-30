import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Vendor }             from './vendor.entity';
import { VendorDocumentType } from '../enums/vendor-document-type.enum';

// Vendor document register. Stores URLs only — binaries go to cloud storage
// through CloudStorageService, exactly as the Material Master does.
//
// Versioning: a new revision of the same document is inserted as a new row with
// version incremented and supersedesId pointing at the row it replaces; the
// superseded row is flagged isActive=false rather than updated in place. Trade
// licences, ISO/HSE certificates, insurance, and tax certificates all need this
// history for audit and for expiry-driven re-qualification.

@Entity('vendor_documents')
@Index('IDX_vdc_org_vendor',  ['organizationId', 'vendorId'])
@Index('IDX_vdc_org_type',    ['organizationId', 'documentType'])
@Index('IDX_vdc_org_expiry',  ['organizationId', 'expiryDate'])
@Index('IDX_vdc_org_deleted', ['organizationId', 'isDeleted'])
export class VendorDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  vendorId: string;

  @ManyToOne(() => Vendor, v => v.documents, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column({ type: 'enum', enum: VendorDocumentType, nullable: false })
  documentType: VendorDocumentType;

  @Column({ length: 1000, nullable: false })
  documentUrl: string;

  @Column({ length: 255, nullable: true })
  fileName: string;

  @Column({ length: 100, nullable: true })
  mimeType: string;

  @Column({ type: 'bigint', nullable: true })
  fileSizeBytes: number;

  // ── Versioning & validity ─────────────────────────────────────────

  @Column({ type: 'int', default: 1 })
  version: number;

  // Points at the document row this revision replaces (null for the first).
  @Column({ nullable: true })
  supersedesId: string;

  @Column({ type: 'date', nullable: true })
  effectiveFrom: Date;

  @Column({ type: 'date', nullable: true })
  effectiveTo: Date;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  // ── Upload provenance ─────────────────────────────────────────────

  @Column({ length: 255, nullable: true })
  uploadedBy: string;

  @Column({ nullable: true, type: 'datetime' })
  uploadedAt: Date;

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
