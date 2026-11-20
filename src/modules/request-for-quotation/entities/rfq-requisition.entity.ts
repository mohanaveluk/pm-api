import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Rfq } from './rfq.entity';
import { MaterialRequisition } from '../../material-requisition/entities/material-requisition.entity';

// The material requisitions an RFQ was raised from (one RFQ, many requisitions).
@Entity('rfq_requisitions')
@Index('UQ_rfqr_rfq_requisition', ['rfqId', 'requisitionId'], { unique: true })
@Index('IDX_rfqr_requisition', ['requisitionId'])
export class RfqRequisition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  rfqId: string;

  @ManyToOne(() => Rfq, (r) => r.requisitions, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfqId' })
  rfq: Rfq;

  @Column({ length: 36 })
  requisitionId: string;

  @ManyToOne(() => MaterialRequisition, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requisitionId' })
  requisition: MaterialRequisition;

  /** Snapshot for display. */
  @Column({ length: 50 })
  mrNumber: string;

  @Column({ type: 'int' })
  sequence: number;

  @CreateDateColumn()
  createdAt: Date;
}
