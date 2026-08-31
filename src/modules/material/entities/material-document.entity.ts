import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Material }             from './material.entity';
import { MaterialDocumentType } from '../enums/material-document-type.enum';

// Material document register — the single source of truth for material
// documents, replacing the flat URL columns on the materials table.
//
// Modelled on vendor_documents so both masters version documents identically.
// Stores URLs only; binaries go to cloud storage via CloudStorageService.
//
// VERSIONING
// A revision is a NEW ROW: version incremented, supersedesId pointing at the
// row it replaces, and the superseded row flipped to isActive=false. Nothing is
// updated in place and nothing is removed, so the full document history of a
// material survives — which is what makes it safe to keep accepting documents
// after a purchase order has locked the rest of the record.
//
// A row with supersedesId=null starts a new chain at version 1. That is how a
// second PHOTO is added alongside the first rather than replacing it.

@Entity('material_documents')
@Index('IDX_mdc_org_material', ['organizationId', 'materialId'])
@Index('IDX_mdc_org_type',     ['organizationId', 'documentType'])
@Index('IDX_mdc_org_active',   ['organizationId', 'isActive'])
@Index('IDX_mdc_org_expiry',   ['organizationId', 'expiryDate'])
@Index('IDX_mdc_org_deleted',  ['organizationId', 'isDeleted'])
@Index('IDX_mdc_supersedes',   ['supersedesId'])
export class MaterialDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  materialId: string;

  @ManyToOne(() => Material, m => m.documents, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'materialId' })
  material: Material;

  @Column({ type: 'enum', enum: MaterialDocumentType, nullable: false })
  documentType: MaterialDocumentType;

  @Column({ length: 1000, nullable: false })
  documentUrl: string;

  @Column({ length: 255, nullable: true })
  fileName: string;

  @Column({ length: 100, nullable: true })
  mimeType: string;

  @Column({ type: 'bigint', nullable: true })
  fileSizeBytes: number;

  @Column({ length: 500, nullable: true })
  title: string;

  // ── Versioning & validity ─────────────────────────────────────────

  @Column({ type: 'int', default: 1 })
  version: number;

  // Points at the document row this revision replaces (null starts a chain).
  @Column({ nullable: true })
  supersedesId: string;

  @Column({ type: 'date', nullable: true })
  effectiveFrom: Date;

  @Column({ type: 'date', nullable: true })
  effectiveTo: Date;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  // False once superseded by a newer version. Superseded rows are retained.
  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  // True when the row was created by migrating a legacy flat URL column rather
  // than by an explicit upload. Lets a backfill be audited or re-run safely.
  @Column({ default: false })
  isMigrated: boolean;

  // ── Upload provenance ─────────────────────────────────────────────

  @Column({ length: 255, nullable: true })
  uploadedBy: string;

  @Column({ nullable: true, type: 'datetime' })
  uploadedAt: Date;

  // ── Soft delete ───────────────────────────────────────────────────
  // Blocked entirely once the parent material is purchase-order locked.

  @Column({ default: false, name: 'is_deleted' })
  isDeleted: boolean;

  @Column({ nullable: true, type: 'datetime' })
  deletedAt: Date;

  @Column({ length: 255, nullable: true })
  deletedBy: string;

  // ── Audit ─────────────────────────────────────────────────────────

  @Column({ length: 255, nullable: true })
  createdBy: string;

  @Column({ length: 255, nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
