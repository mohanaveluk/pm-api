import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from 'src/modules/user/entity/user.entity';
import { EmailStatus } from '../enums/email.enums';

// Every email the application sends: written as PENDING just before sending,
// then marked SENT (with the provider's message id) or FAILED (with the error).
//
// Secrets the email carries — verification codes, reset links and tokens,
// temporary passwords — are replaced with [REDACTED] in htmlContent before it
// is stored (see EmailService.sendEmail's `redact`), so this table never holds
// a usable credential.
@Entity('email_history')
@Index('IDX_email_history_type', ['emailType'])
@Index('IDX_email_history_status', ['status'])
@Index('IDX_email_history_org_created', ['organizationId', 'createdAt'])
@Index('IDX_email_history_reference', ['referenceType', 'referenceId'])
export class EmailHistory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  guid: string;

  // EmailType value; kept as text so new types need no schema change.
  @Column({ type: 'varchar', length: 50 })
  emailType: string;

  // The organization the email belongs to, when there is one.
  @Column({ type: 'varchar', length: 36, nullable: true })
  organizationId: string | null;

  // Nullable because system-generated emails (e.g. registration) have no fromUser.
  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true, name: 'from_user_id' })
  fromUserId: string | null;

  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'from_user_id' })
  fromUser: User;

  // The sender address the transport used (SMTP_FROM).
  @Column({ type: 'varchar', length: 255 })
  fromEmail: string;

  // Comma-separated; text because an email can go to many recipients.
  @Column({ type: 'text' })
  toEmail: string;

  @Column({ type: 'text', nullable: true })
  ccEmail: string | null;

  @Column({ type: 'varchar', length: 500 })
  subject: string;

  @Column({ type: 'longtext' })
  htmlContent: string;

  @Column({ type: 'varchar', length: 50, default: EmailStatus.PENDING })
  status: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerMessageId: string | null;

  // Why sending failed (status FAILED).
  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'datetime', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  openedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date | null;

  // What the email is about, e.g. MATERIAL_REQUISITION + its id, so every email
  // for one document can be listed.
  @Column({ type: 'varchar', length: 50, nullable: true })
  referenceType: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  referenceId: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  // Email of the user whose action sent it (null for system emails).
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'created_by' })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
