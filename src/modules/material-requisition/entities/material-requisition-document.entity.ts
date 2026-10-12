import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { RequisitionDocumentType } from '../enums/material-requisition.enums';
import { MaterialRequisition } from './material-requisition.entity';

// Metadata and URL only — the file itself is in cloud storage. The set of
// documents is replaced as a whole when a draft is saved.

@Entity('material_requisition_documents')
@Index('IDX_mrd_requisition', ['requisitionId'])
export class MaterialRequisitionDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  requisitionId: string;

  @ManyToOne(() => MaterialRequisition, (r) => r.documents, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisitionId' })
  requisition: MaterialRequisition;

  @Column({ type: 'enum', enum: RequisitionDocumentType })
  documentType: RequisitionDocumentType;

  @Column({ length: 255 })
  documentName: string;

  @Column({ length: 1000 })
  documentUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ type: 'bigint', nullable: true })
  fileSizeBytes: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  uploadedBy: string | null;

  @CreateDateColumn()
  uploadedAt: Date;
}
