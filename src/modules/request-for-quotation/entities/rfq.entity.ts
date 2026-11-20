import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn,
  OneToMany, OneToOne,
} from 'typeorm';
import { Organization } from '../../organization/entity/organization.entity';
import { Project } from '../../project/entities/project.entity';
import { Client } from '../../client/entities/client.entity';
import { Vendor } from '../../vendor/entities/vendor.entity';
import { RfqNdaScope, RfqStatus } from '../enums/rfq.enums';
import { RfqRequisition } from './rfq-requisition.entity';
import { RfqItem } from './rfq-item.entity';
import { RfqDocument } from './rfq-document.entity';
import { RfqOtherCharge } from './rfq-other-charge.entity';
import { RfqChecklistItem } from './rfq-checklist-item.entity';
import { RfqCompliance } from './rfq-compliance.entity';
import { RfqDeviation } from './rfq-deviation.entity';
import { RfqAcknowledgement } from './rfq-acknowledgement.entity';

// Request for Quotation: the package a company buyer sends one vendor —
// letter, instructions, scope, technical and commercial terms, the price
// schedule raised from approved material requisitions, the compliance matrix
// and the deviation list. The vendor answers on the same record (prices,
// checklist, compliance responses, deviations, qualification documents).
//
// The trackingId is copied from the (first) requisition it was raised from, so
// the RFQ appears on that requisition's workflow timeline.
@Entity('rfqs')
@Index('UQ_rfq_org_code', ['organizationId', 'code'], { unique: true })
@Index('UQ_rfq_org_number_rev', ['organizationId', 'rfqNumber', 'revisionNo'], { unique: true })
@Index('IDX_rfq_org_status', ['organizationId', 'status'])
@Index('IDX_rfq_org_vendor', ['organizationId', 'vendorId'])
@Index('IDX_rfq_org_project', ['organizationId', 'projectId'])
export class Rfq {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  dguid: string;

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // ── 1. RFQ letter ────────────────────────────────────────────────

  /** System sequence (0001, 0002, …) — never typed. */
  @Column({ length: 20 })
  code: string;

  /** The number people use: typed, or the code when left empty. */
  @Column({ length: 50 })
  rfqNumber: string;

  /** 0 for the first issue; typed or left at the default. */
  @Column({ type: 'int', default: 0 })
  revisionNo: number;

  /** Set when the RFQ is issued; the creation date until then. */
  @Column({ type: 'date', nullable: true })
  issueDate: string | null;

  @Column({ length: 36 })
  projectId: string;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  /** The project's client by default; the buyer may choose another. */
  @Column({ type: 'varchar', length: 36, nullable: true })
  clientId: string | null;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clientId' })
  client: Client | null;

  // The buyer to contact — a snapshot of the signed-in buyer.
  @Column({ type: 'varchar', length: 255, nullable: true })
  contactName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPhone: string | null;

  @Column({ type: 'date', nullable: true })
  bidClosingDate: string | null;

  /** Sealed bid: opening needs at least 3 people (enforced in the Bid Opening Document). */
  @Column({ default: false })
  sealedBid: boolean;

  @Column({ type: 'enum', enum: RfqNdaScope, nullable: true })
  ndaScope: RfqNdaScope | null;

  /** The vendor the RFQ is addressed to. */
  @Column({ type: 'varchar', length: 36, nullable: true })
  vendorId: string | null;

  @ManyToOne(() => Vendor, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  subject: string | null;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  // ── 2. Instructions to bidders ───────────────────────────────────

  @Column({ type: 'text', nullable: true })
  instructionsToBidders: string | null;

  // ── 3. Scope of supply / work ────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  scopeDescription: string | null;

  @Column({ type: 'text', nullable: true })
  scopeQuantityNotes: string | null;

  @Column({ type: 'text', nullable: true })
  deliveryLocation: string | null;

  @Column({ type: 'text', nullable: true })
  deliverySchedule: string | null;

  // ── 4. Technical specifications ──────────────────────────────────

  @Column({ type: 'text', nullable: true }) materialGradeStandards: string | null;
  @Column({ type: 'text', nullable: true }) designConditions: string | null;
  @Column({ type: 'text', nullable: true }) dimensionalRequirements: string | null;
  @Column({ type: 'text', nullable: true }) applicableCodes: string | null;
  @Column({ type: 'text', nullable: true }) qualityRequirements: string | null;
  @Column({ type: 'text', nullable: true }) regulatoryCompliance: string | null;
  @Column({ type: 'text', nullable: true }) inspectionTesting: string | null;
  @Column({ type: 'text', nullable: true }) documentationRequirements: string | null;

  // ── 6. Commercial terms & conditions ─────────────────────────────

  @Column({ type: 'text', nullable: true }) pricingFormat: string | null;
  @Column({ type: 'text', nullable: true }) incoterms: string | null;
  @Column({ type: 'text', nullable: true }) paymentTerms: string | null;
  @Column({ type: 'text', nullable: true }) taxesDuties: string | null;
  @Column({ type: 'text', nullable: true }) warranty: string | null;
  @Column({ type: 'text', nullable: true }) liquidatedDamages: string | null;
  @Column({ type: 'text', nullable: true }) performanceGuarantee: string | null;
  @Column({ type: 'text', nullable: true }) insuranceRequirements: string | null;
  @Column({ type: 'text', nullable: true }) packingMarking: string | null;
  @Column({ type: 'text', nullable: true }) commercialDocumentation: string | null;

  // ── The vendor's quotation ───────────────────────────────────────

  /** Currency of the vendor's unit and total prices (ISO 4217). */
  @Column({ type: 'varchar', length: 3, nullable: true })
  quotedCurrency: string | null;

  @Column({ type: 'datetime', nullable: true })
  quotedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  quotedBy: string | null;

  // ── Status ───────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: RfqStatus, default: RfqStatus.DRAFT })
  status: RfqStatus;

  @Column({ type: 'datetime', nullable: true })
  issuedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  issuedBy: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  trackingId: string | null;

  // ── Children ─────────────────────────────────────────────────────

  @OneToMany(() => RfqRequisition, (r) => r.rfq) requisitions: RfqRequisition[];
  @OneToMany(() => RfqItem, (i) => i.rfq) items: RfqItem[];
  @OneToMany(() => RfqDocument, (d) => d.rfq) documents: RfqDocument[];
  @OneToMany(() => RfqOtherCharge, (c) => c.rfq) otherCharges: RfqOtherCharge[];
  @OneToMany(() => RfqChecklistItem, (c) => c.rfq) checklist: RfqChecklistItem[];
  @OneToMany(() => RfqCompliance, (c) => c.rfq) compliances: RfqCompliance[];
  @OneToMany(() => RfqDeviation, (d) => d.rfq) deviations: RfqDeviation[];
  @OneToOne(() => RfqAcknowledgement, (a) => a.rfq) acknowledgement: RfqAcknowledgement | null;

  // ── Soft delete & audit ──────────────────────────────────────────

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
