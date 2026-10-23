import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserProjectMappingService, MappingActor } from './user-project-mapping.service';
import { UserProjectAccessService } from './user-project-access.service';
import { UserProjectMapping } from './entities/user-project-mapping.entity';
import { UserProjectMappingStatus } from './enums/user-project-mapping.enums';
import { CreateUserProjectMappingDto } from './dto/user-project-mapping.dto';
import { ProjectStatus } from '../project/enums/project.enums';

const ORG = 'org-1';
const PROJECT = { id: 'p-1', code: '0001', projectName: 'Tower A', status: ProjectStatus.ACTIVE, clientId: 'c-1' };
const ADMIN: MappingActor = { userId: 'u-admin', email: 'admin@x.com', name: 'Admin' };
const user = (id: string, extra: Record<string, unknown> = {}) => ({
  id, first_name: id.toUpperCase(), last_name: '', email: `${id}@x.com`, organizationId: ORG,
  is_internal: 1, is_active: 1, is_deleted: false, ...extra,
});
const row = (userId: string, extra: Partial<UserProjectMapping> = {}) => ({
  id: `m-${userId}`, organizationId: ORG, projectId: PROJECT.id, userId,
  status: UserProjectMappingStatus.ACTIVE, isDeleted: false, trackingId: 'TRK-1', ...extra,
}) as UserProjectMapping;

function setup() {
  const manager = {
    find: jest.fn(async (): Promise<any[]> => []),
    findOne: jest.fn(async (): Promise<any> => null),
    update: jest.fn(async () => ({})),
    save: jest.fn(async (_e: any, v: any) => v),
    create: jest.fn((_e: any, v: any) => v),
  };
  const repo = { count: jest.fn(async () => 0), find: jest.fn(async (): Promise<any[]> => []) };
  const projectRepo = { findOne: jest.fn(async (): Promise<any> => ({ ...PROJECT })) };
  const userRepo = { find: jest.fn(async (): Promise<any[]> => []) };
  const dataSource = { transaction: jest.fn(async (cb: any) => cb(manager)) };
  const tracking = {
    generateTrackingId: jest.fn(() => 'TRK-NEW'),
    record: jest.fn(async () => undefined),
    eventsFor: jest.fn(async () => []),
  };
  const logger = { log: jest.fn(), error: jest.fn() };
  const service = new UserProjectMappingService(
    repo as any, projectRepo as any, userRepo as any, dataSource as any,
    new UserProjectAccessService({} as any), logger as any, tracking as any,
  );
  jest.spyOn(service, 'findOne').mockResolvedValue({ userCount: 0 } as any);
  return { service, manager, repo, projectRepo, userRepo, tracking };
}

