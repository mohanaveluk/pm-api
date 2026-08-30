import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Vendor }   from './vendor.entity';
import { Material } from '../../material/entities/material.entity';

// Join entity for the Vendor ↔ Material many-to-many relationship.
//
// It is a first-class entity rather than a bare join table because the
// relationship carries its own commercial attributes (part numbers, lead time,
// MOQ, price validity). No Material data is copied here — only the FK.
//
// isPreferred lives on THIS row, not on the vendor: preference is per-material.
// A vendor can be the preferred source for carbon steel pipe and a fallback for
// valves, so a global "preferred vendor" flag would be wrong.

@Entity('vendor_materials')
@Index('UQ_vmt_vendor_material', ['organizationId', 'vendorId', 'materialId'], { unique: true })
@Index('IDX_vmt_org_vendor',     ['organizationId', 'vendorId'])
@Index('IDX_vmt_org_material',   ['organizationId', 'materialId'])
@Index('IDX_vmt_org_preferred',  ['organizationId', 'isPreferred'])
@Index('IDX_vmt_org_deleted',    ['organizationId', 'isDeleted'])
export class VendorMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  vendorId: string;

  @ManyToOne(() => Vendor, v => v.materials, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column({ nullable: false })
  materialId: string;

  // RESTRICT: a material that a vendor is registered to supply must not vanish
  // from under the mapping.
  @ManyToOne(() => Material, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'materialId' })
  material: Material;

  // ── Commercial attributes of the relationship ─────────────────────

  @Column({ length: 100, nullable: true })
  vendorPartNumber: string;

  @Column({ length: 100, nullable: true })
  manufacturerPartNumber: string;

  @Column({ type: 'int', nullable: true })
  leadTimeDays: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  minimumOrderQuantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  unitPrice: number;

  @Column({ length: 10, nullable: true })
  currency: string;

  @Column({ type: 'date', nullable: true })
  effectiveFrom: Date;

  @Column({ type: 'date', nullable: true })
  effectiveTo: Date;

  // Per-material preference — see the class comment above.
  @Column({ default: false })
  isPreferred: boolean;

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
