import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { User } from '../user/entity/user.entity';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { WorkflowTrackingService } from '../workflow-tracking/workflow-tracking.service';
import { WorkflowAction, WorkflowEntityType } from '../workflow-tracking/enums/workflow-tracking.enums';
import { MaterialRequisition } from './entities/material-requisition.entity';
import { MaterialRequisitionParticipant } from './entities/material-requisition-participant.entity';
import {
  APPROVAL_DECISIONS, APPROVER_EDITABLE_STATUSES, DECISION_STATUS, MaterialRequisitionStatus,
  REVIEWER_EDITABLE_STATUSES, REVIEW_DECISIONS, RequisitionDecision, RequisitionParticipantRole,
  SUBMITTABLE_REQUISITION_STATUSES,
} from './enums/material-requisition.enums';
import {
  ApproveRequisitionDto, ReviewRequisitionDto, UpdateRequisitionParticipantsDto,
} from './dto/requisition-decision.dto';
import {
  RequisitionPermissionsDto, RequisitionUserOptionDto,
} from './dto/material-requisition-response.dto';
import { MaterialRequisitionNotificationService } from './material-requisition-notification.service';
import { RequisitionMailComment } from 'src/shared/email/templates/material-requisition-review-template';

/** The signed-in user, as the requisition workflow needs them. */
export interface RequisitionActor {
  userId: string;
  email: string;
  name: string;
  role: string;
}

/** Roles that can raise and edit any requisition of the organization. */
export const REQUISITION_WRITER_ROLES = ['OrganizationAdmin', 'SuperAdmin', 'Manager', 'ProjectManager'];

/** Roles that can read any requisition of the organization. */
export const REQUISITION_READER_ROLES = [
  'OrganizationAdmin', 'SuperAdmin', 'Manager', 'ProjectManager',
  'DepartmentManager', 'DisciplineLead', 'ProcurementManager', 'WarehouseManager',
];

/** Every internal role — reviewers and approvers can hold any of them. */
export const REQUISITION_INTERNAL_ROLES = [...REQUISITION_READER_ROLES, 'InternalUser', 'QAManager', 'User'];

const EXTERNAL_ROLE = 'ExternalUser';

/** What a reviewer / approver change did, for the timeline and the emails. */
export interface ParticipantChange {
  changed: boolean;
  reviewersChanged: boolean;
  approversChanged: boolean;
  addedReviewerIds: string[];
  addedApproverIds: string[];
}

const NO_CHANGE: ParticipantChange = {
  changed: false, reviewersChanged: false, approversChanged: false, addedReviewerIds: [], addedApproverIds: [],
};

/** Status a reviewer / approver change completed the round to, if it did. */
export type SettledStatus = MaterialRequisitionStatus.REVIEWED | MaterialRequisitionStatus.APPROVED | null;

const ROLE_LABEL: Record<RequisitionParticipantRole, string> = {
  [RequisitionParticipantRole.REVIEWER]: 'reviewer',
  [RequisitionParticipantRole.APPROVER]: 'approver',
};

const DECISION_ACTION: Record<RequisitionDecision, WorkflowAction> = {
  [RequisitionDecision.REVIEWED]:  WorkflowAction.REVIEWED,
  [RequisitionDecision.APPROVED]:  WorkflowAction.APPROVED,
  [RequisitionDecision.RETURNED]:  WorkflowAction.RETURNED,
  [RequisitionDecision.REJECTED]:  WorkflowAction.REJECTED,
  [RequisitionDecision.CANCELLED]: WorkflowAction.CANCELLED,
};

const DECISION_VERB: Record<RequisitionDecision, string> = {
  [RequisitionDecision.REVIEWED]:  'reviewed',
  [RequisitionDecision.APPROVED]:  'approved',
  [RequisitionDecision.RETURNED]:  'returned',
  [RequisitionDecision.REJECTED]:  'rejected',
  [RequisitionDecision.CANCELLED]: 'cancelled',
};

/**
 * Review and approval of material requisitions.
 *
 * Each (re)submission starts a review ROUND. Within a round, the first
 * decision from any one assigned reviewer — or, once reviewed, any one assigned
 * approver — settles it:
 *  - Reviewed  → REVIEWED (the approvers are asked; other reviewers need not act);
 *  - Approved  → APPROVED (other approvers need not act);
 *  - Return, Reject or Cancel → RETURNED / REJECTED / CANCELLED
 *    (RETURNED goes back to the requester to edit and resubmit).
 *
 * Every step is written to the workflow timeline under the requisition's
 * trackingId, so past rounds stay visible after decisions are reset.
 */
