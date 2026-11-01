import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Organization } from '../../organization/entity/organization.entity';
import { Project }      from '../../project/entities/project.entity';
import { WbsCostCode }  from '../../wbs-cost-code/entity/wbs-cost-code.entity';
import { MaterialRequisitionStatus } from '../enums/material-requisition.enums';
import { MaterialRequisitionItem }     from './material-requisition-item.entity';
import { MaterialRequisitionCompliance } from './material-requisition-compliance.entity';
import { MaterialRequisitionDeviation } from './material-requisition-deviation.entity';
import { MaterialRequisitionDocument } from './material-requisition-document.entity';
import { MaterialRequisitionParticipant } from './material-requisition-participant.entity';

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
@Index('UQ_mr_org_tracking',  ['organizationId', 'trackingId'], { unique: true })
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

  // What is being requisitioned, in a few words — shown in the list and emails.
  @Column({ type: 'varchar', length: 200, nullable: true })
  shortDescription: string | null;

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

  // Ties this requisition to every document raised from it (review, approval,
  // RFQ, purchase order, …) — see WorkflowTrackingService. TRK-2026-0001.
  @Column({ type: 'varchar', length: 30, nullable: true })
  trackingId: string | null;

  // Incremented on every (re)submission; reviewers' and approvers' decisions
  // belong to the current round.
  @Column({ type: 'int', default: 0 })
  reviewRound: number;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  approvedAt: Date | null;

  // Where an ON_HOLD requisition returns to when the hold is released.
  @Column({ type: 'varchar', length: 30, nullable: true })
  statusBeforeHold: MaterialRequisitionStatus | null;

  // Set once a purchase order is raised against the requisition: from then on
  // it — and its project, client and WBS / cost code — cannot be edited.
  @Column({ type: 'datetime', nullable: true })
  lockedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lockedReason: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lockedBy: string | null;

  @OneToMany(() => MaterialRequisitionItem, (i) => i.requisition)
  items: MaterialRequisitionItem[];

  @OneToMany(() => MaterialRequisitionDocument, (d) => d.requisition)
  documents: MaterialRequisitionDocument[];

  @OneToMany(() => MaterialRequisitionCompliance, (c) => c.requisition)
  compliances: MaterialRequisitionCompliance[];

  @OneToMany(() => MaterialRequisitionDeviation, (d) => d.requisition)
  deviations: MaterialRequisitionDeviation[];

  @OneToMany(() => MaterialRequisitionParticipant, (p) => p.requisition)
  participants: MaterialRequisitionParticipant[];

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
