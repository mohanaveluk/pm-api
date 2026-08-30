import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Vendor } from './vendor.entity';

// APPEND-ONLY performance history — one row per evaluation period per vendor
// (optionally per project and per PO once those modules exist).
//
// Rows are inserted, never updated: a vendor's Q1 delivery score must remain
// readable after Q2 is recorded, otherwise trend analytics and re-qualification
// decisions have nothing to work from. Hence no isDeleted and no updatedBy.
//
// projectId and purchaseOrderId are plain nullable UUID columns rather than
// FKs: the Project and Purchase Order modules do not exist yet, and declaring
// a relation to a missing entity would not compile. They become @ManyToOne
// relations when those modules land, without a data migration.

@Entity('vendor_performances')
@Index('IDX_vpf_org_vendor',  ['organizationId', 'vendorId'])
@Index('IDX_vpf_org_period',  ['organizationId', 'evaluationPeriodEnd'])
@Index('IDX_vpf_org_project', ['organizationId', 'projectId'])
export class VendorPerformance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  vendorId: string;

  @ManyToOne(() => Vendor, v => v.performances, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  // Future FK → projects.id
  @Column({ nullable: true })
  projectId: string;

  // Future FK → purchase_orders.id
  @Column({ nullable: true })
  purchaseOrderId: string;

  // ── Evaluation window ─────────────────────────────────────────────

  @Column({ type: 'date', nullable: true })
  evaluationPeriodStart: Date;

  @Column({ type: 'date', nullable: true })
  evaluationPeriodEnd: Date;

  // ── Scores (0.00 – 100.00) ────────────────────────────────────────

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  qualityScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  deliveryScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commercialScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  hseScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  overallScore: number;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ length: 255, nullable: false })
  evaluatedBy: string;

  @Column({ type: 'datetime', nullable: false })
  evaluatedAt: Date;

  // ── Audit (creation only — records are immutable) ─────────────────

  @Column({ length: 255, nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
