import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Material } from '../../material/entities/material.entity';
import { RequisitionLineSource } from '../enums/material-requisition.enums';
import { MaterialRequisition } from './material-requisition.entity';

// One requested material. The code, description and unit are copied onto the
// line when it is saved, so the requisition keeps reading the way it was
// raised even if the Material Master is edited later. Lines are replaced as a
// set whenever a draft is saved, so they carry no soft-delete of their own.

@Entity('material_requisition_items')
@Index('IDX_mri_requisition', ['requisitionId'])
@Index('IDX_mri_material',    ['organizationId', 'materialId'])
export class MaterialRequisitionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  requisitionId: string;

  @ManyToOne(() => MaterialRequisition, (r) => r.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisitionId' })
  requisition: MaterialRequisition;

  @Column({ type: 'int' })
  lineNumber: number;

  @Column({ nullable: false })
  materialId: string;

  @ManyToOne(() => Material, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'materialId' })
  material: Material;

  @Column({ length: 50 })
  materialCode: string;

  @Column({ length: 500 })
  materialDescription: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  uom: string | null;

  // Always greater than zero: a line with no quantity is not a line.
  @Column({ type: 'decimal', precision: 15, scale: 3 })
  requestedQty: number;

  @Column({ type: 'enum', enum: RequisitionLineSource, default: RequisitionLineSource.MATERIAL_MASTER })
  source: RequisitionLineSource;

  // What the line was taken from — the earlier MR number, BOM file name, …
  @Column({ type: 'varchar', length: 255, nullable: true })
  sourceReference: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
