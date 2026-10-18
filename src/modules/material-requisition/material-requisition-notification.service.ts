import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EmailService } from 'src/shared/email/email.service';
import { EmailType } from 'src/shared/email/enums/email.enums';
import { User } from '../user/entity/user.entity';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { MaterialRequisition } from './entities/material-requisition.entity';
import { MaterialRequisitionParticipant } from './entities/material-requisition-participant.entity';
import { RequisitionDecision, RequisitionParticipantRole } from './enums/material-requisition.enums';
import {
  RequisitionMailComment, RequisitionMailSummary,
  materialRequisitionReviewOutcomeSubject, materialRequisitionReviewOutcomeTemplate,
  materialRequisitionReviewRequestSubject, materialRequisitionReviewRequestTemplate,
} from 'src/shared/email/templates/material-requisition-review-template';
import {
  materialRequisitionApprovalOutcomeSubject, materialRequisitionApprovalOutcomeTemplate,
  materialRequisitionApprovalRequestSubject, materialRequisitionApprovalRequestTemplate,
} from 'src/shared/email/templates/material-requisition-approval-template';

/**
 * Builds and sends the review / approval emails for a requisition.
 *
 * Every method is safe to call without awaiting: a failed email is logged and
 * never undoes or blocks the decision that triggered it. Links land on the
 * application, where the user signs in — an email never carries a one-click
 * decision.
 *
 * Expects the requisition loaded with project.client, wbsCostCode, items and
 * participants.
 */
/** Who triggered an email: their user id when known, and their email. */
interface EmailSender {
  userId?: string | null;
  email?: string | null;
}

/** The email type for each decision that settles a review or approval. */
const OUTCOME_EMAIL_TYPE: Record<string, EmailType> = {
  APPROVED:  EmailType.APPROVE_MATERIAL_REQUISITION,
  RETURNED:  EmailType.RETURN_MATERIAL_REQUISITION,
  REJECTED:  EmailType.REJECT_MATERIAL_REQUISITION,
  CANCELLED: EmailType.CANCEL_MATERIAL_REQUISITION,
};

