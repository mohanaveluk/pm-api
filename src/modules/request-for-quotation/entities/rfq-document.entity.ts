import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Rfq } from './rfq.entity';
import { RfqDocumentSection } from '../enums/rfq.enums';

// A document of the RFQ package (the file itself is in cloud storage). It was
// uploaded, picked from one of the RFQ's material requisitions, or — for the
// vendor's qualification documents — picked from the vendor's own Vendor
// Master documents.
@Entity('rfq_documents')
@Index('IDX_rfqd_rfq_section', ['rfqId', 'section'])
export class RfqDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  rfqId: string;

  @ManyToOne(() => Rfq, (r) => r.documents, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfqId' })
  rfq: Rfq;

  @Column({ type: 'enum', enum: RfqDocumentSection })
  section: RfqDocumentSection;

  @Column({ length: 255 })
  documentName: string;

  @Column({ length: 1000 })
  documentUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ type: 'bigint', nullable: true,
    transformer: { to: (v: number | null) => v, from: (v: string | null) => (v === null ? null : Number(v)) } })
  fileSizeBytes: number | null;

  /** Picked from a material requisition (its document id and number). */
  @Column({ type: 'varchar', length: 36, nullable: true })
  sourceRequisitionId: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  sourceDocumentId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sourceMrNumber: string | null;

  /** Picked from the vendor's Vendor Master documents. */
  @Column({ type: 'varchar', length: 36, nullable: true })
  vendorDocumentId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  uploadedBy: string | null;

  @CreateDateColumn()
  uploadedAt: Date;
}