@Injectable()
export class MaterialRequisitionWorkflowService {
  constructor(
    @InjectRepository(MaterialRequisition)            private readonly mrRepo: Repository<MaterialRequisition>,
    @InjectRepository(MaterialRequisitionParticipant) private readonly participantRepo: Repository<MaterialRequisitionParticipant>,
    @InjectRepository(User)                           private readonly userRepo: Repository<User>,
    private readonly tracking: WorkflowTrackingService,
    private readonly notifier: MaterialRequisitionNotificationService,
    private readonly logger: CustomLoggerService,
  ) {}

  // ── Who can be assigned ──────────────────────────────────────────

  /** Active internal users of the organization, for the reviewer / approver pickers. */
  async userOptions(organizationId: string): Promise<RequisitionUserOptionDto[]> {
    const users = await this.userRepo.find({
      where: { organizationId, is_internal: 1, is_active: 1, is_deleted: false },
      relations: { role: true },
      order: { first_name: 'ASC', last_name: 'ASC' },
    });
    return users
      .filter((u) => u.role?.name !== EXTERNAL_ROLE)
      .map((u) => ({
        id: u.id,
        name: this.userName(u),
        email: u.email,
        position: u.position || null,
        role: u.role?.name ?? null,
      }));
  }

  /**
   * Sets the reviewers and / or approvers (whichever list is given) to the
   * given internal users, in the given order.
   *
   * Reviewers can change until the requisition is reviewed, approvers until it
   * is approved — and only by its requester (or a requisition writer). People
   * who stay keep the decision they already recorded this round; new people
   * start pending. Once submitted, each role must keep at least one person.
   */
  async replaceParticipants(
    manager: EntityManager,
    mr: MaterialRequisition,
    reviewerIds: string[] | undefined,
    approverIds: string[] | undefined,
    actor: RequisitionActor,
  ): Promise<ParticipantChange> {
    if (reviewerIds === undefined && approverIds === undefined) return NO_CHANGE;

    const existing = await manager.find(MaterialRequisitionParticipant, { where: { requisitionId: mr.id } });
    const rows = (role: RequisitionParticipantRole) =>
      existing.filter((p) => p.role === role).sort((a, b) => a.sequence - b.sequence);
    const ids = (role: RequisitionParticipantRole) => rows(role).map((p) => p.userId);
    const same = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

    const reviewersChanged = reviewerIds !== undefined && !same(reviewerIds, ids(RequisitionParticipantRole.REVIEWER));
    const approversChanged = approverIds !== undefined && !same(approverIds, ids(RequisitionParticipantRole.APPROVER));
    if (!reviewersChanged && !approversChanged) return NO_CHANGE;

    if (!this.canManage(mr, actor)) {
      throw new ForbiddenException('Only the requester can change the reviewers and approvers');
    }
    if (mr.lockedAt) {
      throw new ConflictException('This requisition is locked: a purchase order has been raised against it');
    }
    if (reviewersChanged && !REVIEWER_EDITABLE_STATUSES.includes(mr.status)) {
      throw new ConflictException('The reviewers are locked once the requisition has been reviewed');
    }
    if (approversChanged && !APPROVER_EDITABLE_STATUSES.includes(mr.status)) {
      throw new ConflictException('The approvers are locked once the requisition has been approved');
    }

    const reviewers = reviewersChanged ? reviewerIds! : ids(RequisitionParticipantRole.REVIEWER);
    const approvers = approversChanged ? approverIds! : ids(RequisitionParticipantRole.APPROVER);

    if (mr.status !== MaterialRequisitionStatus.DRAFT) {
      if (!reviewers.length) throw new BadRequestException('A submitted requisition needs at least one reviewer');
      if (!approvers.length) throw new BadRequestException('A submitted requisition needs at least one approver');
    }

    // Only people being added are checked: someone already assigned who has
    // since been deactivated does not block other changes.
    const known = new Set(existing.map((p) => p.userId));
    const added = [...new Set([...reviewers, ...approvers])].filter((id) => !known.has(id));
    const users = await this.assertInternalUsers(mr.organizationId, added);
    const nameOf = (id: string) => existing.find((p) => p.userId === id)?.userName
      ?? (users.get(id) ? this.userName(users.get(id)!) : id);

    const both = reviewers.filter((id) => approvers.includes(id));
    if (both.length) {
      throw new BadRequestException(
        `${both.map(nameOf).join(', ')} cannot be both a reviewer and an approver of the same requisition`,
      );
    }

    const write = async (role: RequisitionParticipantRole, wanted: string[]): Promise<string[]> => {
      const current = rows(role);
      const removed = current.filter((p) => !wanted.includes(p.userId));
      if (removed.length) await manager.delete(MaterialRequisitionParticipant, removed.map((p) => p.id));
      const newIds: string[] = [];
      for (const [index, id] of wanted.entries()) {
        const keep = current.find((p) => p.userId === id);
        if (keep) {
          if (keep.sequence !== index + 1) {
            await manager.update(MaterialRequisitionParticipant, { id: keep.id }, { sequence: index + 1 });
          }
          continue;
        }
        // Moving between roles: the old row goes, a pending one is created.
        const moved = existing.find((p) => p.userId === id && p.role !== role);
        if (moved) await manager.delete(MaterialRequisitionParticipant, { id: moved.id });
        const u = users.get(id);
        await manager.save(MaterialRequisitionParticipant, manager.create(MaterialRequisitionParticipant, {
          organizationId: mr.organizationId,
          requisitionId: mr.id,
          role,
          userId: id,
          userName: u ? this.userName(u) : moved?.userName ?? id,
          userEmail: u?.email ?? moved?.userEmail ?? '',
          sequence: index + 1,
          assignedBy: actor.email,
        }));
        newIds.push(id);
      }
      return newIds;
    };

    const addedReviewerIds = reviewersChanged ? await write(RequisitionParticipantRole.REVIEWER, reviewers) : [];
    const addedApproverIds = approversChanged ? await write(RequisitionParticipantRole.APPROVER, approvers) : [];

    // Drafts change freely; once submitted, every change is part of the record.
    if (mr.status !== MaterialRequisitionStatus.DRAFT) {
      await this.ensureTrackingId(manager, mr);
      await this.tracking.record({
        organizationId: mr.organizationId,
        trackingId: mr.trackingId,
        entityType: WorkflowEntityType.MATERIAL_REQUISITION,
        entityId: mr.id,
        entityReference: mr.mrNumber,
        action: WorkflowAction.UPDATED,
        fromStatus: mr.status,
        toStatus: mr.status,
        round: mr.reviewRound,
        actor: this.trackingActor(actor),
        comments: [
          reviewersChanged ? `Reviewers: ${reviewers.map(nameOf).join(', ')}` : null,
          approversChanged ? `Approvers: ${approvers.map(nameOf).join(', ')}` : null,
        ].filter(Boolean).join(' · '),
        metadata: { reviewerIds: reviewers, approverIds: approvers },
      }, manager);
    }

    return { changed: true, reviewersChanged, approversChanged, addedReviewerIds, addedApproverIds };
  }

