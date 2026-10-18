import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { MasterCodeService, MasterSequenceKey } from 'src/common/services/master-code.service';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { WorkflowLockService } from '../workflow-tracking/workflow-lock.service';
import { Client } from '../client/entities/client.entity';
import { ClientContact } from '../client/entities/client-contact.entity';
import { ProjectType } from '../project-type/entity/project-type.entity';
import { User } from '../user/entity/user.entity';

import { ProjectService } from './project.service';
import { Project } from './entities/project.entity';
import { ProjectStatus } from './enums/project.enums';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto, UpdateProjectStatusDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';
const PROJECT_ID = '33333333-3333-4333-8333-333333333333';
const CLIENT_ID = '44444444-4444-4444-8444-444444444444';
const OTHER_CLIENT_ID = '99999999-9999-4999-8999-999999999999';
const TYPE_ID = '55555555-5555-4555-8555-555555555555';
const MANAGER_ID = '66666666-6666-4666-8666-666666666666';
const USER = 'pm@example.com';

function makeRepo(overrides: Record<string, any> = {}) {
  return {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    save: jest.fn(async (e: any) => e),
    ...overrides,
  };
}

// Chainable stand-in for the query builder used by findAll / findActive.
function makeQueryBuilder(result: [any[], number] = [[], 0], many: any[] = []) {
  const qb: any = {};
  for (const m of ['leftJoinAndSelect', 'where', 'andWhere', 'orderBy', 'addOrderBy', 'skip', 'take']) {
    qb[m] = jest.fn(() => qb);
  }
  qb.getManyAndCount = jest.fn(async () => result);
  qb.getMany = jest.fn(async () => many);
  return qb;
}

function buildHarness(lastSequence = 0) {
  const saved: any[] = [];
  const counter = { organizationId: ORG_A, lastSequence };
  const queryRunner = {
    connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(), release: jest.fn(),
    manager: {
      create: jest.fn((_e: any, v: any) => ({ id: PROJECT_ID, ...v })),
      save: jest.fn(async (entity: any, v: any) => {
        if (entity === MasterCodeCounter) { counter.lastSequence = v.lastSequence; return v; }
        saved.push(v);
        return v;
      }),
      findOne: jest.fn(async () => counter),
    },
  };
  return { saved, counter, queryRunner, dataSource: { createQueryRunner: jest.fn(() => queryRunner) } };
}

function existingProject(overrides: Partial<Project> = {}): Project {
  return {
    id: PROJECT_ID, dguid: 'p-dguid', organizationId: ORG_A, code: '0001',
    projectName: 'Unit 4 Expansion',
    clientId: CLIENT_ID,
    client: {
      id: CLIENT_ID, code: '0007', clientName: 'Gulf Petrochemical Holdings', displayName: 'GPH',
      status: 'ACTIVE', isActive: true, countryCode: 'SA', defaultCurrencyCode: 'USD',
      clientType: { name: 'Owner' }, industryCategory: { name: 'Oil & Gas' },
    } as unknown as Client,
    projectTypeId: TYPE_ID, projectType: { id: TYPE_ID, name: 'Construction' } as ProjectType,
    status: ProjectStatus.PLANNED, description: null,
    startDate: '2026-11-01', endDate: '2028-10-31',
    projectManagerId: MANAGER_ID,
    projectManager: { id: MANAGER_ID, first_name: 'Asha', last_name: 'Nair', email: 'asha@example.com' } as User,
    siteLocation: 'Jubail Plant 2', addressLine1: null, city: 'Jubail', state: null, postalCode: null,
    countryCode: 'SA', contractNumber: 'C-2026-14', clientProjectReference: null,
    currencyCode: 'USD', measurementSystem: null, timeZone: null,
    statusReason: null, statusChangedBy: null, statusChangedAt: null,
    isDeleted: false, deletedAt: null, deletedBy: null,
    createdBy: USER, updatedBy: USER,
    createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  } as Project;
}

