import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { ClientDocumentType } from '../enums/client.enums';

// Client document register. Stores metadata and the URL only — the binary goes
// to cloud storage through CloudStorageService, as it does for vendors and
// materials. Access to the file is governed by the storage layer.

@Entity('client_documents')
@Index('IDX_cdc_org_client',  ['organizationId', 'clientId'])
@Index('IDX_cdc_org_type',    ['organizationId', 'documentType'])
@Index('IDX_cdc_org_expiry',  ['organizationId', 'expiryDate'])
@Index('IDX_cdc_org_deleted', ['organizationId', 'isDeleted'])
export class ClientDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  clientId: string;

  @ManyToOne(() => Client, c => c.documents, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ type: 'enum', enum: ClientDocumentType, nullable: false })
  documentType: ClientDocumentType;

  @Column({ length: 255, nullable: false })
  documentName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  documentNumber: string | null;

  @Column({ type: 'date', nullable: true })
  issueDate: string | null;

  @Column({ type: 'date', nullable: true })
  expiryDate: string | null;

  @Column({ length: 1000, nullable: false })
  documentUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ type: 'bigint', nullable: true })
  fileSizeBytes: number | null;

  // The document's own revision label (e.g. "Rev B", "2.1") — not a system counter.
  @Column({ type: 'varchar', length: 30, nullable: true })
  documentVersion: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  uploadedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  uploadedAt: Date | null;

  @Column({ default: false, name: 'is_deleted' })
  isDeleted: boolean;

  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deletedBy: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
