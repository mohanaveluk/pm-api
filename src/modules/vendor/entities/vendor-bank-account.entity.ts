import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Vendor }        from './vendor.entity';
import { PaymentMethod } from '../enums/payment-method.enum';

// SENSITIVE TABLE.
//
// accountNumber and iban are never returned in full by the standard vendor
// endpoints — the service masks them to ****1234 unless the caller holds the
// privileged role checked in VendorService.assertCanViewSensitive().
//
// The columns are marked { select: false } so a bare repository read cannot
// leak them by accident; retrieving them requires an explicit addSelect, which
// is done in exactly one place (findBankAccounts with reveal=true).
//
// Never log the contents of these columns.

@Entity('vendor_bank_accounts')
@Index('IDX_vba_org_vendor',  ['organizationId', 'vendorId'])
@Index('IDX_vba_org_deleted', ['organizationId', 'isDeleted'])
export class VendorBankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  vendorId: string;

  @ManyToOne(() => Vendor, v => v.bankAccounts, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column({ length: 255, nullable: false })
  bankName: string;

  @Column({ length: 255, nullable: true })
  branch: string;

  @Column({ length: 255, nullable: true })
  accountHolderName: string;

  // ── Sensitive: excluded from default SELECT ───────────────────────

  @Column({ length: 100, nullable: true, select: false })
  accountNumber: string;

  @Column({ length: 50, nullable: true, select: false })
  iban: string;

  @Column({ length: 20, nullable: true, select: false })
  swiftCode: string;

  // ── Non-sensitive descriptors ─────────────────────────────────────
  // Last 4 digits, persisted at write time so list views can show a masked
  // reference without ever selecting the full account number.

  @Column({ length: 4, nullable: true })
  accountNumberLast4: string;

  @Column({ length: 10, nullable: true })
  currency: string;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  preferredPaymentMethod: PaymentMethod;

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
