import {
  Entity, PrimaryGeneratedColumn, Column, Index, UpdateDateColumn,
} from 'typeorm';

// Counter table for concurrency-safe Material Code generation.
// Each row tracks the last issued sequence for one (org, categoryPrefix) pair.
// The create-material transaction locks the row with SELECT ... FOR UPDATE
// before incrementing, so concurrent inserts never generate duplicate codes.
//
// Generated code format:  <categoryPrefix><sequence padded to 6 digits>
//   e.g.  RAW000001, CON000002, EQU000001

@Entity('material_code_counters')
@Index('UQ_mcc_org_prefix', ['organizationId', 'categoryPrefix'], { unique: true })
export class MaterialCodeCounter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  organizationId: string;

  // First 3 uppercase alphabetic characters derived from the category name.
  // e.g. "Raw Material" → "RAW", "Consumable" → "CON", "Spare Part" → "SPA"
  @Column({ length: 3, nullable: false })
  categoryPrefix: string;

  @Column({ type: 'bigint', unsigned: true, default: 0 })
  lastSequence: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
