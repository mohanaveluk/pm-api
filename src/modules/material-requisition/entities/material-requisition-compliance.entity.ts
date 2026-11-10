import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { MaterialRequisition } from './material-requisition.entity';

// One compliance item of a requisition. The buyer writes the requirement; the
// vendor's response, Compliant and Remarks are filled in by the vendor in the
// Request for Quotation (read-only on the requisition). Replaced as a set when
// the requisition is saved; `sequence` is the Sr# shown on screen.
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

  // Filled in by the vendor (RFQ).
  @Column({ type: 'text', nullable: true })
  vendorResponse: string | null;

  // Filled in by the vendor (RFQ).
  @Column({ default: false })
  compliant: boolean;

  // Filled in by the vendor (RFQ).
  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
