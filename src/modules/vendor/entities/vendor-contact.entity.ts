import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Vendor } from './vendor.entity';

// A vendor has many contact people (sales, technical, accounts, QA/QC, HSE).
// Exactly one may be flagged isPrimary; the service mirrors that row onto the
// vendor's denormalised primaryContactPerson/email/mobileNumber columns.

@Entity('vendor_contacts')
@Index('IDX_vct_org_vendor',  ['organizationId', 'vendorId'])
@Index('IDX_vct_org_deleted', ['organizationId', 'isDeleted'])
@Index('IDX_vct_email',       ['organizationId', 'email'])
export class VendorContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  vendorId: string;

  @ManyToOne(() => Vendor, v => v.contacts, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column({ length: 255, nullable: false })
  contactPerson: string;

  @Column({ length: 150, nullable: true })
  designation: string;

  @Column({ length: 100, nullable: true })
  department: string;

  @Column({ length: 255, nullable: true })
  email: string;

  // Stored as strings so international formats survive intact.
  @Column({ length: 30, nullable: true })
  mobileNumber: string;

  @Column({ length: 30, nullable: true })
  landlineNumber: string;

  @Column({ default: false })
  isPrimary: boolean;

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
