import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Organization } from '../../organization/entity/organization.entity';
import { MaterialCategory } from '../../material-category/entities/material-category.entity';

// Material Group is the second level of the material classification hierarchy:
//   Material Category → Material Group → Material Subcategory → Material Master
//
// Examples:
//   Raw Material  → Steel Products, Piping Materials, Concrete Materials
//   Consumable    → Welding Consumables, Paint & Coating, Lubricants
//   Spare Part    → Pump Parts, Valve Parts, Instrument Parts
//   Equipment     → Pumps & Compressors, Heat Exchangers, Tanks & Vessels
//   Service       → Civil Services, Mechanical Services, Instrumentation Services

@Entity('material_groups')
@Index('UQ_mg_org_cat_code', ['organizationId', 'materialCategoryId', 'code'], { unique: true })
@Index('IDX_mg_org_name',    ['organizationId', 'name'])
@Index('IDX_mg_org_cat',     ['organizationId', 'materialCategoryId'])
@Index('IDX_mg_org_active',  ['organizationId', 'isActive'])
@Index('IDX_mg_org_deleted', ['organizationId', 'isDeleted'])
export class MaterialGroup {
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

  // ── Parent classification ─────────────────────────────────────────

  @Column({ nullable: false })
  materialCategoryId: string;

  @ManyToOne(() => MaterialCategory, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'materialCategoryId' })
  materialCategory: MaterialCategory;

  // ── Business key & descriptors ────────────────────────────────────
  // code is immutable after creation — unique within (org, category).
  // Referenced by Material Master, PR, PO, Inventory, and ERP layers.

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
  // isSystem groups cannot be deleted — seeded by the platform and
  // referenced by ERP, BI, and QA/QC integration layers.

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