@Injectable()
export class MaterialRequisitionNotificationService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
    private readonly logger: CustomLoggerService,
  ) {}

  // ── Links ────────────────────────────────────────────────────────

  private url(path: string): string {
    return `${(process.env.FRONTEND_URL ?? '').replace(/\/$/, '')}/material-requisitions${path}`;
  }

  reviewUrl(id: string): string { return this.url(`/reviews/${id}`); }
  approvalUrl(id: string): string { return this.url(`/approvals/${id}`); }
  viewUrl(id: string): string { return this.url(`/${id}`); }
  editUrl(id: string): string { return this.url(`/${id}/edit`); }

  // ── Emails ───────────────────────────────────────────────────────
  //
  // Each email is recorded in email_history (EmailService) with its type, the
  // requisition it is about and the user whose action sent it.

  /** Submitted or resubmitted: every reviewer is asked to review. */
  async reviewRequested(
    mr: MaterialRequisition,
    resubmitted: boolean,
    returnComments: RequisitionMailComment[] = [],
    /** Only these reviewers (e.g. ones added mid-review); all when omitted. */
    onlyUserIds?: string[],
  ): Promise<void> {
    const assigned = this.byRole(mr, RequisitionParticipantRole.REVIEWER);
    const reviewers = onlyUserIds ? assigned.filter((p) => onlyUserIds.includes(p.userId)) : assigned;
    if (!reviewers.length) return;
    const summary = await this.summary(mr);
    const data = {
      ...summary,
      reviewUrl: this.reviewUrl(mr.id),
      round: mr.reviewRound,
      resubmitted,
      returnComments,
      reviewers: assigned.map((p) => p.userName),
      approvers: this.byRole(mr, RequisitionParticipantRole.APPROVER).map((p) => p.userName),
    };
    await this.send(
      mr,
      reviewers.map((p) => p.userEmail),
      null,
      materialRequisitionReviewRequestSubject(data),
      materialRequisitionReviewRequestTemplate(data),
      {
        emailType: resubmitted ? EmailType.RESUBMIT_MATERIAL_REQUISITION : EmailType.REVIEW_MATERIAL_REQUISITION,
        // Submitted by the requester; reviewers added later were added by whoever saved the change.
        sender: { email: onlyUserIds ? mr.updatedBy : (mr.submittedBy ?? mr.createdBy) },
      },
    );
  }

  /** A reviewer returned, rejected or cancelled it: the requester is told why. */
  async reviewEnded(mr: MaterialRequisition, by: MaterialRequisitionParticipant): Promise<void> {
    const requester = mr.createdBy;
    if (!requester) return;
    const decision = by.decision as 'RETURNED' | 'REJECTED' | 'CANCELLED';
    const data = {
      ...(await this.summary(mr)),
      decision,
      decidedBy: by.userName,
      decidedByEmail: by.userEmail,
      decidedAt: by.decidedAt ?? new Date(),
      comments: by.decisionComments ?? '',
      actionUrl: decision === RequisitionDecision.RETURNED ? this.editUrl(mr.id) : this.viewUrl(mr.id),
    };
    // The other reviewers are copied: their pending review is no longer needed.
    const otherReviewers = this.byRole(mr, RequisitionParticipantRole.REVIEWER)
      .filter((p) => p.userId !== by.userId)
      .map((p) => p.userEmail);
    await this.send(
      mr,
      [requester],
      otherReviewers,
      materialRequisitionReviewOutcomeSubject(data),
      materialRequisitionReviewOutcomeTemplate(data),
      { emailType: OUTCOME_EMAIL_TYPE[decision], sender: { userId: by.userId, email: by.userEmail } },
    );
  }

  /** Every reviewer has reviewed it: the approvers are asked, the requester is copied. */
  async approvalRequested(
    mr: MaterialRequisition,
    /** Only these approvers (e.g. ones added after the review); all when omitted. */
    onlyUserIds?: string[],
  ): Promise<void> {
    const assigned = this.byRole(mr, RequisitionParticipantRole.APPROVER);
    const approvers = onlyUserIds ? assigned.filter((p) => onlyUserIds.includes(p.userId)) : assigned;
    if (!approvers.length) return;
    const data = {
      ...(await this.summary(mr)),
      approvalUrl: this.approvalUrl(mr.id),
      reviewComments: this.comments(mr, RequisitionParticipantRole.REVIEWER),
      approvers: assigned.map((p) => p.userName),
      reviewedAt: mr.reviewedAt ?? new Date(),
    };
    await this.send(
      mr,
      approvers.map((p) => p.userEmail),
      onlyUserIds ? null : [
        ...(mr.createdBy ? [mr.createdBy] : []),
        // Other reviewers learn that their review is no longer needed.
        ...this.byRole(mr, RequisitionParticipantRole.REVIEWER).map((p) => p.userEmail),
      ],
      materialRequisitionApprovalRequestSubject(data),
      materialRequisitionApprovalRequestTemplate(data),
      { emailType: EmailType.APPROVAL_REQUEST_MATERIAL_REQUISITION, sender: this.reviewedBy(mr) },
    );
  }

  /**
   * An approver's decision that settles the requisition — approved by all, or
   * returned / rejected / cancelled by one: the requester, the reviewers and
   * the approvers are all told.
   */
  async approvalEnded(mr: MaterialRequisition, by: MaterialRequisitionParticipant): Promise<void> {
    const decision = by.decision as 'APPROVED' | 'RETURNED' | 'REJECTED' | 'CANCELLED';
    const data = {
      ...(await this.summary(mr)),
      decision,
      decidedBy: by.userName,
      decidedByEmail: by.userEmail,
      decidedAt: by.decidedAt ?? new Date(),
      comments: by.decisionComments,
      reviewComments: this.comments(mr, RequisitionParticipantRole.REVIEWER),
      approvalComments: this.comments(mr, RequisitionParticipantRole.APPROVER),
      viewUrl: this.viewUrl(mr.id),
    };
    const to = [
      ...(mr.createdBy ? [mr.createdBy] : []),
      ...this.byRole(mr, RequisitionParticipantRole.REVIEWER).map((p) => p.userEmail),
    ];
    const cc = this.byRole(mr, RequisitionParticipantRole.APPROVER).map((p) => p.userEmail);
    await this.send(
      mr,
      to,
      cc,
      materialRequisitionApprovalOutcomeSubject(data),
      materialRequisitionApprovalOutcomeTemplate(data),
      { emailType: OUTCOME_EMAIL_TYPE[decision], sender: { userId: by.userId, email: by.userEmail } },
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private byRole(mr: MaterialRequisition, role: RequisitionParticipantRole): MaterialRequisitionParticipant[] {
    return (mr.participants ?? [])
      .filter((p) => p.role === role)
      .sort((a, b) => a.sequence - b.sequence);
  }

  /** Decisions recorded so far in the current round, in assignment order. */
  comments(mr: MaterialRequisition, role: RequisitionParticipantRole): RequisitionMailComment[] {
    return this.byRole(mr, role)
      .filter((p) => p.decision)
      .map((p) => ({
        name: p.userName,
        role: role === RequisitionParticipantRole.REVIEWER ? 'Reviewer' : 'Approver',
        decision: p.decision as string,
        comments: p.decisionComments,
        at: p.decidedAt,
      }));
  }

  private async summary(mr: MaterialRequisition): Promise<RequisitionMailSummary> {
    const requester = mr.createdBy
      ? await this.userRepo.findOne({ where: { email: mr.createdBy } }).catch(() => null)
      : null;
    const items = [...(mr.items ?? [])].sort((a, b) => a.lineNumber - b.lineNumber);
    const wbs = mr.wbsCostCode;
    return {
      mrNumber: mr.mrNumber,
      trackingId: mr.trackingId,
      projectCode: mr.project?.code ?? null,
      projectName: mr.project?.projectName ?? null,
      clientName: mr.project?.client?.clientName ?? null,
      wbs: wbs ? `${wbs.code} — ${wbs.projectDetails}` : null,
      budgetHead: mr.budgetHead,
      requiredOnSiteDate: mr.requiredOnSiteDate ? String(mr.requiredOnSiteDate).slice(0, 10) : null,
      itemCount: items.length,
      lines: items.slice(0, 10).map((i) => ({
        lineNumber: i.lineNumber,
        materialCode: i.materialCode,
        materialDescription: i.materialDescription,
        uom: i.uom,
        requestedQty: Number(i.requestedQty),
      })),
      requestedBy: mr.createdBy ?? '',
      requestedByName: requester
        ? [requester.first_name, requester.last_name].filter(Boolean).join(' ').trim() || null
        : null,
      submittedAt: mr.submittedAt,
      supportEmail: process.env.SUPPORT_EMAIL || undefined,
    };
  }

  /** The reviewer whose review completed it (for the approval request's sender). */
  private reviewedBy(mr: MaterialRequisition): EmailSender {
    const reviewer = this.byRole(mr, RequisitionParticipantRole.REVIEWER)
      .filter((p) => p.decision === RequisitionDecision.REVIEWED && p.decidedAt)
      .sort((a, b) => +new Date(b.decidedAt!) - +new Date(a.decidedAt!))[0];
    return reviewer ? { userId: reviewer.userId, email: reviewer.userEmail } : { email: mr.updatedBy };
  }

  private async send(
    mr: MaterialRequisition,
    to: string[],
    cc: string[] | null,
    subject: string,
    html: string,
    context: { emailType: EmailType; sender?: EmailSender },
  ): Promise<void> {
    const recipients = [...new Set(to.filter(Boolean))];
    if (!recipients.length) return;
    const copied = [...new Set((cc ?? []).filter((e) => e && !recipients.includes(e)))];
    try {
      const sent = await this.emailService.sendEmail({
        to: recipients,
        cc: copied.length ? copied.join(', ') : undefined,
        subject,
        html,
        emailType: context.emailType,
        fromUserId: context.sender?.userId ?? null,
        createdBy: context.sender?.email ?? null,
        organizationId: mr.organizationId,
        reference: { type: 'MATERIAL_REQUISITION', id: mr.id },
        metadata: { mrNumber: mr.mrNumber, trackingId: mr.trackingId, status: mr.status, round: mr.reviewRound },
      });
      if (!sent) {
        this.logger.warn(`Requisition email "${subject}" was not sent (${mr.mrNumber})`, MaterialRequisitionNotificationService.name);
      }
    } catch (err) {
      this.logger.error(
        `Failed to send requisition email "${subject}" for ${mr.mrNumber}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  /** Users the given ids belong to (for names and emails at assignment time). */
  async usersByIds(organizationId: string, ids: string[]): Promise<User[]> {
    if (!ids.length) return [];
    return this.userRepo.find({ where: { id: In(ids), organizationId }, relations: { role: true } });
  }
}