  /**
   * After reviewers or approvers change mid-round: if someone still assigned
   * has already decided positively (say the only pending reviewer was removed),
   * the round completes now. The caller saves the requisition.
   */
  async settleRound(manager: EntityManager, mr: MaterialRequisition, actor: RequisitionActor): Promise<SettledStatus> {
    const target = mr.status === MaterialRequisitionStatus.UNDER_REVIEW
      ? { role: RequisitionParticipantRole.REVIEWER, decision: RequisitionDecision.REVIEWED }
      : mr.status === MaterialRequisitionStatus.REVIEWED
        ? { role: RequisitionParticipantRole.APPROVER, decision: RequisitionDecision.APPROVED }
        : null;
    if (!target) return null;

    const rows = await manager.find(MaterialRequisitionParticipant, {
      where: { requisitionId: mr.id, role: target.role },
    });
    // One positive decision is enough (normally it settles the round as it is made).
    if (!rows.some((p) => p.decision === target.decision)) return null;

    const fromStatus = mr.status;
    mr.status = DECISION_STATUS[target.decision];
    if (mr.status === MaterialRequisitionStatus.REVIEWED) mr.reviewedAt = new Date();
    if (mr.status === MaterialRequisitionStatus.APPROVED) mr.approvedAt = new Date();
    await this.ensureTrackingId(manager, mr);
    await this.tracking.record({
      organizationId: mr.organizationId,
      trackingId: mr.trackingId,
      entityType: WorkflowEntityType.MATERIAL_REQUISITION,
      entityId: mr.id,
      entityReference: mr.mrNumber,
      action: mr.status === MaterialRequisitionStatus.REVIEWED
        ? WorkflowAction.REVIEW_COMPLETED
        : WorkflowAction.APPROVAL_COMPLETED,
      fromStatus,
      toStatus: mr.status,
      round: mr.reviewRound,
      actor: this.trackingActor(actor),
      comments: 'Completed after the assignment changed',
    }, manager);
    return mr.status as SettledStatus;
  }

