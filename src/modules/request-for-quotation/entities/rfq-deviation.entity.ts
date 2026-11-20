import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Rfq } from './rfq.entity';

// One deviation item of an RFQ — the vendor's. Brought in from the selected
// material requisitions' deviations when the RFQ is created, then maintained by
// the vendor until the RFQ is completed or approved. Clause No. and RFQ
// Requirement are required; Justification too when Vendor Deviation is not ticked.
@Entity('rfq_deviations')
@Index('IDX_rfqdv_rfq', ['rfqId', 'sequence'])
export class RfqDeviation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  rfqId: string;

  @ManyToOne(() => Rfq, (r) => r.deviations, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfqId' })
  rfq: Rfq;

  @Column({ type: 'int' })
  sequence: number;

  /** The material requisition deviation it was brought in from, if any. */
  @Column({ type: 'varchar', length: 36, nullable: true })
  sourceDeviationId: string | null;

  @Column({ length: 50 })
  clauseNo: string;

  @Column({ type: 'text' })
  rfqRequirement: string;

  @Column({ default: false })
  vendorDeviation: boolean;

  @Column({ type: 'text', nullable: true })
  justification: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
