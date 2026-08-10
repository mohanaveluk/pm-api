import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Organization } from '../../organization/entity/organization.entity';
import { UomType } from '../enums/uom-type.enum';

@Entity('unit_of_measurements')
@Index('UQ_uom_org_code', ['organizationId', 'code'], { unique: true })
@Index('IDX_uom_org_name',    ['organizationId', 'name'])
@Index('IDX_uom_org_type',    ['organizationId', 'uomType'])
@Index('IDX_uom_org_active',  ['organizationId', 'isActive'])
@Index('IDX_uom_org_deleted', ['organizationId', 'isDeleted'])
export class UnitOfMeasurement {
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
  // code is the stable machine-readable identifier (KG, LTR, MTR, …).
  // symbol is the human-readable notation (kg, L, m, yd, in, °C, …).

  @Column({ length: 20, nullable: false })
  code: string;

  @Column({ length: 255, nullable: false })
  name: string;

  @Column({ length: 20, nullable: true })
  symbol: string;

  @Column({ length: 50, nullable: true })
  shortName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // ── Classification ────────────────────────────────────────────────

  @Column({ type: 'enum', enum: UomType, default: UomType.OTHER })
  uomType: UomType;

  // ── UI / ordering ─────────────────────────────────────────────────

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

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
