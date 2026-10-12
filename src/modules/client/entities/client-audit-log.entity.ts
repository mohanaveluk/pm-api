import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { ClientAuditAction } from '../enums/client.enums';

// Business-level change history of a client: what changed, by whom and when.
// Distinct from account_audit_log, which records raw API calls.
//
// Rows are append-only and are kept when the client is soft-deleted.

@Entity('client_audit_log')
@Index('IDX_cal_org_client', ['organizationId', 'clientId', 'createdAt'])
export class ClientAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  clientId: string;

  @Column({ type: 'enum', enum: ClientAuditAction, nullable: false })
  action: ClientAuditAction;

  // One-line human summary, e.g. "Updated 3 fields".
  @Column({ type: 'varchar', length: 500, nullable: true })
  summary: string | null;

  // Field-level before/after pairs for UPDATED rows.
  @Column({ type: 'json', nullable: true })
  changes: Array<{ field: string; from: string | null; to: string | null }> | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  performedBy: string | null;

  @Column({ type: 'int', nullable: true })
  version: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
