import { NotFoundException } from '@nestjs/common';
import { NotificationService, humanizeType } from './notification.service';
import { NotificationCategory, NotificationSourceType } from './enums/notification.enums';

function setup(users: any[] = []) {
  const inserted: any[][] = [];
  const qb = {
    insert: () => qb, into: () => qb, orIgnore: () => qb,
    values: (rows: any[]) => { inserted.push(rows); return qb; },
    execute: jest.fn(async () => ({})),
  };
  const manager = { createQueryBuilder: () => qb };
  const repo: any = {
    manager,
    findOne: jest.fn(async () => null),
    count: jest.fn(async () => 3),
    save: jest.fn(async (v: any) => v),
  };
  const userRepo = { find: jest.fn(async () => users) };
  const logger = { error: jest.fn(), log: jest.fn(), warn: jest.fn() };
  const service = new NotificationService(repo, userRepo as any, {} as any, {} as any, logger as any);
  return { service, inserted, repo, userRepo, manager };
}

const user = (id: string, email: string, organizationId = 'org-1') => ({ id, email, organizationId });

describe('NotificationService', () => {
  it('turns types into titles', () => {
    expect(humanizeType('REVIEW_MATERIAL_REQUISITION')).toBe('Review Material Requisition');
    expect(humanizeType('LOGIN_OTC')).toBe('Login OTC');
    expect(humanizeType('APPROVE_RFQ')).toBe('Approve RFQ');
  });

  describe('from an email', () => {
    const history = {
      id: 7, emailType: 'REVIEW_MATERIAL_REQUISITION', subject: 'Review requested: MR-0002',
      toEmail: 'r1@x.com, R2@X.com', ccEmail: 'req@x.com, outsider@gmail.com', fromUserId: 'u-req',
      organizationId: 'org-1', referenceType: 'MATERIAL_REQUISITION', referenceId: 'mr-2',
      metadata: { trackingId: 'TRK-1' }, status: 'SENT', sentAt: new Date('2026-10-18T10:00:00Z'),
      createdBy: 'req@x.com',
    } as any;

    it('notifies every user it went to, except the sender and users of another organization', async () => {
      const t = setup([
        user('u-r1', 'r1@x.com'), user('u-r2', 'r2@x.com'), user('u-req', 'req@x.com'),
        user('u-other', 'r1@x.com', 'org-2'),
      ]);
      await t.service.fromEmail(history);

      expect(t.inserted[0].map((r) => r.userId)).toEqual(['u-r1', 'u-r2']);
      expect(t.inserted[0][0]).toMatchObject({
        category: NotificationCategory.EMAIL,
        type: 'REVIEW_MATERIAL_REQUISITION',
        title: 'Review Material Requisition',
        message: 'Review requested: MR-0002',
        link: '/material-requisitions/mr-2',
        sourceType: NotificationSourceType.EMAIL_HISTORY,
        sourceId: '7',
        trackingId: 'TRK-1',
        isRead: false,
      });
    });

    it('creates nothing when no recipient is a user of the application', async () => {
      const t = setup([]);
      expect(await t.service.fromEmail(history)).toBe(0);
      expect(t.inserted).toEqual([]);
    });

    it('adds an in-app workflow item of the same type, described by the owning module', async () => {
      const t = setup([user('u-r1', 'r1@x.com')]);
      t.service.registerEmailDescriber(['MATERIAL_REQUISITION'], async () => ({
        message: 'Review requested: Material Requisition 0002 for project PRJ-01 — Tower A.',
        metadata: { details: [{ label: 'Project', value: 'PRJ-01 — Tower A' }] },
      }));
      await t.service.fromEmail({ ...history, status: 'FAILED' });

      expect(t.inserted[1]).toEqual([expect.objectContaining({
        userId: 'u-r1',
        category: NotificationCategory.WORKFLOW,
        type: 'REVIEW_MATERIAL_REQUISITION',
        title: 'Review Material Requisition',
        message: 'Review requested: Material Requisition 0002 for project PRJ-01 — Tower A.',
        sourceType: NotificationSourceType.EMAIL_WORKFLOW,
        sourceId: '7',
        link: '/material-requisitions/mr-2',
        metadata: expect.objectContaining({ emailStatus: 'FAILED', details: [{ label: 'Project', value: 'PRJ-01 — Tower A' }] }),
      })]);
    });

    it('files account emails under System and never repeats their body', async () => {
      const t = setup([user('u-r1', 'r1@x.com')]);
      await t.service.fromEmail({
        ...history, emailType: 'LOGIN_OTC', subject: 'Your sign-in code', referenceType: null, referenceId: null,
        htmlContent: 'code 123456',
      });
      expect(t.inserted[1][0]).toMatchObject({
        category: NotificationCategory.SYSTEM, type: 'LOGIN_OTC', message: 'Your sign-in code', link: null,
      });
      expect(JSON.stringify(t.inserted[1][0])).not.toContain('123456');
    });
  });

  describe('from a workflow step', () => {
    const event = {
      id: 'ev-1', organizationId: 'org-1', trackingId: 'TRK-1', entityType: 'MR_REVIEW', entityId: 'mr-2',
      entityReference: '0002', action: 'REVIEWED', fromStatus: 'UNDER_REVIEW', toStatus: 'REVIEWED',
      round: 1, actorId: 'u-r1', actorName: 'Arjun Rao', actorEmail: 'r1@x.com', comments: 'Checked',
      createdAt: new Date(),
    } as any;

    it('tells everyone concerned except whoever took the step', async () => {
      const t = setup();
      t.service.registerWorkflowAudience(['MR_REVIEW'], async () => ['u-req', 'u-r1', 'u-a1']);
      await t.service.fromWorkflowEvent(event);

      expect(t.inserted[0].map((r) => r.userId)).toEqual(['u-req', 'u-a1']);
      expect(t.inserted[0][0]).toMatchObject({
        category: NotificationCategory.WORKFLOW,
        title: 'Material Requisition Reviewed',
        message: 'Material Requisition 0002 was reviewed by Arjun Rao · Under Review → Reviewed',
        severity: 'success',
        link: '/material-requisitions/mr-2',
        metadata: expect.objectContaining({ comments: 'Checked' }),
      });
    });

    it('stays quiet for steps that would repeat the same news, or documents nobody registered', async () => {
      const t = setup();
      t.service.registerWorkflowAudience(['MR_REVIEW', 'MATERIAL_REQUISITION'], async () => ['u-req']);
      expect(await t.service.fromWorkflowEvent({ ...event, action: 'REVIEW_COMPLETED' })).toBe(0);
      expect(await t.service.fromWorkflowEvent({ ...event, entityType: 'RFQ' })).toBe(0);
    });

    it('adds the users a step names and skips those who were emailed about it', async () => {
      const t = setup();
      t.service.registerWorkflowAudience(['VENDOR'], async () => ['u-creator', 'u-req']);
      const manager = {
        ...t.manager,
        find: jest.fn(async () => [user('u-req', 'req@x.com'), user('u-fin', 'fin@x.com'), user('u-x', 'fin@x.com', 'org-2')]),
      };
      await t.service.fromWorkflowEvent({
        ...event, entityType: 'VENDOR', entityId: 'v-1', entityReference: 'CIV000007', action: 'APPROVED',
        fromStatus: 'ACTIVE', toStatus: 'BLACKLISTED', actorId: 'u-mgr',
        metadata: { notifyUserIds: ['u-audit'], notifyEmails: ['FIN@x.com'], emailedTo: ['req@x.com'] },
      }, manager as any);

      expect(t.inserted[0].map((r) => r.userId)).toEqual(['u-creator', 'u-audit', 'u-fin']);
      expect(t.inserted[0][0]).toMatchObject({
        title: 'Vendor Approved',
        message: 'Vendor CIV000007 was approved by Arjun Rao · Active → Blacklisted',
        link: '/vendors/v-1/view',
      });
    });

    it('links material steps to the material master', async () => {
      const t = setup();
      t.service.registerWorkflowAudience(['MATERIAL'], async () => ['u-creator']);
      await t.service.fromWorkflowEvent({
        ...event, entityType: 'MATERIAL', entityId: 'm-1', entityReference: 'RAW000003',
        action: 'STATUS_CHANGED', fromStatus: 'ACTIVE', toStatus: 'OBSOLETE',
      });
      expect(t.inserted[0][0]).toMatchObject({ title: 'Material Obsolete', link: '/admin/materials/m-1' });
    });
  });

  describe("a user's own notifications", () => {
    it("treats someone else's notification as not found", async () => {
      const t = setup();
      await expect(t.service.setRead('u-1', '99', true)).rejects.toThrow(NotFoundException);
      expect(t.repo.findOne).toHaveBeenCalledWith({ where: { id: '99', userId: 'u-1', isDeleted: false } });
    });

    it('marks one read with the time', async () => {
      const t = setup();
      t.repo.findOne.mockResolvedValue({ id: '5', userId: 'u-1', isRead: false, readAt: null });
      const res = await t.service.setRead('u-1', '5', true);
      expect(res).toMatchObject({ id: '5', isRead: true, readAt: expect.any(Date) });
    });
  });
});