describe('ProjectService', () => {
  let service: ProjectService;
  let projectRepo: any;
  let clientRepo: any;
  let contactRepo: any;
  let typeRepo: any;
  let userRepo: any;
  let harness: ReturnType<typeof buildHarness>;

  const build = async (lastSequence = 0) => {
    harness = buildHarness(lastSequence);
    projectRepo = makeRepo({ findOne: jest.fn(async () => existingProject()) });
    clientRepo = makeRepo({
      findOne: jest.fn(async () => ({ id: CLIENT_ID, isActive: true, isDeleted: false })),
    });
    contactRepo = makeRepo();
    typeRepo = makeRepo({ findOne: jest.fn(async () => ({ id: TYPE_ID, isActive: true })) });
    userRepo = makeRepo({
      findOne: jest.fn(async () => ({
        id: MANAGER_ID, organizationId: ORG_A, is_internal: 1, is_active: 1, is_deleted: false,
      })),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService, MasterCodeService,
        { provide: getRepositoryToken(Project),           useValue: projectRepo },
        { provide: getRepositoryToken(Client),            useValue: clientRepo },
        { provide: getRepositoryToken(ClientContact),     useValue: contactRepo },
        { provide: getRepositoryToken(ProjectType),       useValue: typeRepo },
        { provide: getRepositoryToken(User),              useValue: userRepo },
        { provide: getRepositoryToken(MasterCodeCounter), useValue: makeRepo() },
        { provide: DataSource, useValue: harness.dataSource },
        { provide: CustomLoggerService, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), verbose: jest.fn() } },
        {
          provide: WorkflowLockService,
          useValue: { assertProjectEditable: jest.fn(), assertClientEditable: jest.fn(), assertWbsEditable: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(ProjectService);
  };

  beforeEach(() => build(0));

  const base = (extra: Partial<CreateProjectDto> = {}): CreateProjectDto => ({
    projectName: 'Unit 4 Expansion', clientId: CLIENT_ID, projectTypeId: TYPE_ID,
    startDate: '2026-11-01', ...extra,
  } as CreateProjectDto);

  // ── Create ───────────────────────────────────────────────────────

  describe('create', () => {
    it('generates 0001 for the first project in an organization', async () => {
      await service.create(ORG_A, base(), USER);
      expect(harness.saved[0].code).toBe('0001');
    });

    it('continues the organization sequence and uses the PROJECT key', async () => {
      await build(41);
      await service.create(ORG_A, base(), USER);

      expect(harness.saved[0].code).toBe('0042');
      expect(harness.queryRunner.manager.findOne).toHaveBeenCalledWith(
        MasterCodeCounter,
        expect.objectContaining({ where: expect.objectContaining({ sequenceKey: MasterSequenceKey.PROJECT }) }),
      );
    });

    it('ignores a code and a client name supplied in the payload', async () => {
      await service.create(ORG_A, base({ code: '9999', clientName: 'Forged Client Ltd' } as any), USER);
      const row = harness.saved[0];

      expect(row.code).toBe('0001');
      expect(row).not.toHaveProperty('clientName');
    });

    it('stores the client by id, stamps organization and audit, and starts Planned', async () => {
      await service.create(ORG_A, base(), USER);
      const row = harness.saved[0];

      expect(row).toMatchObject({
        organizationId: ORG_A, clientId: CLIENT_ID, projectTypeId: TYPE_ID,
        status: ProjectStatus.PLANNED, createdBy: USER,
      });
      expect(row.dguid).toBeDefined();
    });

    it('honours an explicit status', async () => {
      await service.create(ORG_A, base({ status: ProjectStatus.ACTIVE }), USER);
      expect(harness.saved[0].status).toBe(ProjectStatus.ACTIVE);
    });

    it('trims text, stores blanks as null and upper-cases country and currency', async () => {
      await service.create(ORG_A, base({
        projectName: '  Unit 4 Expansion  ', siteLocation: '  Jubail Plant 2 ', city: '   ',
        countryCode: 'sa', currencyCode: 'usd',
      }), USER);
      const row = harness.saved[0];

      expect(row).toMatchObject({
        projectName: 'Unit 4 Expansion', siteLocation: 'Jubail Plant 2', city: null,
        countryCode: 'SA', currencyCode: 'USD',
      });
    });

    it('returns the client name read through the relationship', async () => {
      const result = await service.create(ORG_A, base(), USER);

      expect(result.clientName).toBe('Gulf Petrochemical Holdings');
      expect(result.clientCode).toBe('0007');
      expect(result.projectTypeName).toBe('Construction');
      expect(result.projectManagerName).toBe('Asha Nair');
    });

    describe('client', () => {
      it('is looked up inside the organization, excluding deleted clients', async () => {
        await service.create(ORG_A, base(), USER);

        expect(clientRepo.findOne).toHaveBeenCalledWith({
          where: { id: CLIENT_ID, organizationId: ORG_A, isDeleted: false },
        });
      });

      it('rejects an unknown or foreign client and creates nothing', async () => {
        clientRepo.findOne.mockResolvedValue(null);

        await expect(service.create(ORG_A, base(), USER)).rejects.toThrow('client was not found');
        expect(harness.saved).toHaveLength(0);
      });

      it('rejects an inactive client', async () => {
        clientRepo.findOne.mockResolvedValue({ id: CLIENT_ID, isActive: false });

        await expect(service.create(ORG_A, base(), USER)).rejects.toThrow('client is inactive');
        expect(harness.saved).toHaveLength(0);
      });
    });

    describe('other references', () => {
      it('rejects an unknown or inactive project type', async () => {
        typeRepo.findOne.mockResolvedValue(null);
        await expect(service.create(ORG_A, base(), USER)).rejects.toThrow('project type was not found');

        typeRepo.findOne.mockResolvedValue({ id: TYPE_ID, isActive: false });
        await expect(service.create(ORG_A, base(), USER)).rejects.toThrow('project type is inactive');
      });

      it('rejects a manager who is external, inactive, deleted or unknown', async () => {
        const manager = (extra: object) => ({
          id: MANAGER_ID, organizationId: ORG_A, is_internal: 1, is_active: 1, is_deleted: false, ...extra,
        });
        const dto = base({ projectManagerId: MANAGER_ID });

        userRepo.findOne.mockResolvedValue(manager({ is_internal: 0 }));
        await expect(service.create(ORG_A, dto, USER)).rejects.toThrow('must be an internal user');

        userRepo.findOne.mockResolvedValue(manager({ is_active: 0 }));
        await expect(service.create(ORG_A, dto, USER)).rejects.toThrow('manager is inactive');

        userRepo.findOne.mockResolvedValue(manager({ is_deleted: true }));
        await expect(service.create(ORG_A, dto, USER)).rejects.toThrow(BadRequestException);

        userRepo.findOne.mockResolvedValue(null);
        await expect(service.create(ORG_A, dto, USER)).rejects.toThrow(BadRequestException);
      });

      it('scopes the manager lookup to the organization', async () => {
        await service.create(ORG_A, base({ projectManagerId: MANAGER_ID }), USER);
        expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: MANAGER_ID, organizationId: ORG_A } });
      });

      it('does not look up a manager when none is supplied', async () => {
        await service.create(ORG_A, base(), USER);
        expect(userRepo.findOne).not.toHaveBeenCalled();
      });
    });

    describe('dates', () => {
      it('rejects an end date before the start date', async () => {
        await expect(service.create(ORG_A, base({ startDate: '2026-11-01', endDate: '2026-10-31' }), USER))
          .rejects.toThrow('later than the start date');
      });

      it('rejects an end date equal to the start date', async () => {
        await expect(service.create(ORG_A, base({ startDate: '2026-11-01', endDate: '2026-11-01' }), USER))
          .rejects.toThrow('later than the start date');
        expect(harness.saved).toHaveLength(0);
      });

      it('accepts an end date after the start date, and no end date', async () => {
        await expect(service.create(ORG_A, base({ endDate: '2026-11-02' }), USER)).resolves.toBeDefined();
        await expect(service.create(ORG_A, base({ endDate: null }), USER)).resolves.toBeDefined();
      });

      it('rejects a date that is not on the calendar', async () => {
        await expect(service.create(ORG_A, base({ startDate: '2026-02-30' }), USER))
          .rejects.toThrow('not a valid date');
      });
    });

    it('rolls back without consuming a number when the insert fails', async () => {
      harness.queryRunner.manager.save.mockRejectedValue(new Error('db down'));

      await expect(service.create(ORG_A, base(), USER)).rejects.toThrow('db down');
      expect(harness.queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(harness.queryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('surfaces a number collision as 409', async () => {
      const err: any = new Error('dup'); err.code = 'ER_DUP_ENTRY';
      harness.queryRunner.manager.save.mockRejectedValue(err);

      await expect(service.create(ORG_A, base(), USER)).rejects.toThrow(ConflictException);
    });
  });

  // ── Read ─────────────────────────────────────────────────────────

  describe('findAll', () => {
    const useQb = (result: [any[], number] = [[], 0]) => {
      const qb = makeQueryBuilder(result);
      projectRepo.createQueryBuilder = jest.fn(() => qb);
      return qb;
    };

    it('scopes to the organization and excludes deleted rows', async () => {
      const qb = useQb();
      await service.findAll(ORG_A, {} as ProjectQueryDto);

      expect(qb.where).toHaveBeenCalledWith('p.organizationId = :organizationId', { organizationId: ORG_A });
      expect(qb.andWhere).toHaveBeenCalledWith('p.isDeleted = :isDeleted', { isDeleted: false });
    });

    it('applies every filter', async () => {
      const qb = useQb();
      await service.findAll(ORG_A, {
        status: ProjectStatus.ACTIVE, clientId: CLIENT_ID, projectTypeId: TYPE_ID,
        projectManagerId: MANAGER_ID, countryCode: 'sa',
      } as ProjectQueryDto);

      expect(qb.andWhere).toHaveBeenCalledWith('p.status = :status', { status: ProjectStatus.ACTIVE });
      expect(qb.andWhere).toHaveBeenCalledWith('p.clientId = :clientId', { clientId: CLIENT_ID });
      expect(qb.andWhere).toHaveBeenCalledWith('p.projectTypeId = :projectTypeId', { projectTypeId: TYPE_ID });
      expect(qb.andWhere).toHaveBeenCalledWith('p.projectManagerId = :projectManagerId', { projectManagerId: MANAGER_ID });
      expect(qb.andWhere).toHaveBeenCalledWith('p.countryCode = :countryCode', { countryCode: 'SA' });
    });

    it('searches number, name, client code and name, contract and site, escaping wildcards', async () => {
      const qb = useQb();
      await service.findAll(ORG_A, { search: ' 50%_X ' } as ProjectQueryDto);

      const call = qb.andWhere.mock.calls.find((c: any[]) => typeof c[0] === 'string' && c[0].includes('LIKE'));
      for (const column of ['p.code', 'p.projectName', 'cl.code', 'cl.clientName', 'p.contractNumber',
        'p.clientProjectReference', 'p.siteLocation']) {
        expect(call[0]).toEqual(expect.stringContaining(column));
      }
      expect(call[1]).toEqual({ like: '%50\\%\\_x%' });
    });

    it('sorts by a whitelisted column, tie-broken by number', async () => {
      const qb = useQb();
      await service.findAll(ORG_A, { sortBy: 'client', sortOrder: 'ASC' } as ProjectQueryDto);

      expect(qb.orderBy).toHaveBeenCalledWith('cl.clientName', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('p.code', 'ASC');
    });

    it('ignores an unknown sortBy and direction instead of interpolating them', async () => {
      const qb = useQb();
      await service.findAll(ORG_A, { sortBy: 'code; DROP TABLE x', sortOrder: 'ASC; --' } as any);

      expect(qb.orderBy).toHaveBeenCalledWith('p.createdAt', 'DESC');
    });

    it('returns the envelope with names resolved', async () => {
      useQb([[existingProject()], 1]);

      const result = await service.findAll(ORG_A, { page: 1, limit: 20 } as ProjectQueryDto);

      expect(result).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 });
      expect(result.items[0]).toMatchObject({
        code: '0001', clientName: 'Gulf Petrochemical Holdings', clientCode: '0007',
        projectTypeName: 'Construction', projectManagerName: 'Asha Nair',
      });
    });
  });

  describe('findOne', () => {
    it('returns dates as plain YYYY-MM-DD strings', async () => {
      projectRepo.findOne.mockResolvedValue(existingProject({
        startDate: new Date('2026-11-01T00:00:00Z') as unknown as string,
      }));

      const result = await service.findOne(ORG_A, PROJECT_ID);

      expect(result.startDate).toBe('2026-11-01');
      expect(result.endDate).toBe('2028-10-31');
    });

    it('404s for another organization', async () => {
      projectRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(ORG_B, PROJECT_ID)).rejects.toThrow(NotFoundException);
      expect(projectRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: PROJECT_ID, organizationId: ORG_B, isDeleted: false } }),
      );
    });
  });

  describe('findActive', () => {
    it('lists only open projects', async () => {
      const qb = makeQueryBuilder([[], 0], [existingProject()]);
      projectRepo.createQueryBuilder = jest.fn(() => qb);

      const result = await service.findActive(ORG_A);

      expect(qb.andWhere).toHaveBeenCalledWith('p.status IN (:...open)', {
        open: [ProjectStatus.PLANNED, ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD],
      });
      expect(result[0]).toMatchObject({ code: '0001', clientName: 'Gulf Petrochemical Holdings', currencyCode: 'USD' });
    });
  });

  describe('findProjectManagers', () => {
    it('lists internal, active, non-deleted users of the organization', async () => {
      userRepo.find.mockResolvedValue([
        { id: MANAGER_ID, first_name: 'Asha', last_name: 'Nair', email: 'asha@example.com' },
        { id: 'u2', first_name: 'Ravi', last_name: null, email: 'ravi@example.com' },
      ]);

      const result = await service.findProjectManagers(ORG_A);

      expect(userRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { organizationId: ORG_A, is_internal: 1, is_active: 1, is_deleted: false },
      }));
      expect(result).toEqual([
        { id: MANAGER_ID, name: 'Asha Nair', email: 'asha@example.com' },
        { id: 'u2', name: 'Ravi', email: 'ravi@example.com' },
      ]);
    });
  });

  describe('getSummary', () => {
    it('returns the project with its client, schedule and the statuses it may move to', async () => {
      contactRepo.findOne.mockResolvedValue({
        contactName: 'Priya Raman', email: 'priya@gph.example', mobile: '+966 50 123 4567', phone: null,
      });

      const result = await service.getSummary(ORG_A, PROJECT_ID);

      expect(result.project.code).toBe('0001');
      expect(result.client).toMatchObject({
        code: '0007', clientName: 'Gulf Petrochemical Holdings', clientTypeName: 'Owner',
        industryCategoryName: 'Oil & Gas', defaultCurrencyCode: 'USD', primaryContactName: 'Priya Raman',
        primaryContactPhone: '+966 50 123 4567',
      });
      expect(result.allowedStatuses).toEqual([ProjectStatus.ACTIVE, ProjectStatus.CANCELLED]);
      expect(result.schedule.durationDays).toBe(731);
    });

    it('flags a project whose planned end has passed while it is still open', async () => {
      projectRepo.findOne.mockResolvedValue(existingProject({
        status: ProjectStatus.ACTIVE, startDate: '2020-01-01', endDate: '2020-06-30',
      }));

      const { schedule } = await service.getSummary(ORG_A, PROJECT_ID);

      expect(schedule.isOverdue).toBe(true);
      expect(schedule.daysToEnd).toBeLessThan(0);
    });

    it('does not flag a completed project as overdue', async () => {
      projectRepo.findOne.mockResolvedValue(existingProject({
        status: ProjectStatus.COMPLETED, startDate: '2020-01-01', endDate: '2020-06-30',
      }));

      expect((await service.getSummary(ORG_A, PROJECT_ID)).schedule.isOverdue).toBe(false);
    });
  });

  // ── Update ───────────────────────────────────────────────────────

  describe('update', () => {
    it('applies changes and stamps updatedBy', async () => {
      const project = existingProject();
      projectRepo.findOne.mockResolvedValue(project);

      await service.update(ORG_A, PROJECT_ID, { projectName: ' Unit 4 Phase 2 ', city: 'Yanbu' } as UpdateProjectDto, USER);

      expect(project.projectName).toBe('Unit 4 Phase 2');
      expect(project.city).toBe('Yanbu');
      expect(project.updatedBy).toBe(USER);
    });

    it('leaves fields that were not sent untouched, and clears one sent as null', async () => {
      const project = existingProject();
      projectRepo.findOne.mockResolvedValue(project);

      await service.update(ORG_A, PROJECT_ID, { contractNumber: null } as UpdateProjectDto, USER);

      expect(project.contractNumber).toBeNull();
      expect(project.siteLocation).toBe('Jubail Plant 2');
      expect(project.currencyCode).toBe('USD');
    });

    it('rejects a number or status change', async () => {
      await expect(service.update(ORG_A, PROJECT_ID, { code: 'X' } as any, USER)).rejects.toThrow(ConflictException);
      await expect(service.update(ORG_A, PROJECT_ID, { status: 'ACTIVE' } as any, USER)).rejects.toThrow(ConflictException);
    });

    it('checks the end date against the stored start date', async () => {
      projectRepo.findOne.mockResolvedValue(existingProject({ startDate: '2026-11-01' }));

      await expect(service.update(ORG_A, PROJECT_ID, { endDate: '2026-01-01' } as UpdateProjectDto, USER))
        .rejects.toThrow('later than the start date');
      await expect(service.update(ORG_A, PROJECT_ID, { endDate: '2026-11-01' } as UpdateProjectDto, USER))
        .rejects.toThrow('later than the start date');
    });

    it('checks a moved start date against the stored end date', async () => {
      projectRepo.findOne.mockResolvedValue(existingProject({ endDate: '2027-01-01' }));

      await expect(service.update(ORG_A, PROJECT_ID, { startDate: '2027-06-01' } as UpdateProjectDto, USER))
        .rejects.toThrow('later than the start date');
    });

    it('requires a changed client to be active, but lets an unchanged one stay', async () => {
      clientRepo.findOne.mockResolvedValue({ id: OTHER_CLIENT_ID, isActive: false });
      projectRepo.findOne.mockResolvedValue(existingProject());

      await expect(service.update(ORG_A, PROJECT_ID, { clientId: OTHER_CLIENT_ID } as UpdateProjectDto, USER))
        .rejects.toThrow('client is inactive');

      clientRepo.findOne.mockClear();
      await service.update(ORG_A, PROJECT_ID, { clientId: CLIENT_ID, notes: undefined } as any, USER);
      expect(clientRepo.findOne).not.toHaveBeenCalled();
    });

    it('404s for an unknown project and refuses a cross-organization update', async () => {
      projectRepo.findOne.mockResolvedValue(null);

      await expect(service.update(ORG_B, PROJECT_ID, { city: 'x' } as UpdateProjectDto, USER))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── Status ───────────────────────────────────────────────────────

  describe('updateStatus', () => {
    const change = (status: ProjectStatus, reason?: string) =>
      ({ status, reason } as UpdateProjectStatusDto);

    it('moves a planned project to active, recording who, when and why', async () => {
      const project = existingProject();
      projectRepo.findOne.mockResolvedValue(project);

      await service.updateStatus(ORG_A, PROJECT_ID, change(ProjectStatus.ACTIVE, ' Kick-off held '), USER);

      expect(project).toMatchObject({
        status: ProjectStatus.ACTIVE, statusReason: 'Kick-off held', statusChangedBy: USER, updatedBy: USER,
      });
      expect(project.statusChangedAt).toBeInstanceOf(Date);
    });

    it.each([
      [ProjectStatus.PLANNED,   ProjectStatus.ACTIVE],
      [ProjectStatus.PLANNED,   ProjectStatus.CANCELLED],
      [ProjectStatus.ACTIVE,    ProjectStatus.ON_HOLD],
      [ProjectStatus.ACTIVE,    ProjectStatus.COMPLETED],
      [ProjectStatus.ON_HOLD,   ProjectStatus.ACTIVE],
      [ProjectStatus.COMPLETED, ProjectStatus.ACTIVE],
      [ProjectStatus.CANCELLED, ProjectStatus.PLANNED],
    ])('allows %s → %s', async (from, to) => {
      projectRepo.findOne.mockResolvedValue(existingProject({ status: from }));
      await expect(service.updateStatus(ORG_A, PROJECT_ID, change(to), USER)).resolves.toBeDefined();
    });

    it.each([
      [ProjectStatus.PLANNED,   ProjectStatus.COMPLETED],
      [ProjectStatus.PLANNED,   ProjectStatus.ON_HOLD],
      [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
      [ProjectStatus.CANCELLED, ProjectStatus.ACTIVE],
    ])('refuses %s → %s and names what is allowed', async (from, to) => {
      projectRepo.findOne.mockResolvedValue(existingProject({ status: from }));

      await expect(service.updateStatus(ORG_A, PROJECT_ID, change(to), USER))
        .rejects.toThrow(/It can become:/);
    });

    it('refuses a change to the status the project already has', async () => {
      projectRepo.findOne.mockResolvedValue(existingProject({ status: ProjectStatus.ACTIVE }));

      await expect(service.updateStatus(ORG_A, PROJECT_ID, change(ProjectStatus.ACTIVE), USER))
        .rejects.toThrow('already active');
    });

    it('will not start a project whose client has since been deactivated', async () => {
      projectRepo.findOne.mockResolvedValue(existingProject());
      clientRepo.findOne.mockResolvedValue({ id: CLIENT_ID, isActive: false });

      await expect(service.updateStatus(ORG_A, PROJECT_ID, change(ProjectStatus.ACTIVE), USER))
        .rejects.toThrow('client is inactive');
      expect(projectRepo.save).not.toHaveBeenCalled();
    });

    it('does not check the client for other transitions', async () => {
      projectRepo.findOne.mockResolvedValue(existingProject());
      clientRepo.findOne.mockResolvedValue({ id: CLIENT_ID, isActive: false });

      await expect(service.updateStatus(ORG_A, PROJECT_ID, change(ProjectStatus.CANCELLED), USER))
        .resolves.toBeDefined();
    });
  });

  // ── Delete ───────────────────────────────────────────────────────

  describe('remove', () => {
    it('soft-deletes a planned project', async () => {
      const project = existingProject();
      projectRepo.findOne.mockResolvedValue(project);

      await service.remove(ORG_A, PROJECT_ID, USER);

      expect(project).toMatchObject({ isDeleted: true, deletedBy: USER });
      expect(project.deletedAt).toBeInstanceOf(Date);
    });

    it.each([ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED])(
      'refuses to delete a %s project',
      async (status) => {
        projectRepo.findOne.mockResolvedValue(existingProject({ status }));

        await expect(service.remove(ORG_A, PROJECT_ID, USER)).rejects.toThrow(ConflictException);
        expect(projectRepo.save).not.toHaveBeenCalled();
      },
    );

    it('404s for an already-deleted project', async () => {
      projectRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(ORG_A, PROJECT_ID, USER)).rejects.toThrow(NotFoundException);
    });
  });

  // ── DTO contract ─────────────────────────────────────────────────

  describe('CreateProjectDto', () => {
    const errorsFor = async (payload: object, options = {}) =>
      (await validate(plainToInstance(CreateProjectDto, payload), options)).map((e) => e.property);

    const valid = { projectName: 'Unit 4', clientId: CLIENT_ID, projectTypeId: TYPE_ID, startDate: '2026-11-01' };

    it('validates with only the required fields', async () => {
      expect(await errorsFor(valid)).toEqual([]);
    });

    it('requires name, client, project type and start date', async () => {
      expect(await errorsFor({})).toEqual(
        expect.arrayContaining(['projectName', 'clientId', 'projectTypeId', 'startDate']),
      );
    });

    it('rejects an id that is not a UUID and a malformed date', async () => {
      const props = await errorsFor({ ...valid, clientId: 'GPH', startDate: '01/11/2026', endDate: 'soon' });
      expect(props).toEqual(expect.arrayContaining(['clientId', 'startDate', 'endDate']));
    });

    it('validates country, currency and measurement system', async () => {
      const props = await errorsFor({
        ...valid, countryCode: 'KSA', currencyCode: 'DOLLAR', measurementSystem: 'FURLONGS',
      });
      expect(props).toEqual(expect.arrayContaining(['countryCode', 'currencyCode', 'measurementSystem']));
    });

    it('upper-cases country and currency before validating', async () => {
      const dto = plainToInstance(CreateProjectDto, { ...valid, countryCode: 'sa', currencyCode: 'usd' });
      expect(dto.countryCode).toBe('SA');
      expect(dto.currencyCode).toBe('USD');
      expect(await validate(dto)).toHaveLength(0);
    });

    it('has no code or client name field', async () => {
      const props = await errorsFor({ ...valid, code: '0001', clientName: 'X' },
        { whitelist: true, forbidNonWhitelisted: true });
      expect(props).toEqual(expect.arrayContaining(['code', 'clientName']));
    });

    it('accepts null on optional fields so they can be cleared', async () => {
      expect(await errorsFor({
        ...valid, endDate: null, projectManagerId: null, description: null, countryCode: null,
      })).toEqual([]);
    });
  });

  describe('UpdateProjectDto / UpdateProjectStatusDto / ProjectQueryDto', () => {
    it('does not accept a status in a general update', async () => {
      const dto = plainToInstance(UpdateProjectDto, { status: 'ACTIVE' });
      const props = (await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).map((e) => e.property);
      expect(props).toContain('status');
    });

    it('requires a valid status for a status change', async () => {
      const dto = plainToInstance(UpdateProjectStatusDto, { status: 'FINISHED' });
      expect((await validate(dto)).map((e) => e.property)).toContain('status');
    });

    it('only accepts ASC or DESC as the sort direction', async () => {
      const dto = plainToInstance(ProjectQueryDto, { sortOrder: 'ASC; DROP' });
      expect((await validate(dto)).map((e) => e.property)).toContain('sortOrder');
    });
  });
});
