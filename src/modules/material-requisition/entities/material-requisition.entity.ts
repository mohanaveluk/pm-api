import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Organization } from '../../organization/entity/organization.entity';
import { Project }      from '../../project/entities/project.entity';
import { WbsCostCode }  from '../../wbs-cost-code/entity/wbs-cost-code.entity';
import { MaterialRequisitionStatus } from '../enums/material-requisition.enums';
import { MaterialRequisitionItem }     from './material-requisition-item.entity';
import { MaterialRequisitionDocument } from './material-requisition-document.entity';

// Material Requisition header. The lines and the documents are child rows.
//
// The client is never stored: it is the client of the project. The WBS / cost
// code carries the area, system, discipline, department, work package and
// activities, so those are read from it rather than copied here.

@Entity('material_requisitions')
@Index('UQ_mr_org_code',      ['organizationId', 'code'], { unique: true })
@Index('UQ_mr_org_number',    ['organizationId', 'mrNumber'], { unique: true })
@Index('IDX_mr_org_status',   ['organizationId', 'status'])
@Index('IDX_mr_org_project',  ['organizationId', 'projectId'])
@Index('IDX_mr_org_deleted',  ['organizationId', 'isDeleted'])
export class MaterialRequisition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // System-generated sequence (0001, 0002, …).
  @Column({ length: 20 })
  code: string;

  // The number the business uses on paper. Taken from the request when given,
  // otherwise it is the generated code.
  @Column({ length: 50 })
  mrNumber: string;

  @Column({ nullable: false })
  projectId: string;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  // Required to submit; a draft may not have one yet.
  @Column({ type: 'varchar', length: 36, nullable: true })
  wbsCostCodeId: string | null;

  @ManyToOne(() => WbsCostCode, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'wbsCostCodeId' })
  wbsCostCode: WbsCostCode | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  budgetHead: string | null;

  // Required on site (ROS) — required to submit.
  @Column({ type: 'date', nullable: true })
  requiredOnSiteDate: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mtoReference: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  pidReference: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  isometricReference: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  areaUnit: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ type: 'enum', enum: MaterialRequisitionStatus, default: MaterialRequisitionStatus.DRAFT })
  status: MaterialRequisitionStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  submittedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  submittedAt: Date | null;

  @OneToMany(() => MaterialRequisitionItem, (i) => i.requisition)
  items: MaterialRequisitionItem[];

  @OneToMany(() => MaterialRequisitionDocument, (d) => d.requisition)
  documents: MaterialRequisitionDocument[];

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
