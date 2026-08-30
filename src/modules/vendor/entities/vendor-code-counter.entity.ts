import {
  Entity, PrimaryGeneratedColumn, Column, Index, UpdateDateColumn,
} from 'typeorm';

// Counter table for concurrency-safe Vendor Code generation.
// Each row tracks the last issued sequence for one (org, categoryPrefix) pair.
// The create-vendor transaction locks the row with SELECT ... FOR UPDATE before
// incrementing, so concurrent inserts can never generate duplicate codes.
//
// This mirrors material_code_counters exactly — the Material Master already
// solved this problem and the two masters should behave identically.
//
// Generated code format:  <categoryPrefix><sequence padded to 6 digits>
//   e.g.  CIV000001, MEC000002, ELE000001

@Entity('vendor_code_counters')
@Index('UQ_vcc_org_prefix', ['organizationId', 'categoryPrefix'], { unique: true })
export class VendorCodeCounter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  organizationId: string;

  // First 3 uppercase alphabetic characters derived from the Industry Category.
  // e.g. "Civil" → "CIV", "Mechanical" → "MEC", "Electrical" → "ELE"
  @Column({ length: 3, nullable: false })
  categoryPrefix: string;

  @Column({ type: 'bigint', unsigned: true, default: 0 })
  lastSequence: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
