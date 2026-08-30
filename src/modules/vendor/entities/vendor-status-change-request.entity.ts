import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Vendor } from './vendor.entity';
import { StatusChangeRequestType }   from '../enums/status-change-request-type.enum';
import { StatusChangeRequestStatus } from '../enums/status-change-request-status.enum';

// Maker–checker record for vendor blacklist / un-blacklist.
//
// A requester raises the change; a manager approves or rejects it. Nothing on
// the vendor moves until the decision lands, so blacklisting can never be
// applied by a single person.
//
// Rows are retained after the decision — they are the audit trail answering
// "who asked, who approved, when, and why". Only `status`, the decision fields,
// and `approvalToken` (cleared on use) are ever mutated.
//
// approvalToken is a single-use, expiring secret delivered by email. It is
// stored { select: false } so a routine read cannot leak a live approval
// credential, and is nulled the moment a decision is recorded.

@Entity('vendor_status_change_requests')
@Index('IDX_vsc_org_vendor', ['organizationId', 'vendorId'])
@Index('IDX_vsc_org_status', ['organizationId', 'status'])
@Index('IDX_vsc_token',      ['approvalToken'])
export class VendorStatusChangeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  vendorId: string;

  @ManyToOne(() => Vendor, v => v.statusChangeRequests, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column({ type: 'enum', enum: StatusChangeRequestType, nullable: false })
  requestType: StatusChangeRequestType;

  @Column({
    type: 'enum',
    enum: StatusChangeRequestStatus,
    default: StatusChangeRequestStatus.PENDING,
  })
  status: StatusChangeRequestStatus;

  // ── Request ───────────────────────────────────────────────────────

  @Column({ type: 'text', nullable: false })
  reason: string;

  @Column({ length: 255, nullable: false })
  requestedBy: string;

  @Column({ type: 'datetime', nullable: false })
  requestedAt: Date;

  // ── Approval routing ──────────────────────────────────────────────
  // Snapshot of who the notification was sent to, so the trail survives later
  // changes to the organization's user roster.

  @Column({ type: 'json', nullable: true })
  notifiedApprovers: string[];

  @Column({ nullable: true })
  approverUserId: string;

  // ── Single-use approval credential ────────────────────────────────

  @Column({ length: 128, nullable: true, select: false })
  approvalToken: string;

  @Column({ type: 'datetime', nullable: true })
  tokenExpiresAt: Date;

  // ── Decision ──────────────────────────────────────────────────────

  @Column({ length: 255, nullable: true })
  decidedBy: string;

  @Column({ type: 'datetime', nullable: true })
  decidedAt: Date;

  @Column({ type: 'text', nullable: true })
  decisionComments: string;

  // Business status the vendor held when the request was raised, so a
  // rejection restores it exactly rather than guessing.
  @Column({ length: 30, nullable: true })
  previousVendorStatus: string;

  @Column({ nullable: true })
  previousIsActive: boolean;

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
