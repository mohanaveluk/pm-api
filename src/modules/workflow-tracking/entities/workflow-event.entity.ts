import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';
import { WorkflowAction, WorkflowEntityType } from '../enums/workflow-tracking.enums';

// One step of a procurement workflow. Append-only: rows are never updated or
// deleted, so the timeline for a trackingId is an audit trail from the first
// requisition to the last document raised from it.
//
// The actor and the document reference are snapshots — the timeline still
// reads correctly after a user is renamed or a document renumbered.
@Entity('workflow_events')
@Index('IDX_wfe_org_tracking', ['organizationId', 'trackingId'])
@Index('IDX_wfe_org_entity',   ['organizationId', 'entityType', 'entityId'])
export class WorkflowEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ length: 30 })
  trackingId: string;

  @Column({ type: 'enum', enum: WorkflowEntityType })
  entityType: WorkflowEntityType;

  @Column({ length: 36 })
  entityId: string;

  // The number people know the document by (MR number, RFQ number, PO number).
  @Column({ type: 'varchar', length: 50, nullable: true })
  entityReference: string | null;

  @Column({ type: 'enum', enum: WorkflowAction })
  action: WorkflowAction;

  @Column({ type: 'varchar', length: 30, nullable: true })
  fromStatus: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  toStatus: string | null;

  // Review / approval round the step belongs to, when it has one.
  @Column({ type: 'int', nullable: true })
  round: number | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actorName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actorEmail: string | null;

  @Column({ type: 'text', nullable: true })
  comments: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
