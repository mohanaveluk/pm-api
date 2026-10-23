import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { User } from '../user/entity/user.entity';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { WorkflowTrackingService } from '../workflow-tracking/workflow-tracking.service';
import { MaterialRequisition } from './entities/material-requisition.entity';
import { MaterialRequisitionParticipant } from './entities/material-requisition-participant.entity';
import {
  MaterialRequisitionStatus, RequisitionDecision, RequisitionParticipantRole,
} from './enums/material-requisition.enums';
import { MaterialRequisitionNotificationService } from './material-requisition-notification.service';
import { MaterialRequisitionWorkflowService, RequisitionActor } from './material-requisition-workflow.service';

const ORG = 'org-1';
const MR_ID = 'mr-1';
const REQUESTER: RequisitionActor = { userId: 'u-req', email: 'req@x.com', name: 'Requester', role: 'ProjectManager' };
const R1: RequisitionActor = { userId: 'u-r1', email: 'r1@x.com', name: 'Reviewer One', role: 'User' };
const R2: RequisitionActor = { userId: 'u-r2', email: 'r2@x.com', name: 'Reviewer Two', role: 'DisciplineLead' };
const A1: RequisitionActor = { userId: 'u-a1', email: 'a1@x.com', name: 'Approver One', role: 'DepartmentManager' };
const R3: RequisitionActor = { userId: 'u-r3', email: 'r3@x.com', name: 'Reviewer Three', role: 'QAManager' };
const A2: RequisitionActor = { userId: 'u-a2', email: 'a2@x.com', name: 'Approver Two', role: 'ProcurementManager' };

const participant = (
  actor: RequisitionActor, role: RequisitionParticipantRole, extra: Partial<MaterialRequisitionParticipant> = {},
) => ({
  id: `p-${actor.userId}-${role}`, requisitionId: MR_ID, organizationId: ORG, role,
  userId: actor.userId, userName: actor.name, userEmail: actor.email, sequence: 1,
  decision: null, decisionComments: null, decidedAt: null, editedInRound: false, ...extra,
}) as MaterialRequisitionParticipant;

const requisition = (extra: Partial<MaterialRequisition> = {}) => ({
  id: MR_ID, organizationId: ORG, mrNumber: 'MR-1', trackingId: 'TRK-2026-0001', reviewRound: 1,
  status: MaterialRequisitionStatus.UNDER_REVIEW, createdBy: REQUESTER.email, lockedAt: null, ...extra,
}) as MaterialRequisition;

const user = (actor: RequisitionActor, extra: Record<string, unknown> = {}) => ({
  id: actor.userId, email: actor.email, first_name: actor.name, last_name: '', organizationId: ORG,
  is_internal: 1, is_active: 1, is_deleted: false, role: { name: actor.role }, ...extra,
});