  /**
   * PUT /material-requisitions/:id/participants — change the reviewers and / or
   * approvers outside the edit screen (e.g. from the list).
   */
  async updateParticipants(
    organizationId: string,
    id: string,
    actor: RequisitionActor,
    dto: UpdateRequisitionParticipantsDto,
  ): Promise<void> {
    let change = NO_CHANGE;
    let settled: SettledStatus = null;

    await this.mrRepo.manager.transaction(async (manager) => {
      const mr = await manager.findOne(MaterialRequisition, {
        where: { id, organizationId, isDeleted: false },
        lock: { mode: 'pessimistic_write' },
      });
      if (!mr) throw new NotFoundException('Material requisition not found');

      change = await this.replaceParticipants(manager, mr, dto.reviewerIds, dto.approverIds, actor);
      if (!change.changed) return;
      settled = await this.settleRound(manager, mr, actor);
      mr.updatedBy = actor.email;
      await manager.save(MaterialRequisition, mr);
    });

    this.notifyParticipantChange(organizationId, id, change, settled);
  }

  /**
   * After a reviewer / approver change commits: people added to a live round
   * are asked for their decision, and a round the change completed moves on.
   */
  notifyParticipantChange(
    organizationId: string,
    id: string,
    change: ParticipantChange,
    settled: SettledStatus,
  ): void {
    if (!change.changed) return;
    void this.afterCommit(organizationId, id, async (mr) => {
      if (settled === MaterialRequisitionStatus.REVIEWED) {
        await this.notifier.approvalRequested(mr);
        return;
      }
      if (settled === MaterialRequisitionStatus.APPROVED) {
        const last = [...mr.participants]
          .filter((p) => p.role === RequisitionParticipantRole.APPROVER && p.decidedAt)
          .sort((a, b) => +new Date(b.decidedAt!) - +new Date(a.decidedAt!))[0];
        if (last) await this.notifier.approvalEnded(mr, last);
        return;
      }
      if (mr.status === MaterialRequisitionStatus.UNDER_REVIEW && change.addedReviewerIds.length) {
        await this.notifier.reviewRequested(mr, false, [], change.addedReviewerIds);
      }
      if (mr.status === MaterialRequisitionStatus.REVIEWED && change.addedApproverIds.length) {
        await this.notifier.approvalRequested(mr, change.addedApproverIds);
      }
    });
  }

  /**
   * Gives a requisition a tracking id if it has none (one created before
   * tracking ids existed) and stamps it on any of its steps recorded without
   * one. Call before recording a step.
   */
  async ensureTrackingId(manager: EntityManager, mr: MaterialRequisition): Promise<string> {
    if (mr.trackingId) return mr.trackingId;
    mr.trackingId = this.tracking.generateTrackingId(mr.organizationId);
    await manager.update(MaterialRequisition, { id: mr.id }, { trackingId: mr.trackingId });
    await this.tracking.backfill(manager, mr.organizationId, mr.id, mr.trackingId);
    return mr.trackingId;
  }

  // ── Submission ───────────────────────────────────────────────────

  async assertReadyToSubmit(manager: EntityManager, mrId: string): Promise<void> {
    const rows = await manager.find(MaterialRequisitionParticipant, { where: { requisitionId: mrId } });
    const missing: string[] = [];
    if (!rows.some((p) => p.role === RequisitionParticipantRole.REVIEWER)) missing.push('at least one reviewer');
    if (!rows.some((p) => p.role === RequisitionParticipantRole.APPROVER)) missing.push('at least one approver');
    if (missing.length) {
      throw new BadRequestException(`Assign ${missing.join(' and ')} before submitting the requisition`);
    }
  }

