import {
  Entity, PrimaryGeneratedColumn, Column, Index, UpdateDateColumn,
} from 'typeorm';

// Shared counter for simple sequential master-data codes.
//
// One row per (organization, sequenceKey) pair. Deliberately ONE table rather
// than a counter table per master: Material Category, Material Group, Unit of
// Measurement and Industry Category all need the same plain per-organization
// sequence, and a new master can start numbering by picking a new key with no
// schema change.
//
// This is distinct from material_code_counters / vendor_code_counters, which
// key on a derived category PREFIX because those codes embed a classification
// (RAW000001, CIV000001). The masters here carry a bare number.
//
// Generated code format: sequence zero-padded to 4 digits — 0001, 0002, …
// Past 9999 the code simply grows to 10000; nothing truncates.

@Entity('master_code_counters')
@Index('UQ_mcc_org_key', ['organizationId', 'sequenceKey'], { unique: true })
export class MasterCodeCounter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  organizationId: string;

  // Identifies which master this sequence belongs to — see MasterSequenceKey.
  @Column({ length: 50, nullable: false })
  sequenceKey: string;

  @Column({ type: 'bigint', unsigned: true, default: 0 })
  lastSequence: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
