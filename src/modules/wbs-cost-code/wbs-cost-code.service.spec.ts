import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { MasterCodeService, MasterSequenceKey } from 'src/common/services/master-code.service';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { Discipline } from '../discipline/entity/discipline.entity';
import { Project } from '../project/entities/project.entity';

import { WbsCostCodeService } from './wbs-cost-code.service';
import { WbsCostCode } from './entity/wbs-cost-code.entity';
import { CreateWbsCostCodeDto } from './dto/create-wbs-cost-code.dto';
import { WbsCostCodeQueryDto } from './dto/wbs-cost-code-query.dto';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';
const ROW_ID = '33333333-3333-4333-8333-333333333333';
const DISC_ID = '44444444-4444-4444-8444-444444444444';
const PROJECT_ID = '77777777-7777-4777-8777-777777777777';
const USER = 'admin@example.com';

function makeRepo(overrides: Record<string, any> = {}) {
  return {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    save: jest.fn(async (e: any) => e),
    create: jest.fn((e: any) => e),
    ...overrides,
  };
}

// Chainable stand-in for the query builder used by findAll.
function makeQueryBuilder(result: [any[], number] = [[], 0]) {
  const qb: any = {};
  for (const m of ['leftJoinAndSelect', 'where', 'andWhere', 'orderBy', 'addOrderBy', 'skip', 'take']) {
    qb[m] = jest.fn(() => qb);
  }
  qb.getManyAndCount = jest.fn(async () => result);
  return qb;
}

function buildHarness(lastSequence = 0) {
  const saved: any[] = [];
  const counter = { organizationId: ORG_A, lastSequence };
  const queryRunner = {
    connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(), release: jest.fn(),
    manager: {
      create:  jest.fn((_e: any, v: any) => ({ id: ROW_ID, ...v })),
      save:    jest.fn(async (entity: any, v: any) => {
        if (entity === MasterCodeCounter) { counter.lastSequence = v.lastSequence; return v; }
        saved.push(v);
        return v;
      }),
      findOne: jest.fn(async () => counter),
    },
  };
  return { saved, counter, queryRunner, dataSource: { createQueryRunner: jest.fn(() => queryRunner) } };
}

function existingRow(overrides: Partial<WbsCostCode> = {}): WbsCostCode {
  return {
    id: ROW_ID, dguid: 'wcc-dguid', organizationId: ORG_A, code: '0001',
    projectDetails: 'Unit 100 civil works',
    areaFacility: 'Process Area 1', systemSubsystem: 'Cooling Water',
    projectId: PROJECT_ID,
    project: {
      id: PROJECT_ID, code: '0042', projectName: 'Unit 4 Expansion', clientId: 'cl-1',
      client: { code: '0007', clientName: 'Gulf Petrochemical Holdings' },
    } as unknown as Project,
    disciplineId: DISC_ID,
    discipline: { id: DISC_ID, name: 'Civil', code: '0003', department: { name: 'Engineering' } } as unknown as Discipline,
    workPackage: 'WP-110', activities: 'Excavation, rebar, pour',
    isActive: true, isDeleted: false, deletedAt: null, deletedBy: null,
    createdBy: USER, updatedBy: USER,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  } as WbsCostCode;
}

