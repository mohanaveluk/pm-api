import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Organization } from '../../organization/entity/organization.entity';

@Entity('industry_categories')
@Index('UQ_ic_org_code', ['organizationId', 'code'], { unique: true })
@Index('IDX_ic_org_name',    ['organizationId', 'name'])
@Index('IDX_ic_org_active',  ['organizationId', 'isActive'])
@Index('IDX_ic_org_deleted', ['organizationId', 'isDeleted'])
export class IndustryCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  // ── Organization scope ────────────────────────────────────────────

  @Column({ nullable: false })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // ── Business key & descriptors ────────────────────────────────────
  // code is immutable after creation — downstream modules (Project, Department,
  // Discipline, Activity, Material Category, Supplier, ERP/BI integrations)
  // reference it as a stable classification key.

  @Column({ length: 30, nullable: false })
  code: string;

  @Column({ length: 255, nullable: false })
  name: string;

  @Column({ length: 100, nullable: true })
  shortName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // ── UI / ordering ─────────────────────────────────────────────────

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  // ── System flag ───────────────────────────────────────────────────
  // isSystem categories cannot be deleted — they are seeded by the platform
  // and may be referenced by integration layers (ERP, BI, QA/QC).

  @Column({ default: false })
  isSystem: boolean;

  // ── Status ────────────────────────────────────────────────────────

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  // ── Soft delete ───────────────────────────────────────────────────

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
