import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { User } from '../user/entity/user.entity';
import { EmailHistory } from 'src/shared/email/entities/email-history.entity';
import { WorkflowEvent } from '../workflow-tracking/entities/workflow-event.entity';
import { Notification } from './entities/notification.entity';
import {
  NotificationCategory, NotificationSeverity, NotificationSourceType,
} from './enums/notification.enums';
import {
  NotificationDetailDto, NotificationListDto, NotificationQueryDto, NotificationResponseDto,
} from './dto/notification.dto';

/** Everything needed to notify a set of users about one thing. */
export interface NotifyInput {
  userIds: string[];
  organizationId?: string | null;
  category: NotificationCategory;
  type: string;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  link?: string | null;
  sourceType: NotificationSourceType;
  sourceId: string;
  referenceType?: string | null;
  referenceId?: string | null;
  trackingId?: string | null;
  actorName?: string | null;
  metadata?: Record<string, any> | null;
  occurredAt?: Date;
}

/**
 * Describes the document an email is about, for the in-app item that goes with
 * the email (e.g. a material requisition's project). Registered by the module
 * that owns the document; returns null when it has nothing to add.
 */
export type EmailDescriber = (
  history: EmailHistory,
  manager: EntityManager,
) => Promise<{ message: string; metadata?: Record<string, unknown> } | null>;

/** One labelled fact shown on a notification (metadata.details). */
export interface NotificationDetail {
  label: string;
  value: string;
}

/**
 * Decides who is concerned by a workflow step of one kind of document (e.g. the
 * requester, reviewers and approvers of a material requisition). Registered by
 * the module that owns the document.
 */
export type WorkflowAudienceResolver = (event: WorkflowEvent, manager: EntityManager) => Promise<string[]>;

// Acronyms kept upper case when a type is turned into a title.
const ACRONYMS = new Set(['OTC', 'RFQ', 'PO', 'MR', 'OTP', 'QA', 'QC']);

/** "REVIEW_MATERIAL_REQUISITION" → "Review Material Requisition", "LOGIN_OTC" → "Login OTC". */
export function humanizeType(type: string): string {
  return String(type ?? '')
    .split('_')
    .filter(Boolean)
    .map((w) => (ACRONYMS.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(' ');
}

const DOCUMENT_LABELS: Record<string, string> = {
  MATERIAL_REQUISITION: 'Material Requisition',
  MR_REVIEW: 'Material Requisition',
  MR_APPROVAL: 'Material Requisition',
  RFQ: 'Request for Quotation',
  RFQ_APPROVAL: 'Request for Quotation',
  PURCHASE_ORDER: 'Purchase Order',
  GOODS_RECEIPT: 'Goods Receipt',
  INVOICE: 'Invoice',
  MATERIAL: 'Material',
  VENDOR: 'Vendor',
};

const ACTION_PHRASES: Record<string, string> = {
  CREATED: 'created',
  UPDATED: 'updated',
  SUBMITTED: 'submitted for review',
  RESUBMITTED: 'resubmitted for review',
  EDITED_IN_REVIEW: 'edited during review',
  REVIEWED: 'reviewed',
  APPROVED: 'approved',
  RETURNED: 'returned for clarification',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  REQUESTED: 'sent for approval',
  DELETED: 'deleted',
  STATUS_CHANGED: 'status changed',
  LOCKED: 'locked',
};

// A decision already notifies; the "round completed" step that accompanies it
// would be the same news twice. Steps nobody else needs to hear about are skipped too.
const SILENT_ACTIONS = new Set(['REVIEW_COMPLETED', 'APPROVAL_COMPLETED', 'NOTIFIED', 'CREATED']);

// Email types about a business document; the others are account / organization mail.
const DOCUMENT_EMAIL = /MATERIAL_REQUISITION|VENDOR|RFQ|(^|_)PO(_|$)/;

const statusText = (s: string | null) => (s ? humanizeType(s) : '');

function severityFor(type: string): NotificationSeverity {
  if (/(^|_)(REJECT|REJECTED|CANCEL|CANCELLED|BLOCK|BLACKLISTED|DELETED|INACTIVE|DISABLED|OBSOLETE|HOLD)(_|$)/.test(type)) return NotificationSeverity.WARNING;
  if (/(^|_)(APPROVE|APPROVED|REVIEWED|UNBLOCK|ACTIVATED|ACTIVE)(_|$)/.test(type)) return NotificationSeverity.SUCCESS;
  return NotificationSeverity.INFO;
}

/** Where a document opens in the application. */
function linkFor(referenceType: string | null, referenceId: string | null): string | null {
  if (!referenceType || !referenceId) return null;
  switch (referenceType) {
    case 'MATERIAL_REQUISITION':
    case 'MR_REVIEW':
    case 'MR_APPROVAL':
      return `/material-requisitions/${referenceId}`;
    case 'MATERIAL':
      return `/admin/materials/${referenceId}`;
    case 'VENDOR':
      return `/vendors/${referenceId}/view`;
    case 'RFQ':
    case 'RFQ_APPROVAL':
      return `/rfqs/${referenceId}`;
    case 'PURCHASE_ORDER':
      return `/purchase-orders/${referenceId}`;
    default:
      return null;
  }
}

const asList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x) : [];

/** "a@x.com, B@x.com" → ['a@x.com', 'b@x.com'] */
function emailsIn(...lists: Array<string | null | undefined>): string[] {
  return [...new Set(lists
    .flatMap((l) => String(l ?? '').split(','))
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean))];
}

