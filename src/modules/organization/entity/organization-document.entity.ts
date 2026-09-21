import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

// Company paperwork attached to the organization profile (registration
// certificates, tax letters, licences, ...). Stores the storage URL only —
// binaries live in cloud storage. Replacing a file swaps the URL in place and
// deletes the previous object; there is deliberately no version history here.
@Entity('organization_documents')
@Index('IDX_orgdoc_org_deleted', ['organizationId', 'isDeleted'])
export class OrganizationDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 1000 })
  documentUrl: string;

  @Column({ length: 255 })
  fileName: string;

  @Column({ length: 100, nullable: true })
  mimeType: string;

  @Column({ type: 'bigint', nullable: true })
  fileSizeBytes: number;

  @Column({ length: 255, nullable: true })
  uploadedBy: string;

  @Column({ default: false, name: 'is_deleted' })
  isDeleted: boolean;

  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date;

  @Column({ length: 255, nullable: true })
  deletedBy: string;

  @Column({ length: 255, nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
