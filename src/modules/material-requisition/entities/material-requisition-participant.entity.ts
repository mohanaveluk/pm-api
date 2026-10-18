import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { RequisitionDecision, RequisitionParticipantRole } from '../enums/material-requisition.enums';
import { MaterialRequisition } from './material-requisition.entity';

// An internal user assigned to review or approve a requisition.
//
// The decision columns hold the CURRENT round only; they are cleared each time
// the requisition is (re)submitted. Every past decision stays on the workflow
// timeline (workflow_events), so nothing is lost when a round restarts.
//
// Name and email are snapshots so notifications and history still read
// correctly if the user is later renamed or deactivated.
@Entity('material_requisition_participants')
@Index('UQ_mrp_req_role_user', ['requisitionId', 'role', 'userId'], { unique: true })
@Index('IDX_mrp_org_user_role', ['organizationId', 'userId', 'role'])
export class MaterialRequisitionParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  requisitionId: string;

  @ManyToOne(() => MaterialRequisition, (mr) => mr.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisitionId' })
  requisition: MaterialRequisition;

  @Column({ type: 'enum', enum: RequisitionParticipantRole })
  role: RequisitionParticipantRole;

  @Column({ length: 36 })
  userId: string;

  @Column({ length: 255 })
  userName: string;

  @Column({ length: 255 })
  userEmail: string;

  // Order shown on screen and in emails.
  @Column({ type: 'int', default: 0 })
  sequence: number;

  @Column({ type: 'enum', enum: RequisitionDecision, nullable: true })
  decision: RequisitionDecision | null;

  @Column({ type: 'text', nullable: true })
  decisionComments: string | null;

  @Column({ type: 'datetime', nullable: true })
  decidedAt: Date | null;

  // Set when a reviewer changed the requisition during the current round;
  // their decision must then say what was changed.
  @Column({ default: false })
  editedInRound: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  assignedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