  /**
   * Starts a review round: UNDER_REVIEW, round + 1, every decision cleared.
   * The caller saves the requisition in the same transaction.
   */
  async startRound(
    manager: EntityManager,
    mr: MaterialRequisition,
    actor: RequisitionActor,
  ): Promise<{ resubmitted: boolean }> {
    if (!SUBMITTABLE_REQUISITION_STATUSES.includes(mr.status)) {
      throw new ConflictException(`A requisition that is ${mr.status} cannot be submitted`);
    }
    await this.assertReadyToSubmit(manager, mr.id);

    await this.ensureTrackingId(manager, mr);
    const fromStatus = mr.status;
    const resubmitted = fromStatus === MaterialRequisitionStatus.RETURNED;
    mr.reviewRound = Number(mr.reviewRound ?? 0) + 1;
    mr.status = MaterialRequisitionStatus.UNDER_REVIEW;
    mr.submittedBy = actor.email;
    mr.submittedAt = new Date();
    mr.reviewedAt = null;
    mr.approvedAt = null;

    await manager.update(
      MaterialRequisitionParticipant,
      { requisitionId: mr.id },
      { decision: null, decisionComments: null, decidedAt: null, editedInRound: false },
    );

    await this.tracking.record({
      organizationId: mr.organizationId,
      trackingId: mr.trackingId,
      entityType: WorkflowEntityType.MATERIAL_REQUISITION,
      entityId: mr.id,
      entityReference: mr.mrNumber,
      action: resubmitted ? WorkflowAction.RESUBMITTED : WorkflowAction.SUBMITTED,
      fromStatus,
      toStatus: MaterialRequisitionStatus.UNDER_REVIEW,
      round: mr.reviewRound,
      actor: this.trackingActor(actor),
    }, manager);

    return { resubmitted };
  }

  /** After the submission commits: every reviewer is emailed. */
  notifySubmitted(organizationId: string, id: string, resubmitted: boolean): void {
    void this.afterCommit(organizationId, id, async (mr) => {
      const returnComments = resubmitted ? await this.lastReturnComments(mr) : [];
      await this.notifier.reviewRequested(mr, resubmitted, returnComments);
    });
  }

  /** A reviewer changed the requisition: their decision must then explain it. */
  async markReviewerEdit(manager: EntityManager, mr: MaterialRequisition, actor: RequisitionActor): Promise<void> {
    if (mr.status !== MaterialRequisitionStatus.UNDER_REVIEW) return;
    const me = await manager.findOne(MaterialRequisitionParticipant, {
      where: { requisitionId: mr.id, role: RequisitionParticipantRole.REVIEWER, userId: actor.userId },
    });
    if (!me || me.decision) return;
    if (!me.editedInRound) {
      me.editedInRound = true;
      await manager.save(MaterialRequisitionParticipant, me);
    }
    await this.ensureTrackingId(manager, mr);
    await this.tracking.record({
      organizationId: mr.organizationId,
      trackingId: mr.trackingId,
      entityType: WorkflowEntityType.MR_REVIEW,
      entityId: mr.id,
      entityReference: mr.mrNumber,
      action: WorkflowAction.EDITED_IN_REVIEW,
      round: mr.reviewRound,
      actor: this.trackingActor(actor),
    }, manager);
  }

  // ── Decisions ────────────────────────────────────────────────────

  review(organizationId: string, id: string, actor: RequisitionActor, dto: ReviewRequisitionDto): Promise<void> {
    return this.decide(organizationId, id, actor, dto.decision, dto.comments, RequisitionParticipantRole.REVIEWER);
  }

  approve(organizationId: string, id: string, actor: RequisitionActor, dto: ApproveRequisitionDto): Promise<void> {
    return this.decide(organizationId, id, actor, dto.decision, dto.comments, RequisitionParticipantRole.APPROVER);
  }

