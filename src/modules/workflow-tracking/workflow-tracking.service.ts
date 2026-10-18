import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { createHmac, randomBytes } from 'crypto';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { NotificationService } from '../notification/notification.service';
import { WorkflowEvent } from './entities/workflow-event.entity';
import {
  TRACKING_ID_PREFIX, WorkflowAction, WorkflowEntityType,
} from './enums/workflow-tracking.enums';
import {
  WorkflowDocumentDto, WorkflowEventResponseDto, WorkflowTimelineDto,
} from './dto/workflow-event-response.dto';

/** Who did something, as recorded on the timeline. */
export interface WorkflowActor {
  userId?: string | null;
  name?: string | null;
  email?: string | null;
}

export interface RecordWorkflowEvent {
  organizationId: string;
  trackingId: string;
  entityType: WorkflowEntityType;
  entityId: string;
  entityReference?: string | null;
  action: WorkflowAction;
  fromStatus?: string | null;
  toStatus?: string | null;
  round?: number | null;
  actor?: WorkflowActor | null;
  comments?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** A record that carries its own trackingId column (master data, requisitions). */
export interface TrackedRecord {
  id: string;
  organizationId: string;
  trackingId?: string | null;
}

/**
 * Who hears about a step beyond the audience the owning module registered
 * (NotificationService.registerWorkflowAudience). Put in the step's metadata.
 */
export interface WorkflowNotifyHints {
  /** Extra recipients, by user id. */
  notifyUserIds?: string[];
  /** Extra recipients, by email (users of the same organization). */
  notifyEmails?: string[];
  /**
   * Users who were sent an email about this same step: they get the email's
   * notification, so the workflow one is not repeated for them.
   */
  emailedTo?: string[];
}

/**
 * The tracking id that ties a material requisition to every document raised
 * from it (review, approval, RFQ, RFQ approval, purchase order, …), and the
 * append-only timeline of what happened to each.
 *
 * A downstream module never generates its own id: it copies the trackingId of
 * the document it was raised from and records its steps here.
 */
@Injectable()
export class WorkflowTrackingService {
  constructor(
    @InjectRepository(WorkflowEvent) private readonly eventRepo: Repository<WorkflowEvent>,
    private readonly logger: CustomLoggerService,
    // Each step is announced to the users concerned by the document.
    @Optional() private readonly notifications?: NotificationService,
  ) {}

  /**
   * A new tracking id: an HMAC-SHA256, keyed with the server secret, of 32
   * random bytes plus the organization and the time — so it cannot be guessed
   * or enumerated from another id — shown as TRK-XXXXXXXX-XXXXXXXX-XXXXXXXX
   * (exactly 30 characters, the column width).
   *
   * Uniqueness per organization is also enforced by the database
   * (UQ_mr_org_tracking); with 96 bits of the digest a clash is not a practical
   * concern.
   */
  generateTrackingId(organizationId: string): string {
    const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'pm-workflow-tracking';
    const digest = createHmac('sha256', secret)
      .update(`${organizationId}:${Date.now()}:${randomBytes(32).toString('hex')}`)
      .digest('hex')
      .slice(0, 24)
      .toUpperCase();
    return `${TRACKING_ID_PREFIX}-${digest.slice(0, 8)}-${digest.slice(8, 16)}-${digest.slice(16, 24)}`;
  }

