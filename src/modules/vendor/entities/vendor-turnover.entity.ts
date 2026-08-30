import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Vendor } from './vendor.entity';

// Multi-year declared turnover. One row per financial year per vendor, so a
// three-year trend is a query rather than three columns:
//   2023 → USD 10M,  2024 → USD 12M,  2025 → USD 15M
//
// Amounts are DECIMAL(18,4). Never float — currency arithmetic on binary
// floating point loses money.

@Entity('vendor_turnovers')
@Index('UQ_vtn_vendor_year', ['organizationId', 'vendorId', 'financialYear'], { unique: true })
@Index('IDX_vtn_org_vendor', ['organizationId', 'vendorId'])
export class VendorTurnover {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  vendorId: string;

  @ManyToOne(() => Vendor, v => v.turnovers, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column({ type: 'int', nullable: false })
  financialYear: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: false })
  turnover: number;

  // ISO 4217.
  @Column({ length: 10, nullable: false })
  currency: string;

  @Column({ default: false })
  isAudited: boolean;

  @Column({ length: 1000, nullable: true })
  financialStatementUrl: string;

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