describe('MaterialRequisitionWorkflowService', () => {
  let service: MaterialRequisitionWorkflowService;
  let mr: MaterialRequisition;
  let participants: MaterialRequisitionParticipant[];
  let users: any[];
  let manager: any;
  let tracking: { record: jest.Mock; eventsFor: jest.Mock; generateTrackingId: jest.Mock; backfill: jest.Mock };
  let notifier: Record<string, jest.Mock>;

  beforeEach(async () => {
    mr = requisition();
    participants = [
      participant(R1, RequisitionParticipantRole.REVIEWER),
      participant(R2, RequisitionParticipantRole.REVIEWER, { sequence: 2 }),
      participant(A1, RequisitionParticipantRole.APPROVER),
    ];
    users = [user(REQUESTER), user(R1), user(R2), user(A1), user(R3), user(A2)];

    manager = {
      findOne: jest.fn(async (entity: any) => (entity === MaterialRequisition ? mr : null)),
      find: jest.fn(async (_entity: any, opts: any) =>
        participants.filter((p) => p.requisitionId === opts.where.requisitionId
          && (!opts.where.role || p.role === opts.where.role))),
      save: jest.fn(async (_e: any, v: any) => v),
      create: jest.fn((_e: any, v: any) => ({ ...v })),
      delete: jest.fn(async () => undefined),
      update: jest.fn(async () => undefined),
    };
    tracking = {
      record: jest.fn(async () => undefined),
      eventsFor: jest.fn(async () => []),
      generateTrackingId: jest.fn(() => 'TRK-NEW00000-00000000-00000000'),
      backfill: jest.fn(async () => undefined),
    };
    notifier = {
      reviewRequested: jest.fn(async () => undefined),
      reviewEnded: jest.fn(async () => undefined),
      approvalRequested: jest.fn(async () => undefined),
      approvalEnded: jest.fn(async () => undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        MaterialRequisitionWorkflowService,
        {
          provide: getRepositoryToken(MaterialRequisition),
          useValue: {
            manager: { transaction: jest.fn(async (cb: any) => cb(manager)) },
            findOne: jest.fn(async () => ({ ...mr, participants })),
          },
        },
        { provide: getRepositoryToken(MaterialRequisitionParticipant), useValue: { find: jest.fn(async () => participants) } },
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(async (opts: any) => {
              const ids: string[] = opts?.where?.id?._value ?? users.map((u) => u.id);
              return users.filter((u) => ids.includes(u.id));
            }),
          },
        },
        { provide: WorkflowTrackingService, useValue: tracking },
        { provide: MaterialRequisitionNotificationService, useValue: notifier },
        { provide: CustomLoggerService, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn() } },
      ],
    }).compile();
    service = module.get(MaterialRequisitionWorkflowService);
  });

  const flush = () => new Promise((r) => setImmediate(r));

  describe('participants', () => {
    const savedRows = () => manager.save.mock.calls
      .filter((c: any[]) => c[0] === MaterialRequisitionParticipant)
      .map((c: any[]) => c[1]);

    it('assigns internal users in order on a draft', async () => {
      mr = requisition({ status: MaterialRequisitionStatus.DRAFT });
      participants = [];
      await service.replaceParticipants(manager, mr, [R2.userId, R1.userId], [A1.userId], REQUESTER);
      expect(savedRows().map((p: any) => [p.role, p.userId, p.sequence])).toEqual([
        [RequisitionParticipantRole.REVIEWER, R2.userId, 1],
        [RequisitionParticipantRole.REVIEWER, R1.userId, 2],
        [RequisitionParticipantRole.APPROVER, A1.userId, 1],
      ]);
    });

    it('refuses an external user', async () => {
      mr = requisition({ status: MaterialRequisitionStatus.DRAFT });
      participants = [];
      users = [user(R1, { is_internal: 0 }), user(A1)];
      await expect(service.replaceParticipants(manager, mr, [R1.userId], [A1.userId], REQUESTER))
        .rejects.toThrow('not an internal user');
    });

    it('refuses the same user as reviewer and approver', async () => {
      await expect(service.replaceParticipants(manager, mr, [R1.userId], [R1.userId], REQUESTER))
        .rejects.toThrow('both a reviewer and an approver');
    });

    it('lets the requester add a reviewer under review, keeping decisions already made', async () => {
      participants[0].decision = RequisitionDecision.REVIEWED;
      const change = await service.replaceParticipants(
        manager, mr, [R1.userId, R2.userId, R3.userId], undefined, REQUESTER,
      );

      expect(change).toMatchObject({ changed: true, reviewersChanged: true, addedReviewerIds: [R3.userId] });
      // R1 and R2 are untouched (no delete, no re-insert); only R3 is created.
      expect(savedRows().map((p: any) => p.userId)).toEqual([R3.userId]);
      expect(manager.delete).not.toHaveBeenCalled();
      expect(participants[0].decision).toBe(RequisitionDecision.REVIEWED);
      expect(tracking.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATED' }), manager);
    });

    it('locks the reviewers once reviewed, but not the approvers', async () => {
      mr = requisition({ status: MaterialRequisitionStatus.REVIEWED });
      await expect(service.replaceParticipants(manager, mr, [R1.userId], undefined, REQUESTER))
        .rejects.toThrow('reviewers are locked');

      const change = await service.replaceParticipants(manager, mr, undefined, [A1.userId, A2.userId], REQUESTER);
      expect(change.addedApproverIds).toEqual([A2.userId]);
    });

    it('locks the approvers once approved', async () => {
      mr = requisition({ status: MaterialRequisitionStatus.APPROVED });
      await expect(service.replaceParticipants(manager, mr, undefined, [A2.userId], REQUESTER))
        .rejects.toThrow('approvers are locked');
    });

    it('ignores lists that do not change anything', async () => {
      mr = requisition({ status: MaterialRequisitionStatus.APPROVED });
      const change = await service.replaceParticipants(
        manager, mr, [R1.userId, R2.userId], [A1.userId], REQUESTER,
      );
      expect(change.changed).toBe(false);
    });

    it('only the requester (or a writer) can change them', async () => {
      await expect(service.replaceParticipants(manager, mr, [R1.userId], undefined, R2))
        .rejects.toThrow(ForbiddenException);
    });

    it('keeps at least one reviewer once submitted', async () => {
      await expect(service.replaceParticipants(manager, mr, [], undefined, REQUESTER))
        .rejects.toThrow('at least one reviewer');
    });

    it('completes the review when the only pending reviewer is removed', async () => {
      participants[0].decision = RequisitionDecision.REVIEWED;
      participants = participants.filter((p) => p.userId !== R2.userId);

      const settled = await service.settleRound(manager, mr, REQUESTER);

      expect(settled).toBe(MaterialRequisitionStatus.REVIEWED);
      expect(mr.status).toBe(MaterialRequisitionStatus.REVIEWED);
      expect(tracking.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'REVIEW_COMPLETED' }), manager);
    });

    it('emails only the reviewers added to a live round', async () => {
      service.notifyParticipantChange(ORG, MR_ID, {
        changed: true, reviewersChanged: true, approversChanged: false,
        addedReviewerIds: [R3.userId], addedApproverIds: [],
      }, null);
      await flush();
      expect(notifier.reviewRequested).toHaveBeenCalledWith(expect.anything(), false, [], [R3.userId]);
    });

    it('needs a reviewer and an approver to submit', async () => {
      participants = [participant(R1, RequisitionParticipantRole.REVIEWER)];
      await expect(service.assertReadyToSubmit(manager, MR_ID)).rejects.toThrow('at least one approver');
    });
  });

  describe('tracking id', () => {
    it('gives a requisition without one a new id and stamps its earlier steps', async () => {
      mr = requisition({ trackingId: null });
      const id = await service.ensureTrackingId(manager, mr);

      expect(id).toBe('TRK-NEW00000-00000000-00000000');
      expect(manager.update).toHaveBeenCalledWith(MaterialRequisition, { id: MR_ID }, { trackingId: id });
      expect(tracking.backfill).toHaveBeenCalledWith(manager, ORG, MR_ID, id);
    });

    it('keeps an existing id', async () => {
      expect(await service.ensureTrackingId(manager, mr)).toBe('TRK-2026-0001');
      expect(tracking.generateTrackingId).not.toHaveBeenCalled();
    });

    it('is assigned before a decision is recorded on an older requisition', async () => {
      mr = requisition({ trackingId: null });
      await service.review(ORG, MR_ID, R1, { decision: RequisitionDecision.REVIEWED });
      expect(tracking.record.mock.calls.every((c: any[]) => c[0].trackingId === 'TRK-NEW00000-00000000-00000000')).toBe(true);
    });
  });

  describe('in-app item for an email', () => {
    it('describes the requisition with its project, description, client and WBS', async () => {
      const findOne = jest.fn(async () => ({
        ...requisition(), mrNumber: '0002', projectId: 'p-1', requiredOnSiteDate: '2026-11-01', createdBy: 'req@x.com',
        status: MaterialRequisitionStatus.UNDER_REVIEW, reviewRound: 1,
        project: { code: 'PRJ-01', projectName: 'Tower A', description: 'Structural works, block A', client: { clientName: 'Acme' } },
        wbsCostCode: { code: 'W-10', projectDetails: 'Foundations' },
      }));
      const out = await service.describeForEmail(
        { emailType: 'REVIEW_MATERIAL_REQUISITION', referenceId: MR_ID } as any, { findOne } as any,
      );

      expect(out?.message).toBe('Review requested: Material Requisition 0002 for project PRJ-01 — Tower A. Structural works, block A');
      expect(out?.metadata).toMatchObject({ projectDescription: 'Structural works, block A', toStatus: 'UNDER_REVIEW' });
      expect((out?.metadata.details as any[]).map((d) => d.label)).toEqual([
        'Requisition', 'Project', 'Project description', 'Client', 'WBS / Cost code', 'Required on site', 'Requested by',
      ]);
    });

    it('has nothing to add for a requisition that no longer exists', async () => {
      expect(await service.describeForEmail(
        { emailType: 'APPROVE_MATERIAL_REQUISITION', referenceId: 'gone' } as any, { findOne: jest.fn(async () => null) } as any,
      )).toBeNull();
    });
  });

  describe('rounds', () => {
    it('starts a new round on resubmission and clears every decision', async () => {
      mr = requisition({ status: MaterialRequisitionStatus.RETURNED, reviewRound: 1 });
      const result = await service.startRound(manager, mr, REQUESTER);

      expect(result.resubmitted).toBe(true);
      expect(mr).toMatchObject({ status: MaterialRequisitionStatus.UNDER_REVIEW, reviewRound: 2, submittedBy: REQUESTER.email });
      expect(manager.update).toHaveBeenCalledWith(
        MaterialRequisitionParticipant, { requisitionId: MR_ID },
        expect.objectContaining({ decision: null, editedInRound: false }),
      );
      expect(tracking.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'RESUBMITTED', round: 2 }), manager);
    });

    it('cannot submit one that is already under review', async () => {
      await expect(service.startRound(manager, mr, REQUESTER)).rejects.toThrow(ConflictException);
    });
  });

  describe('review', () => {
    it('is reviewed as soon as any one reviewer reviews it', async () => {
      await service.review(ORG, MR_ID, R1, { decision: RequisitionDecision.REVIEWED });

      expect(participants[0].decision).toBe(RequisitionDecision.REVIEWED);
      expect(participants[1].decision).toBeNull();
      expect(mr.status).toBe(MaterialRequisitionStatus.REVIEWED);
      expect(mr.reviewedAt).toBeInstanceOf(Date);
      expect(tracking.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'REVIEW_COMPLETED' }), manager);
      await flush();
      expect(notifier.approvalRequested).toHaveBeenCalledTimes(1);

      // The other reviewer's review is no longer needed.
      await expect(service.review(ORG, MR_ID, R2, { decision: RequisitionDecision.REVIEWED }))
        .rejects.toThrow('not waiting for review');
    });

    it('a return ends the round at once and tells the requester', async () => {
      await service.review(ORG, MR_ID, R1, { decision: RequisitionDecision.RETURNED, comments: 'Add the MTO reference' });
      expect(mr.status).toBe(MaterialRequisitionStatus.RETURNED);
      await flush();
      expect(notifier.reviewEnded).toHaveBeenCalledTimes(1);
    });

    it('needs comments for a return, rejection or cancellation', async () => {
      await expect(service.review(ORG, MR_ID, R1, { decision: RequisitionDecision.REJECTED }))
        .rejects.toThrow(BadRequestException);
    });

    it('needs comments from a reviewer who edited the requisition', async () => {
      participants[0].editedInRound = true;
      await expect(service.review(ORG, MR_ID, R1, { decision: RequisitionDecision.REVIEWED }))
        .rejects.toThrow('describe your changes');
    });

    it('only an assigned reviewer can review, once per round', async () => {
      await expect(service.review(ORG, MR_ID, A1, { decision: RequisitionDecision.REVIEWED }))
        .rejects.toThrow(ForbiddenException);

      participants[0].decision = RequisitionDecision.REVIEWED;
      await expect(service.review(ORG, MR_ID, R1, { decision: RequisitionDecision.REVIEWED }))
        .rejects.toThrow('already recorded');
    });

    it('a reviewer cannot approve', async () => {
      await expect(service.review(ORG, MR_ID, R1, { decision: RequisitionDecision.APPROVED }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('approval', () => {
    beforeEach(() => { mr = requisition({ status: MaterialRequisitionStatus.REVIEWED }); });

    it('is approved as soon as any one approver approves it', async () => {
      participants.push(participant(A2, RequisitionParticipantRole.APPROVER, { sequence: 2 }));
      await service.approve(ORG, MR_ID, A1, { decision: RequisitionDecision.APPROVED });

      expect(mr.status).toBe(MaterialRequisitionStatus.APPROVED);
      await expect(service.approve(ORG, MR_ID, A2, { decision: RequisitionDecision.APPROVED }))
        .rejects.toThrow('not waiting for approval');
    });

    it('approves and tells everyone', async () => {
      await service.approve(ORG, MR_ID, A1, { decision: RequisitionDecision.APPROVED, comments: 'Within budget' });
      expect(mr.status).toBe(MaterialRequisitionStatus.APPROVED);
      expect(mr.approvedAt).toBeInstanceOf(Date);
      expect(tracking.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'APPROVAL_COMPLETED' }), manager);
      await flush();
      expect(notifier.approvalEnded).toHaveBeenCalledTimes(1);
    });

    it('waits for approval only once the review is complete', async () => {
      mr = requisition({ status: MaterialRequisitionStatus.UNDER_REVIEW });
      await expect(service.approve(ORG, MR_ID, A1, { decision: RequisitionDecision.APPROVED }))
        .rejects.toThrow('not waiting for approval');
    });

    it('cancellation needs a reason', async () => {
      await expect(service.approve(ORG, MR_ID, A1, { decision: RequisitionDecision.CANCELLED }))
        .rejects.toThrow('cancelled');
    });

    it('refuses a locked requisition', async () => {
      mr = requisition({ status: MaterialRequisitionStatus.REVIEWED, lockedAt: new Date() });
      await expect(service.approve(ORG, MR_ID, A1, { decision: RequisitionDecision.APPROVED }))
        .rejects.toThrow('locked');
    });

    it('needs comments from an approver who edited the requisition', async () => {
      participants[2].editedInRound = true;
      await expect(service.approve(ORG, MR_ID, A1, { decision: RequisitionDecision.APPROVED }))
        .rejects.toThrow('describe your changes');
      await service.approve(ORG, MR_ID, A1, { decision: RequisitionDecision.APPROVED, comments: 'Raised line 2 to 40 m' });
      expect(mr.status).toBe(MaterialRequisitionStatus.APPROVED);
    });

    it("records an approver's edit as an approval step", async () => {
      const approver = participants[2];
      manager.findOne.mockImplementation(async (entity: any) =>
        entity === MaterialRequisitionParticipant ? approver : entity === MaterialRequisition ? mr : null);
      await service.markParticipantEdit(manager, mr, A1);

      expect(approver.editedInRound).toBe(true);
      expect(tracking.record).toHaveBeenCalledWith(expect.objectContaining({
        entityType: 'MR_APPROVAL', action: 'EDITED_IN_APPROVAL',
      }), manager);
      expect(manager.findOne).toHaveBeenCalledWith(MaterialRequisitionParticipant, {
        where: expect.objectContaining({ role: RequisitionParticipantRole.APPROVER, userId: A1.userId }),
      });
    });
  });

  describe('permissions', () => {
    it('lets a pending reviewer edit and review, but not an approver', () => {
      const full = { ...mr, participants } as MaterialRequisition;
      expect(service.permissionsFor(full, R1)).toMatchObject({ canEdit: true, canReview: true, canApprove: false });
      expect(service.permissionsFor(full, A1)).toMatchObject({ canEdit: false, canReview: false, canApprove: false });
    });

    it('lets a pending approver edit while reviewed — and nobody once approved', () => {
      const reviewed = { ...requisition({ status: MaterialRequisitionStatus.REVIEWED }), participants } as MaterialRequisition;
      expect(service.permissionsFor(reviewed, A1)).toMatchObject({ canEdit: true, canApprove: true });
      // The review is done: reviewers can no longer edit, nor can the requester.
      expect(service.permissionsFor(reviewed, R1)).toMatchObject({ canEdit: false });
      expect(service.permissionsFor(reviewed, { ...REQUESTER, role: 'User' })).toMatchObject({ canEdit: false });

      const decided = participants.map((p) => (p.userId === A1.userId ? { ...p, decision: RequisitionDecision.APPROVED } : p));
      expect(service.permissionsFor({ ...reviewed, participants: decided } as MaterialRequisition, A1))
        .toMatchObject({ canEdit: false });

      const approved = { ...requisition({ status: MaterialRequisitionStatus.APPROVED }), participants } as MaterialRequisition;
      for (const who of [A1, R1, REQUESTER]) {
        expect(service.permissionsFor(approved, who).canEdit).toBe(false);
      }
    });

    it('lets the requester edit and resubmit a returned requisition', () => {
      const full = { ...requisition({ status: MaterialRequisitionStatus.RETURNED }), participants } as MaterialRequisition;
      expect(service.permissionsFor(full, { ...REQUESTER, role: 'User' })).toMatchObject({ canEdit: true, canSubmit: true });
    });

    it('hides a requisition from an unrelated user', () => {
      const full = { ...mr, participants } as MaterialRequisition;
      expect(() => service.assertCanRead(full, { userId: 'x', email: 'x@x.com', name: 'X', role: 'User' }))
        .toThrow(ForbiddenException);
      expect(() => service.assertCanRead(full, R1)).not.toThrow();
    });
  });
});
