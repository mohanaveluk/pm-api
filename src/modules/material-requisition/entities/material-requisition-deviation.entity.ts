import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { MaterialRequisition } from './material-requisition.entity';

// One deviation item of a requisition: the RFQ clause, its requirement, whether
// the vendor deviates, and the justification. Replaced as a set when the
// requisition is saved; `sequence` is the Sr# shown on screen.
@Entity('material_requisition_deviations')
@Index('IDX_mrdv_requisition', ['requisitionId', 'sequence'])
export class MaterialRequisitionDeviation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  requisitionId: string;

  @ManyToOne(() => MaterialRequisition, (r) => r.deviations, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisitionId' })
  requisition: MaterialRequisition;

  @Column({ type: 'int' })
  sequence: number;

  @Column({ length: 50 })
  clauseNo: string;

  @Column({ type: 'text' })
  rfqRequirement: string;

  @Column({ default: false })
  vendorDeviation: boolean;

  // Required when Vendor Deviation is not ticked.
  @Column({ type: 'text', nullable: true })
  justification: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