describe('UserProjectMappingService', () => {
  describe('create', () => {
    it('creates one ACTIVE row per user and tells them about it', async () => {
      const t = setup();
      t.userRepo.find.mockResolvedValue([user('u1'), user('u2')]);
      await t.service.create(ORG, { projectId: PROJECT.id, userIds: ['u1', 'u2'] }, ADMIN);

      expect(t.manager.save).toHaveBeenCalledTimes(2);
      expect(t.manager.save.mock.calls.map((c: any[]) => c[1])).toEqual([
        expect.objectContaining({ userId: 'u1', status: 'ACTIVE', assignedBy: 'admin@x.com' }),
        expect.objectContaining({ userId: 'u2', status: 'ACTIVE' }),
      ]);
      expect(t.tracking.record).toHaveBeenCalledWith(expect.objectContaining({
        entityType: 'PROJECT_ASSIGNMENT', entityId: PROJECT.id, action: 'ASSIGNED', trackingId: 'TRK-NEW',
        metadata: expect.objectContaining({ notifyUserIds: ['u1', 'u2'] }),
      }), t.manager);
    });

    it('revives a removed user instead of adding a second row', async () => {
      const t = setup();
      t.userRepo.find.mockResolvedValue([user('u1')]);
      t.manager.find.mockResolvedValue([row('u1', { isDeleted: true })]);
      await t.service.create(ORG, { projectId: PROJECT.id, userIds: ['u1'] }, ADMIN);

      expect(t.manager.save).not.toHaveBeenCalled();
      expect(t.manager.update).toHaveBeenCalledWith(UserProjectMapping, { id: 'm-u1' },
        expect.objectContaining({ isDeleted: false, status: 'ACTIVE' }));
    });

    it('refuses a project that already has a mapping', async () => {
      const t = setup();
      t.repo.count.mockResolvedValue(2);
      await expect(t.service.create(ORG, { projectId: PROJECT.id, userIds: ['u1'] }, ADMIN))
        .rejects.toThrow(ConflictException);
    });

    it('refuses closed projects, external users and deactivated users', async () => {
      const t = setup();
      t.projectRepo.findOne.mockResolvedValueOnce({ ...PROJECT, status: ProjectStatus.COMPLETED });
      await expect(t.service.create(ORG, { projectId: PROJECT.id, userIds: ['u1'] }, ADMIN))
        .rejects.toThrow(BadRequestException);

      t.userRepo.find.mockResolvedValueOnce([user('u1', { is_internal: 0 })]);
      await expect(t.service.create(ORG, { projectId: PROJECT.id, userIds: ['u1'] }, ADMIN))
        .rejects.toThrow('Only internal users');

      t.userRepo.find.mockResolvedValueOnce([user('u1', { is_active: 0 })]);
      await expect(t.service.create(ORG, { projectId: PROJECT.id, userIds: ['u1'] }, ADMIN))
        .rejects.toThrow('deactivated');

      t.userRepo.find.mockResolvedValueOnce([]);
      await expect(t.service.create(ORG, { projectId: PROJECT.id, userIds: ['ghost'] }, ADMIN))
        .rejects.toThrow('not found');
      expect(t.manager.save).not.toHaveBeenCalled();
    });

    it('rejects the same user twice in one request', async () => {
      const dto = plainToInstance(CreateUserProjectMappingDto, {
        projectId: '11111111-1111-4111-8111-111111111111',
        userIds: ['22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222'],
      });
      expect((await validate(dto)).map((e) => e.property)).toContain('userIds');
    });
  });

  describe('update', () => {
    it('adds the new users, removes the ones left out and keeps the rest untouched', async () => {
      const t = setup();
      t.repo.find.mockResolvedValue([row('u1'), row('u2')]);
      t.userRepo.find.mockImplementation(async () => [user('u3'), user('u2')]);
      t.manager.findOne.mockResolvedValue(row('u1'));

      await t.service.update(ORG, PROJECT.id, { userIds: ['u1', 'u3'] }, ADMIN);

      expect(t.manager.save).toHaveBeenCalledWith(UserProjectMapping, expect.objectContaining({ userId: 'u3' }));
      expect(t.manager.update).toHaveBeenCalledWith(UserProjectMapping, expect.objectContaining({ id: expect.anything() }),
        expect.objectContaining({ isDeleted: true, deletedBy: 'admin@x.com' }));
      const actions = t.tracking.record.mock.calls.map((c: any[]) => [c[0].action, c[0].metadata.notifyUserIds]);
      expect(actions).toEqual([['ASSIGNED', ['u3']], ['UNASSIGNED', ['u2']]]);
      // The existing tracking id is reused.
      expect(t.tracking.record.mock.calls.every((c: any[]) => c[0].trackingId === 'TRK-1')).toBe(true);
    });

    it('does nothing when the list did not change', async () => {
      const t = setup();
      t.repo.find.mockResolvedValue([row('u1')]);
      await t.service.update(ORG, PROJECT.id, { userIds: ['u1'] }, ADMIN);
      expect(t.manager.update).not.toHaveBeenCalled();
      expect(t.tracking.record).not.toHaveBeenCalled();
    });

    it('is not found for a project without a mapping', async () => {
      const t = setup();
      await expect(t.service.update(ORG, PROJECT.id, { userIds: ['u1'] }, ADMIN)).rejects.toThrow(NotFoundException);
    });
  });

  describe('status and delete', () => {
    it('deactivates every user at once and records the change', async () => {
      const t = setup();
      t.repo.find.mockResolvedValue([row('u1'), row('u2')]);
      await t.service.updateStatus(ORG, PROJECT.id, { status: UserProjectMappingStatus.INACTIVE }, ADMIN);

      expect(t.manager.update).toHaveBeenCalledWith(UserProjectMapping, expect.anything(),
        expect.objectContaining({ status: 'INACTIVE', deactivatedBy: 'admin@x.com' }));
      expect(t.tracking.record).toHaveBeenCalledWith(expect.objectContaining({
        action: 'STATUS_CHANGED', fromStatus: 'ACTIVE', toStatus: 'INACTIVE',
      }), t.manager);
    });

    it('refuses a status the mapping already has', async () => {
      const t = setup();
      t.repo.find.mockResolvedValue([row('u1', { status: UserProjectMappingStatus.INACTIVE })]);
      await expect(t.service.updateStatus(ORG, PROJECT.id, { status: UserProjectMappingStatus.INACTIVE }, ADMIN))
        .rejects.toThrow(ConflictException);
    });

    it('soft-deletes every row and tells the users', async () => {
      const t = setup();
      t.repo.find.mockResolvedValue([row('u1')]);
      await t.service.remove(ORG, PROJECT.id, ADMIN);
      expect(t.manager.update).toHaveBeenCalledWith(UserProjectMapping, expect.anything(),
        expect.objectContaining({ isDeleted: true }));
      expect(t.tracking.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETED' }), t.manager);
    });
  });
});

describe('UserProjectAccessService', () => {
  const count = jest.fn(async () => 0);
  const access = new UserProjectAccessService({ count } as any);
  const project = { id: 'p-1', projectManagerId: 'u-pm', createdBy: 'maker@x.com' };

  it('lets administrators and internal calls see everything', async () => {
    expect(await access.canSee(ORG, project, { userId: 'x', role: 'OrganizationAdmin' })).toBe(true);
    expect(await access.canSee(ORG, project, undefined)).toBe(true);
  });

  it('lets the project manager and the creator see the project', async () => {
    expect(await access.canSee(ORG, project, { userId: 'u-pm', role: 'Manager' })).toBe(true);
    expect(await access.canSee(ORG, project, { userId: 'u-9', email: 'MAKER@x.com', role: 'User' })).toBe(true);
  });

  it('otherwise needs an active mapping', async () => {
    expect(await access.canSee(ORG, project, { userId: 'u-1', email: 'a@x.com', role: 'User' })).toBe(false);
    count.mockResolvedValueOnce(1);
    expect(await access.canSee(ORG, project, { userId: 'u-1', email: 'a@x.com', role: 'User' })).toBe(true);
    expect(count).toHaveBeenLastCalledWith({ where: expect.objectContaining({ userId: 'u-1', status: 'ACTIVE', isDeleted: false }) });
  });

  it('reports a hidden project as not found', async () => {
    await expect(access.assertCanSee(ORG, project, { userId: 'u-1', role: 'User' })).rejects.toThrow(NotFoundException);
  });

  it('adds the visibility condition to project queries for everyone but administrators', () => {
    const qb: any = { andWhere: jest.fn(() => qb) };
    access.scope(qb, 'p', { userId: 'u-1', role: 'OrganizationAdmin' });
    expect(qb.andWhere).not.toHaveBeenCalled();
    access.scope(qb, 'p', { userId: 'u-1', email: 'a@x.com', role: 'User' });
    expect(qb.andWhere).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ viewerId: 'u-1' }));
  });
});