/**
 * The in-app notification feed.
 *
 * Notifications are written as things happen (fan-out on write): one row per
 * concerned user, pointing back at the email_history / workflow_events / vendor
 * record it is about. Reading is then a single indexed query per user, read
 * state is per user, and an email's content is fetched from email_history only
 * when the notification is opened.
 */
@Injectable()
export class NotificationService {
  private readonly audiences = new Map<string, WorkflowAudienceResolver>();
  private readonly describers = new Map<string, EmailDescriber>();

  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
    @InjectRepository(User)         private readonly userRepo: Repository<User>,
    @InjectRepository(EmailHistory) private readonly emailRepo: Repository<EmailHistory>,
    @InjectRepository(WorkflowEvent) private readonly eventRepo: Repository<WorkflowEvent>,
    private readonly logger: CustomLoggerService,
  ) {}

  // ── Writing ──────────────────────────────────────────────────────

  /**
   * Creates one notification per user. Duplicates (same user, same source) are
   * ignored, so calling twice for the same thing is harmless. Never throws when
   * no manager is given — a notification must not break the action behind it.
   */
  async notify(input: NotifyInput, manager?: EntityManager): Promise<number> {
    const userIds = [...new Set(input.userIds.filter(Boolean))];
    if (!userIds.length) return 0;
    const rows = userIds.map((userId) => ({
      guid: uuidv4(),
      organizationId: input.organizationId ?? null,
      userId,
      category: input.category,
      type: input.type.slice(0, 50),
      title: input.title.slice(0, 255),
      message: input.message.slice(0, 1000),
      severity: input.severity ?? severityFor(input.type),
      link: input.link ?? null,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      trackingId: input.trackingId ?? null,
      actorName: input.actorName ?? null,
      metadata: input.metadata ?? null,
      occurredAt: input.occurredAt ?? new Date(),
      isRead: false,
      isArchived: false,
      isDeleted: false,
    }));

    // Inside the caller's transaction when one is given, so a rolled-back action
    // leaves no notification behind. A failed insert is logged, never thrown:
    // MySQL keeps the transaction usable after a failed statement.
    try {
      await (manager ?? this.repo.manager).createQueryBuilder()
        .insert().into(Notification).values(rows).orIgnore().execute();
      return rows.length;
    } catch (err) {
      this.logger.error(
        `Could not create ${input.type} notifications: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
      return 0;
    }
  }

  /** Every user of the application the email went to (to and cc), except whoever sent it. */
  async fromEmail(history: EmailHistory): Promise<number> {
    const emails = emailsIn(history.toEmail, history.ccEmail);
    if (!emails.length) return 0;
    const users = await this.userRepo.find({ where: { email: In(emails), is_deleted: false } });
    const recipients = users
      .filter((u) => !history.organizationId || !u.organizationId || u.organizationId === history.organizationId)
      .filter((u) => u.id !== history.fromUserId)
      .map((u) => u.id);
    if (!recipients.length) return 0;

    const created = await this.notify({
      userIds: recipients,
      organizationId: history.organizationId,
      category: NotificationCategory.EMAIL,
      type: history.emailType,
      title: humanizeType(history.emailType),
      message: history.subject,
      link: linkFor(history.referenceType, history.referenceId),
      sourceType: NotificationSourceType.EMAIL_HISTORY,
      sourceId: String(history.id),
      referenceType: history.referenceType,
      referenceId: history.referenceId,
      trackingId: history.metadata?.trackingId ?? null,
      actorName: history.createdBy,
      metadata: { emailStatus: history.status },
      occurredAt: history.sentAt ?? history.createdAt ?? new Date(),
    });
    return created + await this.fromEmailAsItem(history, recipients);
  }

  /** Lets the module that owns a document describe it on the in-app item of its emails. */
  registerEmailDescriber(referenceTypes: string[], describer: EmailDescriber): void {
    for (const t of referenceTypes) this.describers.set(t, describer);
  }

  /**
   * The in-app item that goes with every email, of the same type: a WORKFLOW
   * item for an email about a document (SYSTEM for account / organization
   * emails), carrying the document's details. It reaches the user even when the
   * email could not be delivered. Built from the subject and the document —
   * never from the email body, so codes and passwords in it are not repeated.
   */
  private async fromEmailAsItem(history: EmailHistory, userIds: string[]): Promise<number> {
    const describer = history.referenceType ? this.describers.get(history.referenceType) : undefined;
    let described: Awaited<ReturnType<EmailDescriber>> = null;
    if (describer) {
      try {
        described = await describer(history, this.repo.manager);
      } catch (err) {
        this.logger.error(`Could not describe email ${history.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    const aboutDocument = !!history.referenceType || DOCUMENT_EMAIL.test(history.emailType);
    return this.notify({
      userIds,
      organizationId: history.organizationId,
      category: aboutDocument ? NotificationCategory.WORKFLOW : NotificationCategory.SYSTEM,
      type: history.emailType,
      title: humanizeType(history.emailType),
      message: described?.message || history.subject,
      link: linkFor(history.referenceType, history.referenceId),
      sourceType: NotificationSourceType.EMAIL_WORKFLOW,
      sourceId: String(history.id),
      referenceType: history.referenceType,
      referenceId: history.referenceId,
      trackingId: history.metadata?.trackingId ?? null,
      actorName: history.createdBy,
      metadata: {
        emailHistoryId: history.id,
        emailSubject: history.subject,
        emailStatus: history.status,
        ...(described?.metadata ?? {}),
      },
      occurredAt: history.sentAt ?? history.createdAt ?? new Date(),
    });
  }

  /** Lets the module that owns a document say who is concerned by its workflow steps. */
  registerWorkflowAudience(entityTypes: string[], resolver: WorkflowAudienceResolver): void {
    for (const t of entityTypes) this.audiences.set(t, resolver);
  }

  /** The users concerned by a workflow step, except whoever took it. */
  async fromWorkflowEvent(event: WorkflowEvent, manager?: EntityManager): Promise<number> {
    if (SILENT_ACTIONS.has(event.action)) return 0;
    const resolver = this.audiences.get(event.entityType);
    const meta = (event.metadata ?? {}) as Record<string, unknown>;
    const notifyUserIds = asList(meta.notifyUserIds);
    const notifyEmails = emailsIn(...asList(meta.notifyEmails));
    if (!resolver && !notifyUserIds.length && !notifyEmails.length) return 0;

    const em = manager ?? this.repo.manager;
    const candidates = new Set([
      ...(resolver ? await resolver(event, em) : []),
      ...notifyUserIds,
    ]);
    // Users who got an email about this same step already have its notification.
    const emailedTo = emailsIn(...asList(meta.emailedTo));
    if (notifyEmails.length || emailedTo.length) {
      const byEmail = await em.find(User, {
        where: { email: In([...notifyEmails, ...emailedTo]), is_deleted: false },
      });
      for (const u of byEmail) {
        if (u.organizationId && event.organizationId && u.organizationId !== event.organizationId) continue;
        const email = u.email?.toLowerCase();
        if (emailedTo.includes(email)) candidates.delete(u.id);
        else if (notifyEmails.includes(email)) candidates.add(u.id);
      }
    }
    const userIds = [...candidates].filter((id) => id && id !== event.actorId);
    if (!userIds.length) return 0;

    const doc = DOCUMENT_LABELS[event.entityType] ?? humanizeType(event.entityType);
    const phrase = ACTION_PHRASES[event.action] ?? humanizeType(event.action).toLowerCase();
    const ref = event.entityReference ? `${doc} ${event.entityReference}` : doc;
    const by = event.actorName || event.actorEmail;
    const statusPart = event.toStatus && event.fromStatus !== event.toStatus
      ? ` · ${event.fromStatus ? `${statusText(event.fromStatus)} → ` : ''}${statusText(event.toStatus)}`
      : '';
    const title = event.action === 'STATUS_CHANGED' && event.toStatus
      ? `${doc} ${statusText(event.toStatus)}`
      : `${doc} ${phrase.charAt(0).toUpperCase()}${phrase.slice(1)}`;

    return this.notify({
      userIds,
      organizationId: event.organizationId,
      category: NotificationCategory.WORKFLOW,
      type: event.action,
      title,
      message: `${ref} was ${phrase}${by ? ` by ${by}` : ''}${statusPart}`,
      severity: severityFor(event.action === 'STATUS_CHANGED' ? event.toStatus ?? '' : event.action),
      link: linkFor(event.entityType, event.entityId),
      sourceType: NotificationSourceType.WORKFLOW_EVENT,
      sourceId: event.id,
      referenceType: event.entityType,
      referenceId: event.entityId,
      trackingId: event.trackingId,
      actorName: by ?? null,
      metadata: {
        fromStatus: event.fromStatus, toStatus: event.toStatus, round: event.round, comments: event.comments,
      },
      occurredAt: event.createdAt ?? new Date(),
    }, manager);
  }

  /**
   * Creates the notifications for emails and workflow steps recorded before
   * notifications existed (or missed). Safe to run again: duplicates are ignored.
   */
  async backfill(organizationId: string | null): Promise<{ emails: number; workflow: number }> {
    let emails = 0;
    let workflow = 0;
    const batch = 500;

    for (let skip = 0; ; skip += batch) {
      const rows = await this.emailRepo.find({
        where: organizationId ? { organizationId } : {},
        order: { id: 'ASC' }, skip, take: batch,
      });
      for (const h of rows) emails += await this.fromEmail(h);
      if (rows.length < batch) break;
    }
    for (let skip = 0; ; skip += batch) {
      const rows = await this.eventRepo.find({
        where: organizationId ? { organizationId } : {},
        order: { createdAt: 'ASC' }, skip, take: batch,
      });
      for (const e of rows) workflow += await this.fromWorkflowEvent(e).catch(() => 0);
      if (rows.length < batch) break;
    }
    return { emails, workflow };
  }

  // ── Reading (always scoped to the signed-in user) ───────────────

  async list(userId: string, query: NotificationQueryDto): Promise<NotificationListDto> {
    const { page = 1, limit = 20, unreadOnly, archived, category, search } = query;
    const qb = this.repo.createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .andWhere('n.isDeleted = :deleted', { deleted: false })
      .andWhere('n.isArchived = :archived', { archived: !!archived });

    if (unreadOnly) qb.andWhere('n.isRead = :unread', { unread: false });
    if (category) qb.andWhere('n.category = :category', { category });
    const term = search?.trim();
    if (term) {
      const like = `%${term.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
      // Anything shown on the notification: title, message, who, type, tracking id.
      qb.andWhere(new Brackets((b) => b
        .where('LOWER(n.title) LIKE :like', { like })
        .orWhere('LOWER(n.message) LIKE :like', { like })
        .orWhere('LOWER(n.actorName) LIKE :like', { like })
        .orWhere('LOWER(n.type) LIKE :like', { like })
        .orWhere('LOWER(n.trackingId) LIKE :like', { like })));
    }

    const [rows, total] = await qb
      .orderBy('n.occurredAt', 'DESC')
      .addOrderBy('n.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: rows.map((r) => this.toResponse(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount: await this.unreadCount(userId),
    };
  }

  unreadCount(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, isRead: false, isArchived: false, isDeleted: false } });
  }

  /** One notification with the email it came from, if it came from one. */
  async detail(userId: string, id: string): Promise<NotificationDetailDto> {
    const n = await this.own(userId, id);
    let email: EmailHistory | null = null;
    if (n.sourceType === NotificationSourceType.EMAIL_HISTORY) {
      email = await this.emailRepo.findOne({ where: { id: Number(n.sourceId) as any } });
    }
    return {
      ...this.toResponse(n),
      emailHtml: email?.htmlContent ?? null,
      emailSubject: email?.subject ?? null,
      emailFrom: email?.fromEmail ?? null,
      emailTo: email?.toEmail ?? null,
      emailCc: email?.ccEmail ?? null,
      emailStatus: email?.status ?? null,
    };
  }

  async setRead(userId: string, id: string, read: boolean): Promise<NotificationResponseDto> {
    const n = await this.own(userId, id);
    n.isRead = read;
    n.readAt = read ? n.readAt ?? new Date() : null;
    await this.repo.save(n);
    return this.toResponse(n);
  }

  async markAllRead(userId: string): Promise<number> {
    const res = await this.repo.update(
      { userId, isRead: false, isDeleted: false },
      { isRead: true, readAt: new Date() },
    );
    return res.affected ?? 0;
  }

  async setArchived(userId: string, id: string, archived: boolean): Promise<NotificationResponseDto> {
    const n = await this.own(userId, id);
    n.isArchived = archived;
    await this.repo.save(n);
    return this.toResponse(n);
  }

  async remove(userId: string, id: string): Promise<void> {
    const n = await this.own(userId, id);
    n.isDeleted = true;
    await this.repo.save(n);
  }

  private async own(userId: string, id: string): Promise<Notification> {
    // Someone else's notification is reported as not found, not forbidden.
    const n = await this.repo.findOne({ where: { id, userId, isDeleted: false } });
    if (!n) throw new NotFoundException('Notification not found');
    return n;
  }

  private toResponse(n: Notification): NotificationResponseDto {
    return {
      id: String(n.id),
      category: n.category,
      type: n.type,
      title: n.title,
      message: n.message,
      severity: n.severity,
      link: n.link,
      sourceType: n.sourceType,
      referenceType: n.referenceType,
      referenceId: n.referenceId,
      trackingId: n.trackingId,
      actorName: n.actorName,
      metadata: n.metadata,
      occurredAt: n.occurredAt,
      isRead: !!n.isRead,
      readAt: n.readAt,
      isArchived: !!n.isArchived,
    };
  }
}