  /**
   * Records a step of a record that keeps its own trackingId column (materials,
   * vendors, …): assigns the record a tracking id first when it has none, then
   * records the step — which notifies the users concerned.
   *
   * With a manager the id and the step are part of the caller's transaction and
   * errors propagate; without one a failure is logged, never thrown.
   */
  async track(
    target: EntityTarget<ObjectLiteral>,
    record: TrackedRecord,
    event: Omit<RecordWorkflowEvent, 'organizationId' | 'trackingId' | 'entityId'>,
    manager?: EntityManager,
  ): Promise<void> {
    const run = async () => {
      if (!record.trackingId) {
        const trackingId = this.generateTrackingId(record.organizationId);
        await (manager ?? this.eventRepo.manager).update(target, { id: record.id }, { trackingId });
        record.trackingId = trackingId;
      }
      await this.record({
        ...event,
        organizationId: record.organizationId,
        trackingId: record.trackingId,
        entityId: record.id,
      }, manager);
    };
    if (manager) return run();
    try {
      await run();
    } catch (err) {
      this.logger.error(
        `Failed to track ${event.action} for ${event.entityType} ${record.id}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  /**
   * Stamps a tracking id onto steps of a document that were recorded without
   * one (documents that predate tracking ids).
   */
  async backfill(
    manager: EntityManager,
    organizationId: string,
    entityId: string,
    trackingId: string,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(WorkflowEvent)
      .set({ trackingId })
      .where('organizationId = :organizationId', { organizationId })
      .andWhere('entityId = :entityId', { entityId })
      .andWhere("(trackingId IS NULL OR trackingId = '')")
      .execute();
  }

  /**
   * Appends one step. Pass the transaction's manager to make the step part of
   * the change it describes; without one it is written on its own and a failure
   * is logged rather than thrown, so the timeline never blocks the business.
   */
  async record(event: RecordWorkflowEvent, manager?: EntityManager): Promise<void> {
    if (!event.trackingId) {
      // Every caller assigns one first (see ensureTrackingId); a missing id is a bug, not data.
      throw new Error(`Workflow event ${event.action} for ${event.entityType} ${event.entityId} has no tracking id`);
    }
    const row = {
      organizationId: event.organizationId,
      trackingId: event.trackingId,
      entityType: event.entityType,
      entityId: event.entityId,
      entityReference: event.entityReference ?? null,
      action: event.action,
      fromStatus: event.fromStatus ?? null,
      toStatus: event.toStatus ?? null,
      round: event.round ?? null,
      actorId: event.actor?.userId ?? null,
      actorName: event.actor?.name ?? null,
      actorEmail: event.actor?.email ?? null,
      comments: event.comments?.trim() || null,
      metadata: event.metadata ?? null,
    };

    if (manager) {
      const saved = await manager.save(WorkflowEvent, manager.create(WorkflowEvent, row));
      await this.notifications?.fromWorkflowEvent(saved, manager);
      return;
    }
    try {
      const saved = await this.eventRepo.save(this.eventRepo.create(row));
      await this.notifications?.fromWorkflowEvent(saved);
    } catch (err) {
      this.logger.error(
        `Failed to record workflow event ${event.action} for ${event.trackingId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  /** Steps recorded for one document, oldest first. */
  async eventsFor(
    organizationId: string,
    entityType: WorkflowEntityType | WorkflowEntityType[],
    entityId: string,
  ): Promise<WorkflowEventResponseDto[]> {
    const types = Array.isArray(entityType) ? entityType : [entityType];
    const rows = await this.eventRepo
      .createQueryBuilder('e')
      .where('e.organizationId = :organizationId', { organizationId })
      .andWhere('e.entityId = :entityId', { entityId })
      .andWhere('e.entityType IN (:...types)', { types })
      .orderBy('e.createdAt', 'ASC')
      .getMany();
    return rows.map((r) => this.toResponse(r));
  }

  /** The whole workflow behind a tracking id: its documents and every step. */
  async getTimeline(organizationId: string, trackingId: string): Promise<WorkflowTimelineDto> {
    const rows = await this.eventRepo.find({
      where: { organizationId, trackingId },
      order: { createdAt: 'ASC' },
    });
    if (rows.length === 0) throw new NotFoundException(`No workflow found for tracking id ${trackingId}`);

    const documents = new Map<string, WorkflowDocumentDto>();
    for (const r of rows) {
      // Review and approval steps belong to the requisition document itself.
      const key = `${r.entityType}:${r.entityId}`;
      const doc = documents.get(key);
      if (!doc) {
        documents.set(key, {
          entityType: r.entityType,
          entityId: r.entityId,
          entityReference: r.entityReference,
          status: r.toStatus,
          firstSeenAt: r.createdAt,
          lastUpdatedAt: r.createdAt,
        });
      } else {
        doc.lastUpdatedAt = r.createdAt;
        if (r.toStatus) doc.status = r.toStatus;
        if (r.entityReference) doc.entityReference = r.entityReference;
      }
    }

    return {
      trackingId,
      documents: [...documents.values()],
      events: rows.map((r) => this.toResponse(r)),
    };
  }

  private toResponse(r: WorkflowEvent): WorkflowEventResponseDto {
    return {
      id: r.id,
      trackingId: r.trackingId,
      entityType: r.entityType,
      entityId: r.entityId,
      entityReference: r.entityReference,
      action: r.action,
      fromStatus: r.fromStatus,
      toStatus: r.toStatus,
      round: r.round,
      actorId: r.actorId,
      actorName: r.actorName,
      actorEmail: r.actorEmail,
      comments: r.comments,
      metadata: r.metadata,
      createdAt: r.createdAt,
    };
  }
}