  private async decide(
    organizationId: string,
    id: string,
    actor: RequisitionActor,
    decision: RequisitionDecision,
    rawComments: string | undefined,
    role: RequisitionParticipantRole,
  ): Promise<void> {
    const reviewing = role === RequisitionParticipantRole.REVIEWER;
    const allowed = reviewing ? REVIEW_DECISIONS : APPROVAL_DECISIONS;
    if (!allowed.includes(decision)) {
      throw new BadRequestException(`A ${ROLE_LABEL[role]} cannot record "${decision}"`);
    }
    const expected = reviewing ? MaterialRequisitionStatus.UNDER_REVIEW : MaterialRequisitionStatus.REVIEWED;
    const positive = decision === RequisitionDecision.REVIEWED || decision === RequisitionDecision.APPROVED;
    const comments = rawComments?.trim() || null;

    let ended = false;
    let decided: MaterialRequisitionParticipant | null = null;

    await this.mrRepo.manager.transaction(async (manager) => {
      const mr = await manager.findOne(MaterialRequisition, {
        where: { id, organizationId, isDeleted: false },
        lock: { mode: 'pessimistic_write' },
      });
      if (!mr) throw new NotFoundException('Material requisition not found');
      if (mr.lockedAt) throw new ConflictException('This requisition is locked: a purchase order has been raised against it');
      if (mr.status !== expected) {
        throw new ConflictException(
          `This requisition is ${mr.status.replace('_', ' ').toLowerCase()} — it is not waiting for ${reviewing ? 'review' : 'approval'}`,
        );
      }

      await this.ensureTrackingId(manager, mr);
      const participants = await manager.find(MaterialRequisitionParticipant, {
        where: { requisitionId: id, role },
      });
      const me = participants.find((p) => p.userId === actor.userId);
      if (!me) throw new ForbiddenException(`You are not ${reviewing ? 'a reviewer' : 'an approver'} of this requisition`);
      if (me.decision) throw new ConflictException('You have already recorded your decision for this round');

      if (!positive && !comments) {
        throw new BadRequestException(
          `Add a comment explaining why the requisition is ${DECISION_VERB[decision]}`,
        );
      }
      if (reviewing && me.editedInRound && !comments) {
        throw new BadRequestException('You edited this requisition — describe your changes in the comments');
      }

      me.decision = decision;
      me.decisionComments = comments;
      me.decidedAt = new Date();
      await manager.save(MaterialRequisitionParticipant, me);
      decided = me;

      const fromStatus = mr.status;
      // One reviewer (approver) is enough: their decision settles the round.
      ended = true;
      if (ended) {
        mr.status = DECISION_STATUS[decision];
        if (decision === RequisitionDecision.REVIEWED) mr.reviewedAt = new Date();
        if (decision === RequisitionDecision.APPROVED) mr.approvedAt = new Date();
      }
      mr.updatedBy = actor.email;
      await manager.save(MaterialRequisition, mr);

      const base = {
        organizationId,
        trackingId: mr.trackingId,
        entityId: mr.id,
        entityReference: mr.mrNumber,
        round: mr.reviewRound,
        actor: this.trackingActor(actor),
      };
      await this.tracking.record({
        ...base,
        entityType: reviewing ? WorkflowEntityType.MR_REVIEW : WorkflowEntityType.MR_APPROVAL,
        action: DECISION_ACTION[decision],
        fromStatus,
        toStatus: mr.status,
        comments,
        metadata: { edited: me.editedInRound },
      }, manager);
      if (ended && positive) {
        await this.tracking.record({
          ...base,
          entityType: WorkflowEntityType.MATERIAL_REQUISITION,
          action: reviewing ? WorkflowAction.REVIEW_COMPLETED : WorkflowAction.APPROVAL_COMPLETED,
          fromStatus,
          toStatus: mr.status,
        }, manager);
      }
    });

    this.logger.log(
      `Requisition ${id}: ${ROLE_LABEL[role]} ${actor.email} recorded ${decision}${ended ? ' (round ended)' : ''}`,
      MaterialRequisitionWorkflowService.name,
    );

    if (!ended || !decided) return;
    const by = decided as MaterialRequisitionParticipant;
    void this.afterCommit(organizationId, id, async (mr) => {
      const mine = mr.participants.find((p) => p.id === by.id) ?? by;
      if (!reviewing) await this.notifier.approvalEnded(mr, mine);
      else if (positive) await this.notifier.approvalRequested(mr);
      else await this.notifier.reviewEnded(mr, mine);
    });
  }

  // ── Access ───────────────────────────────────────────────────────

  isWriter(actor: RequisitionActor): boolean {
    return REQUISITION_WRITER_ROLES.includes(actor.role);
  }

  /** The requester, or anyone who can raise and edit requisitions. */
  canManage(mr: MaterialRequisition, actor: RequisitionActor): boolean {
    return this.isWriter(actor) || mr.createdBy === actor.email;
  }

