import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Rfq } from './rfq.entity';
import { MaterialRequisitionCompliance } from '../../material-requisition/entities/material-requisition-compliance.entity';

// One compliance item of an RFQ. The buyer's requirement comes from a selected
// material requisition (sourceComplianceId — the relationship back to the
// requisition's compliance item) or is typed on the RFQ. The vendor answers
// it: Compliant Yes / No and Remarks — Remarks are required for a No.
@Entity('rfq_compliances')
@Index('IDX_rfqc_rfq', ['rfqId', 'sequence'])
@Index('IDX_rfqc_source', ['sourceComplianceId'])
export class RfqCompliance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  rfqId: string;

  @ManyToOne(() => Rfq, (r) => r.compliances, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfqId' })
  rfq: Rfq;

  @Column({ type: 'int' })
  sequence: number;

  /** The material requisition compliance item it was brought in from, if any. */
  @Column({ type: 'varchar', length: 36, nullable: true })
  sourceComplianceId: string | null;

  @ManyToOne(() => MaterialRequisitionCompliance, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sourceComplianceId' })
  sourceCompliance: MaterialRequisitionCompliance | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  sourceRequisitionId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sourceMrNumber: string | null;

  @Column({ type: 'text' })
  requirement: string;

  // ── The vendor's ──────────────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  vendorResponse: string | null;

  /** null until the vendor answers. */
  @Column({ type: 'boolean', nullable: true })
  compliant: boolean | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
