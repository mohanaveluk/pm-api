import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { MaterialRequisition } from './material-requisition.entity';

// One compliance item of a requisition: a requirement, what the vendor said,
// and whether that complies. Replaced as a set when the requisition is saved;
// `sequence` is the Sr# shown on screen.
@Entity('material_requisition_compliances')
@Index('IDX_mrc_requisition', ['requisitionId', 'sequence'])
export class MaterialRequisitionCompliance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  requisitionId: string;

  @ManyToOne(() => MaterialRequisition, (r) => r.compliances, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisitionId' })
  requisition: MaterialRequisition;

  @Column({ type: 'int' })
  sequence: number;

  @Column({ type: 'text' })
  requirement: string;

  @Column({ type: 'text' })
  vendorResponse: string;

  @Column({ default: false })
  compliant: boolean;

  // Required when not compliant: why it is still acceptable, or what follows.
  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