  /** Readers see every requisition; anyone else only the ones they raised or are assigned to. */
  assertCanRead(mr: MaterialRequisition, actor: RequisitionActor): void {
    if (REQUISITION_READER_ROLES.includes(actor.role)) return;
    if (mr.createdBy === actor.email) return;
    if ((mr.participants ?? []).some((p) => p.userId === actor.userId)) return;
    throw new ForbiddenException('You do not have access to this requisition');
  }

  permissionsFor(mr: MaterialRequisition, actor: RequisitionActor): RequisitionPermissionsDto {
    const participants = mr.participants ?? [];
    const mine = participants.filter((p) => p.userId === actor.userId);
    const pending = (role: RequisitionParticipantRole) => mine.some((p) => p.role === role && !p.decision);
    const owner = this.isWriter(actor) || mr.createdBy === actor.email;
    const open = !mr.lockedAt;
    const s = mr.status;

    return {
      canEdit: open && (
        ((s === MaterialRequisitionStatus.DRAFT || s === MaterialRequisitionStatus.RETURNED) && owner)
        || (s === MaterialRequisitionStatus.UNDER_REVIEW && (owner || pending(RequisitionParticipantRole.REVIEWER)))
      ),
      canSubmit: open && SUBMITTABLE_REQUISITION_STATUSES.includes(s) && owner,
      canReview: open && s === MaterialRequisitionStatus.UNDER_REVIEW && pending(RequisitionParticipantRole.REVIEWER),
      canApprove: open && s === MaterialRequisitionStatus.REVIEWED && pending(RequisitionParticipantRole.APPROVER),
      canEditReviewers: open && owner && REVIEWER_EDITABLE_STATUSES.includes(s),
      canEditApprovers: open && owner && APPROVER_EDITABLE_STATUSES.includes(s),
      myRoles: [...new Set(mine.map((p) => p.role))],
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────

  trackingActor(actor: RequisitionActor) {
    return { userId: actor.userId, name: actor.name, email: actor.email };
  }

  /** The requisition with everything the emails need. */
  async loadFull(organizationId: string, id: string): Promise<MaterialRequisition | null> {
    return this.mrRepo.findOne({
      where: { id, organizationId, isDeleted: false },
      relations: { project: { client: true }, wbsCostCode: true, items: true, participants: true },
    });
  }

  /** Runs `work` on the committed requisition; failures are logged, never thrown. */
  private async afterCommit(
    organizationId: string,
    id: string,
    work: (mr: MaterialRequisition) => Promise<void>,
  ): Promise<void> {
    try {
      const mr = await this.loadFull(organizationId, id);
      if (mr) await work(mr);
    } catch (err) {
      this.logger.error(
        `Requisition ${id}: notification failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  /** The return that sent the requisition back, shown to reviewers on resubmission. */
  private async lastReturnComments(mr: MaterialRequisition): Promise<RequisitionMailComment[]> {
    const events = await this.tracking.eventsFor(
      mr.organizationId,
      [WorkflowEntityType.MR_REVIEW, WorkflowEntityType.MR_APPROVAL],
      mr.id,
    );
    return events
      .filter((e) => e.action === WorkflowAction.RETURNED && e.round === mr.reviewRound - 1)
      .map((e) => ({
        name: e.actorName ?? e.actorEmail ?? 'Unknown',
        role: e.entityType === WorkflowEntityType.MR_APPROVAL ? 'Approver' as const : 'Reviewer' as const,
        decision: RequisitionDecision.RETURNED,
        comments: e.comments,
        at: e.createdAt,
      }));
  }

  private async assertInternalUsers(organizationId: string, ids: string[]): Promise<Map<string, User>> {
    if (!ids.length) return new Map();
    const users = await this.userRepo.find({
      where: { id: In(ids), organizationId },
      relations: { role: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    for (const id of ids) {
      const u = byId.get(id);
      if (!u || u.is_deleted) throw new BadRequestException('A selected reviewer or approver was not found');
      if (Number(u.is_internal) !== 1 || u.role?.name === EXTERNAL_ROLE) {
        throw new BadRequestException(`${this.userName(u)} is not an internal user and cannot review or approve`);
      }
      if (Number(u.is_active) !== 1) throw new BadRequestException(`${this.userName(u)} is inactive`);
    }
    return byId;
  }

  userName(u: Pick<User, 'first_name' | 'last_name' | 'email'>): string {
    return [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email;
  }
}
