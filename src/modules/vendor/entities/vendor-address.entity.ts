import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Vendor }            from './vendor.entity';
import { VendorAddressType } from '../enums/vendor-address-type.enum';

// Registered / corporate / factory / workshop / warehouse / branch / site office.
// Modelled as child rows from day one so that adding a seventh premises type
// later never requires an ALTER on the vendors table.

@Entity('vendor_addresses')
@Index('IDX_vad_org_vendor',  ['organizationId', 'vendorId'])
@Index('IDX_vad_org_type',    ['organizationId', 'addressType'])
@Index('IDX_vad_org_country', ['organizationId', 'country'])
@Index('IDX_vad_org_deleted', ['organizationId', 'isDeleted'])
export class VendorAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  vendorId: string;

  @ManyToOne(() => Vendor, v => v.addresses, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column({ type: 'enum', enum: VendorAddressType, nullable: false })
  addressType: VendorAddressType;

  @Column({ length: 255, nullable: true })
  addressLine1: string;

  @Column({ length: 255, nullable: true })
  addressLine2: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  state: string;

  // ISO 3166-1 alpha-2.
  @Column({ length: 2, nullable: true })
  country: string;

  @Column({ length: 20, nullable: true })
  postalCode: string;

  @Column({ length: 30, nullable: true })
  phoneNumber: string;

  @Column({ length: 255, nullable: true })
  email: string;

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