describe('WbsCostCodeService', () => {
  let service: WbsCostCodeService;
  let repo: any;
  let discRepo: any;
  let projectRepo: any;
  let harness: ReturnType<typeof buildHarness>;

  const build = async (lastSequence = 0) => {
    harness = buildHarness(lastSequence);
    repo = makeRepo();
    discRepo = makeRepo({
      findOne: jest.fn(async () => ({ id: DISC_ID, organizationId: ORG_A, isActive: true, isDeleted: false })),
    });
    projectRepo = makeRepo({
      findOne: jest.fn(async () => ({ id: PROJECT_ID, organizationId: ORG_A, status: 'ACTIVE', isDeleted: false })),
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WbsCostCodeService, MasterCodeService,
        { provide: getRepositoryToken(WbsCostCode),        useValue: repo },
        { provide: getRepositoryToken(Discipline),         useValue: discRepo },
        { provide: getRepositoryToken(Project),            useValue: projectRepo },
        { provide: getRepositoryToken(MasterCodeCounter),  useValue: makeRepo() },
        { provide: DataSource, useValue: harness.dataSource },
        { provide: CustomLoggerService, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), verbose: jest.fn() } },
      ],
    }).compile();
    service = module.get(WbsCostCodeService);
  };

  beforeEach(async () => {
    await build(0);
    // create() re-reads the saved row to return the discipline name.
    repo.findOne.mockResolvedValue(existingRow());
  });

  // ── Create ───────────────────────────────────────────────────────

  describe('create', () => {
    it('generates 0001 for the first WBS / cost code in an organization', async () => {
      await service.create(ORG_A, { projectDetails: 'Unit 100' } as CreateWbsCostCodeDto, USER);
      expect(harness.saved[0].code).toBe('0001');
    });

    it('continues the organization sequence', async () => {
      await build(7);
      repo.findOne.mockResolvedValue(existingRow());
      await service.create(ORG_A, { projectDetails: 'Unit 200' } as CreateWbsCostCodeDto, USER);
      expect(harness.saved[0].code).toBe('0008');
    });

    it('uses the WBS_COST_CODE sequence key', async () => {
      await service.create(ORG_A, { projectDetails: 'Unit 100' } as CreateWbsCostCodeDto, USER);
      expect(harness.queryRunner.manager.findOne).toHaveBeenCalledWith(
        MasterCodeCounter,
        expect.objectContaining({
          where: expect.objectContaining({ sequenceKey: MasterSequenceKey.WBS_COST_CODE }),
        }),
      );
    });

    it('ignores a code supplied in the payload', async () => {
      await service.create(ORG_A, { projectDetails: 'Unit 100', code: 'X-1' } as any, USER);
      expect(harness.saved[0].code).toBe('0001');
    });

    it('stamps organization, audit and defaults', async () => {
      await service.create(ORG_A, { projectDetails: 'Unit 100' } as CreateWbsCostCodeDto, USER);
      const row = harness.saved[0];

      expect(row.organizationId).toBe(ORG_A);
      expect(row.createdBy).toBe(USER);
      expect(row.dguid).toBeDefined();
      expect(row.isActive).toBe(true);
    });

    it('trims text and stores blank optional fields as null', async () => {
      await service.create(ORG_A, {
        projectDetails: '  Unit 100  ', areaFacility: '   ', workPackage: ' WP-1 ',
      } as CreateWbsCostCodeDto, USER);
      const row = harness.saved[0];

      expect(row.projectDetails).toBe('Unit 100');
      expect(row.areaFacility).toBeNull();
      expect(row.workPackage).toBe('WP-1');
    });

    it('checks the discipline belongs to the organization, is not deleted and is active', async () => {
      await service.create(ORG_A, { projectDetails: 'Unit 100', disciplineId: DISC_ID } as CreateWbsCostCodeDto, USER);

      expect(discRepo.findOne).toHaveBeenCalledWith({
        where: { id: DISC_ID, organizationId: ORG_A, isDeleted: false },
      });
      expect(harness.saved[0].disciplineId).toBe(DISC_ID);
    });

    it('rejects an unknown or cross-organization discipline with 400 and creates nothing', async () => {
      discRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(ORG_A, { projectDetails: 'Unit 100', disciplineId: DISC_ID } as CreateWbsCostCodeDto, USER),
      ).rejects.toThrow(BadRequestException);
      expect(harness.saved).toHaveLength(0);
    });

    it('rejects an inactive discipline', async () => {
      discRepo.findOne.mockResolvedValue({ id: DISC_ID, isActive: false });

      await expect(
        service.create(ORG_A, { projectDetails: 'Unit 100', disciplineId: DISC_ID } as CreateWbsCostCodeDto, USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not look up a discipline when none is supplied', async () => {
      await service.create(ORG_A, { projectDetails: 'Unit 100' } as CreateWbsCostCodeDto, USER);
      expect(discRepo.findOne).not.toHaveBeenCalled();
    });

    it('returns the discipline name', async () => {
      const result = await service.create(
        ORG_A, { projectDetails: 'Unit 100', disciplineId: DISC_ID } as CreateWbsCostCodeDto, USER,
      );
      expect(result.disciplineName).toBe('Civil');
      expect(result.discipline).toEqual({ id: DISC_ID, name: 'Civil', code: '0003' });
    });

    describe('project', () => {
      it('maps the entry to a project of this organization', async () => {
        await service.create(
          ORG_A, { projectDetails: 'Unit 100', projectId: PROJECT_ID } as CreateWbsCostCodeDto, USER,
        );

        expect(projectRepo.findOne).toHaveBeenCalledWith({
          where: { id: PROJECT_ID, organizationId: ORG_A, isDeleted: false },
        });
        expect(harness.saved[0].projectId).toBe(PROJECT_ID);
      });

      it('rejects an unknown or foreign project and creates nothing', async () => {
        projectRepo.findOne.mockResolvedValue(null);

        await expect(service.create(
          ORG_A, { projectDetails: 'Unit 100', projectId: PROJECT_ID } as CreateWbsCostCodeDto, USER,
        )).rejects.toThrow('project was not found');
        expect(harness.saved).toHaveLength(0);
      });

      it.each(['COMPLETED', 'CANCELLED'])('rejects a %s project', async (status) => {
        projectRepo.findOne.mockResolvedValue({ id: PROJECT_ID, status });

        await expect(service.create(
          ORG_A, { projectDetails: 'Unit 100', projectId: PROJECT_ID } as CreateWbsCostCodeDto, USER,
        )).rejects.toThrow('project is closed');
      });

      it('returns the project, its client and the discipline\'s department read from the relationships', async () => {
        const result = await service.create(
          ORG_A, { projectDetails: 'Unit 100', projectId: PROJECT_ID } as CreateWbsCostCodeDto, USER,
        );

        expect(result).toMatchObject({
          projectId: PROJECT_ID, projectCode: '0042', projectName: 'Unit 4 Expansion',
          clientCode: '0007', clientName: 'Gulf Petrochemical Holdings', departmentName: 'Engineering',
        });
      });
    });

    it('rolls back without consuming a number when the insert fails', async () => {
      harness.queryRunner.manager.save.mockRejectedValue(new Error('db down'));

      await expect(
        service.create(ORG_A, { projectDetails: 'Unit 100' } as CreateWbsCostCodeDto, USER),
      ).rejects.toThrow('db down');
      expect(harness.queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(harness.queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(harness.queryRunner.release).toHaveBeenCalled();
    });

    it('surfaces a code collision as 409', async () => {
      const err: any = new Error('dup'); err.code = 'ER_DUP_ENTRY';
      harness.queryRunner.manager.save.mockRejectedValue(err);

      await expect(
        service.create(ORG_A, { projectDetails: 'Unit 100' } as CreateWbsCostCodeDto, USER),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── Read ─────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('scopes to the organization and excludes deleted rows', async () => {
      const qb = makeQueryBuilder();
      repo.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(ORG_A, {} as any);

      expect(qb.where).toHaveBeenCalledWith('w.organizationId = :organizationId', { organizationId: ORG_A });
      expect(qb.andWhere).toHaveBeenCalledWith('w.isDeleted = :isDeleted', { isDeleted: false });
    });

    it('returns the items/total/page/limit/totalPages envelope with discipline names', async () => {
      repo.createQueryBuilder = jest.fn(() => makeQueryBuilder([[existingRow()], 1]));

      const result = await service.findAll(ORG_A, { page: 1, limit: 20 } as any);

      expect(result).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 });
      expect(result.items[0]).toMatchObject({ code: '0001', disciplineName: 'Civil' });
    });

    it('applies status and discipline filters', async () => {
      const qb = makeQueryBuilder();
      repo.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(ORG_A, { isActive: false, disciplineId: DISC_ID } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('w.isActive = :isActive', { isActive: false });
      expect(qb.andWhere).toHaveBeenCalledWith('w.disciplineId = :disciplineId', { disciplineId: DISC_ID });
    });

    it('searches across the text fields and discipline name, escaping wildcards', async () => {
      const qb = makeQueryBuilder();
      repo.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(ORG_A, { search: ' 50%_X ' } as any);

      const call = qb.andWhere.mock.calls.find((c: any[]) => typeof c[0] === 'string' && c[0].includes('LIKE'));
      expect(call[0]).toEqual(expect.stringContaining('w.projectDetails'));
      expect(call[0]).toEqual(expect.stringContaining('w.areaFacility'));
      expect(call[0]).toEqual(expect.stringContaining('w.systemSubsystem'));
      expect(call[0]).toEqual(expect.stringContaining('w.workPackage'));
      expect(call[0]).toEqual(expect.stringContaining('w.activities'));
      expect(call[0]).toEqual(expect.stringContaining('disc.name'));
      expect(call[1]).toEqual({ like: '%50\\%\\_x%' });
    });

    it('sorts by a whitelisted column, with code as the tie-breaker', async () => {
      const qb = makeQueryBuilder();
      repo.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(ORG_A, { sortBy: 'discipline', sortOrder: 'DESC' } as any);

      expect(qb.orderBy).toHaveBeenCalledWith('disc.name', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('w.code', 'ASC');
    });

    it('ignores an unknown sortBy and an unknown direction instead of interpolating them', async () => {
      const qb = makeQueryBuilder();
      repo.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(ORG_A, { sortBy: 'code; DROP TABLE wbs_cost_codes', sortOrder: 'ASC; --' } as any);

      expect(qb.orderBy).toHaveBeenCalledWith('w.code', 'ASC');
    });

    it('paginates', async () => {
      const qb = makeQueryBuilder();
      repo.createQueryBuilder = jest.fn(() => qb);

      await service.findAll(ORG_A, { page: 3, limit: 10 } as any);

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });
  });

  describe('findOne', () => {
    it('returns the WBS / cost code', async () => {
      const result = await service.findOne(ORG_A, ROW_ID);

      expect(result.id).toBe(ROW_ID);
      expect(result.projectDetails).toBe('Unit 100 civil works');
    });

    it('404s for another organization', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne(ORG_B, ROW_ID)).rejects.toThrow(NotFoundException);
      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: ORG_B }) }),
      );
    });

    it('returns null discipline fields when the row has no discipline', async () => {
      repo.findOne.mockResolvedValue(existingRow({ disciplineId: null, discipline: null }));

      const result = await service.findOne(ORG_A, ROW_ID);

      expect(result.disciplineId).toBeNull();
      expect(result.disciplineName).toBeNull();
      expect(result.discipline).toBeNull();
    });
  });

  describe('findActive', () => {
    it('returns only active, non-deleted rows ordered by code', async () => {
      await service.findActive(ORG_A);

      expect(repo.find).toHaveBeenCalledWith({
        where: { organizationId: ORG_A, isActive: true, isDeleted: false },
        relations: { discipline: { department: true }, project: { client: true } },
        order: { code: 'ASC' },
      });
    });
  });

  // ── Update ───────────────────────────────────────────────────────

  describe('update', () => {
    it('applies changes and stamps updatedBy', async () => {
      const row = existingRow();
      repo.findOne.mockResolvedValue(row);

      await service.update(ORG_A, ROW_ID, { projectDetails: ' Unit 100 rev B ', workPackage: 'WP-120' } as any, USER);

      expect(row.projectDetails).toBe('Unit 100 rev B');
      expect(row.workPackage).toBe('WP-120');
      expect(row.updatedBy).toBe(USER);
      expect(repo.save).toHaveBeenCalledWith(row);
    });

    it('clears an optional field when null is sent, and leaves omitted ones alone', async () => {
      const row = existingRow();
      repo.findOne.mockResolvedValue(row);

      await service.update(ORG_A, ROW_ID, { areaFacility: null, disciplineId: null } as any, USER);

      expect(row.areaFacility).toBeNull();
      expect(row.disciplineId).toBeNull();
      expect(row.systemSubsystem).toBe('Cooling Water');
      expect(row.workPackage).toBe('WP-110');
    });

    it('validates a changed discipline but not an unchanged one', async () => {
      const other = '55555555-5555-4555-8555-555555555555';
      repo.findOne.mockResolvedValue(existingRow());

      await service.update(ORG_A, ROW_ID, { disciplineId: DISC_ID } as any, USER);
      expect(discRepo.findOne).not.toHaveBeenCalled();

      await service.update(ORG_A, ROW_ID, { disciplineId: other } as any, USER);
      expect(discRepo.findOne).toHaveBeenCalledWith({
        where: { id: other, organizationId: ORG_A, isDeleted: false },
      });
    });

    it('validates a changed project but not an unchanged one', async () => {
      const other = '88888888-8888-4888-8888-888888888888';
      repo.findOne.mockResolvedValue(existingRow());

      await service.update(ORG_A, ROW_ID, { projectId: PROJECT_ID } as any, USER);
      expect(projectRepo.findOne).not.toHaveBeenCalled();

      await service.update(ORG_A, ROW_ID, { projectId: other } as any, USER);
      expect(projectRepo.findOne).toHaveBeenCalledWith({
        where: { id: other, organizationId: ORG_A, isDeleted: false },
      });
    });

    it('rejects a changed project that is closed, and saves nothing', async () => {
      repo.findOne.mockResolvedValue(existingRow());
      projectRepo.findOne.mockResolvedValue({ id: 'x', status: 'COMPLETED' });

      await expect(
        service.update(ORG_A, ROW_ID, { projectId: '88888888-8888-4888-8888-888888888888' } as any, USER),
      ).rejects.toThrow(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects a changed discipline that is not selectable, and saves nothing', async () => {
      repo.findOne.mockResolvedValue(existingRow());
      discRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(ORG_A, ROW_ID, { disciplineId: '55555555-5555-4555-8555-555555555555' } as any, USER),
      ).rejects.toThrow(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects an attempt to change the server-generated code', async () => {
      await expect(
        service.update(ORG_A, ROW_ID, { code: 'HACKED' } as any, USER),
      ).rejects.toThrow(ConflictException);
    });

    it('404s for an unknown WBS / cost code', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update(ORG_A, ROW_ID, {} as any, USER)).rejects.toThrow(NotFoundException);
    });

    it('refuses a cross-organization update', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update(ORG_B, ROW_ID, { workPackage: 'x' } as any, USER))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── Delete ───────────────────────────────────────────────────────

  describe('remove', () => {
    it('soft-deletes and deactivates', async () => {
      const row = existingRow();
      repo.findOne.mockResolvedValue(row);

      await service.remove(ORG_A, ROW_ID, USER);

      expect(row.isDeleted).toBe(true);
      expect(row.isActive).toBe(false);
      expect(row.deletedBy).toBe(USER);
      expect(row.deletedAt).toBeInstanceOf(Date);
    });

    it('404s for an already-deleted row', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(ORG_A, ROW_ID, USER)).rejects.toThrow(NotFoundException);
    });

    it('refuses a cross-organization delete', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(ORG_B, ROW_ID, USER)).rejects.toThrow(NotFoundException);
    });
  });

  // ── DTO contract ─────────────────────────────────────────────────

  describe('CreateWbsCostCodeDto', () => {
    it('validates with only the project details', async () => {
      const dto = plainToInstance(CreateWbsCostCodeDto, { projectDetails: 'Unit 100', projectId: PROJECT_ID });
      expect(await validate(dto, { whitelist: true })).toHaveLength(0);
    });

    it('validates with every field', async () => {
      const dto = plainToInstance(CreateWbsCostCodeDto, {
        projectDetails: 'Unit 100', projectId: PROJECT_ID, areaFacility: 'Area 1', systemSubsystem: 'CW',
        disciplineId: DISC_ID, workPackage: 'WP-1', activities: 'a, b', isActive: false,
      });
      expect(await validate(dto, { whitelist: true })).toHaveLength(0);
    });

    it('accepts null on optional fields so they can be cleared', async () => {
      const dto = plainToInstance(CreateWbsCostCodeDto, {
        projectDetails: 'Unit 100', projectId: PROJECT_ID, areaFacility: null, disciplineId: null, activities: null,
      });
      expect(await validate(dto)).toHaveLength(0);
    });

    it('requires the WBS / cost name and the project', async () => {
      const dto = plainToInstance(CreateWbsCostCodeDto, {});
      const props = (await validate(dto)).map(e => e.property);
      expect(props).toContain('projectDetails');
      expect(props).toContain('projectId');
    });

    it('rejects a project id that is not a UUID', async () => {
      const dto = plainToInstance(CreateWbsCostCodeDto, { projectDetails: 'Unit 100', projectId: 'p1' });
      expect((await validate(dto)).map(e => e.property)).toContain('projectId');
    });

    it('rejects an over-long field', async () => {
      const dto = plainToInstance(CreateWbsCostCodeDto, { projectDetails: 'x'.repeat(256) });
      expect((await validate(dto)).map(e => e.property)).toContain('projectDetails');
    });

    it('rejects a discipline id that is not a UUID', async () => {
      const dto = plainToInstance(CreateWbsCostCodeDto, { projectDetails: 'Unit 100', disciplineId: 'civil' });
      expect((await validate(dto)).map(e => e.property)).toContain('disciplineId');
    });

    it('rejects a supplied code as non-whitelisted', async () => {
      const dto = plainToInstance(CreateWbsCostCodeDto, { projectDetails: 'Unit 100', code: 'X' });
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      expect(errors.map(e => e.property)).toContain('code');
    });
  });

  describe('WbsCostCodeQueryDto', () => {
    it('only accepts ASC or DESC as the sort direction', async () => {
      const dto = plainToInstance(WbsCostCodeQueryDto, { sortOrder: 'ASC; DROP' });
      expect((await validate(dto)).map(e => e.property)).toContain('sortOrder');
    });
  });
});
