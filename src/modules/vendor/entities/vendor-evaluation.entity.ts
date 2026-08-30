import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Vendor }             from './vendor.entity';
import { EvaluationStage }    from '../enums/evaluation-stage.enum';
import { EvaluationDecision } from '../enums/evaluation-decision.enum';

// APPEND-ONLY approval trail.
//
// Rows are inserted, never updated or deleted — hence no isDeleted, no
// updatedBy, and no @UpdateDateColumn. Overwriting approvedBy/approvalDate on
// the vendor row would destroy the qualification history that procurement and
// audit need to reconstruct, so the vendor keeps only the rolled-up current
// values and the decision sequence lives here.
//
// The stage/decision pair is the integration point for a future workflow
// engine: Submitted → Procurement → Finance → Quality/HSE → Final. No workflow
// engine is implemented here because the project does not have one yet.

@Entity('vendor_evaluations')
@Index('IDX_vev_org_vendor',   ['organizationId', 'vendorId'])
@Index('IDX_vev_org_stage',    ['organizationId', 'stage'])
@Index('IDX_vev_org_decision', ['organizationId', 'decision'])
export class VendorEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  vendorId: string;

  @ManyToOne(() => Vendor, v => v.evaluations, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column({ type: 'enum', enum: EvaluationStage, nullable: false })
  stage: EvaluationStage;

  @Column({ type: 'enum', enum: EvaluationDecision, nullable: false })
  decision: EvaluationDecision;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number;

  @Column({ length: 100, nullable: true })
  referenceNumber: string;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ length: 255, nullable: false })
  evaluatedBy: string;

  @Column({ type: 'datetime', nullable: false })
  evaluatedAt: Date;

  // ── Audit (creation only — records are immutable) ─────────────────

  @Column({ length: 255, nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
