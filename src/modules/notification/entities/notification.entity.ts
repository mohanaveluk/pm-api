import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

// One user's in-app notification.
//
// Written when the thing it is about happens (an email is sent, a workflow step
// is recorded, a vendor changes status) — "fan-out on write" — so the bell and
// the notifications page read one indexed table per user. The row only points
// at its source (sourceType + sourceId); an email's content is read from
// email_history when the notification is opened, never copied here.
@Entity('notifications')
@Index('UQ_notif_user_source', ['userId', 'sourceType', 'sourceId'], { unique: true })
@Index('IDX_notif_user_feed', ['userId', 'isDeleted', 'isArchived', 'occurredAt'])
@Index('IDX_notif_user_unread', ['userId', 'isRead'])
@Index('IDX_notif_reference', ['referenceType', 'referenceId'])
export class Notification {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 36 })
  guid: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  organizationId: string | null;

  // The recipient.
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  // NotificationCategory
  @Column({ type: 'varchar', length: 20 })
  category: string;

  // EmailType for emails, the workflow action for workflow steps, …
  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 1000 })
  message: string;

  // NotificationSeverity
  @Column({ type: 'varchar', length: 20, default: 'info' })
  severity: string;

  // Where "Open" goes in the application, e.g. /material-requisitions/<id>.
  @Column({ type: 'varchar', length: 500, nullable: true })
  link: string | null;

  // NotificationSourceType
  @Column({ type: 'varchar', length: 30 })
  sourceType: string;

  @Column({ type: 'varchar', length: 64 })
  sourceId: string;

  // The document it is about (MATERIAL_REQUISITION + id, VENDOR + id, …).
  @Column({ type: 'varchar', length: 50, nullable: true })
  referenceType: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  referenceId: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  trackingId: string | null;

  // Who did it, as shown ("Priya Menon").
  @Column({ type: 'varchar', length: 255, nullable: true })
  actorName: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  // When the thing happened (the email was sent, the step was recorded).
  @Column({ type: 'datetime' })
  occurredAt: Date;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date | null;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ default: false, name: 'is_deleted' })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
