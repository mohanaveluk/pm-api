import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConflictException } from '@nestjs/common';

import { MasterCodeService, MasterSequenceKey } from 'src/common/services/master-code.service';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';

import { DepartmentService } from './department.service';
import { Department }        from './entity/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';

import { DisciplineService } from '../discipline/discipline.service';
import { Discipline }        from '../discipline/entity/discipline.entity';
import { CreateDisciplineDto } from '../discipline/dto/create-discipline.dto';

import { ActivityService } from '../activity/activity.service';
import { Activity }        from '../activity/entities/activity.entity';
import { DepartmentDiscipline } from '../department-discipline/entities/department-discipline.entity';
import { CreateActivityDto, BulkCreateActivityDto } from '../activity/dto/create-activity.dto';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const DEPT_ID = '22222222-2222-4222-8222-222222222222';
const DISC_ID = '33333333-3333-4333-8333-333333333333';
const MAP_ID  = '44444444-4444-4444-8444-444444444444';
const USER = 'admin@example.com';

function makeRepo(overrides: Record<string, any> = {}) {
  return {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    findAndCount: jest.fn(async () => [[], 0]),
    save: jest.fn(async (e: any) => e),
    create: jest.fn((e: any) => e),
    count: jest.fn(async () => 0),
    createQueryBuilder: jest.fn(),
    ...overrides,
  };
}

// Query runner whose counter starts at `lastSequence`, plus a capture of the
// non-counter rows the service saved.
function buildHarness(lastSequence = 0) {
  const saved: any[] = [];
  const counter = { organizationId: ORG_A, lastSequence };
  const queryRunner = {
    connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(), release: jest.fn(),
    manager: {
      create:  jest.fn((_e: any, v: any) => v),
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

describe('Server-generated codes: Department, Discipline, Activity', () => {
  // ── Department ───────────────────────────────────────────────────

  describe('DepartmentService.create', () => {
    let service: DepartmentService;
    let harness: ReturnType<typeof buildHarness>;
    let repo: any;

    const build = async (lastSequence = 0) => {
      harness = buildHarness(lastSequence);
      repo = makeRepo();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DepartmentService, MasterCodeService,
          { provide: getRepositoryToken(Department),        useValue: repo },
          { provide: getRepositoryToken(MasterCodeCounter), useValue: makeRepo() },
          { provide: DataSource, useValue: harness.dataSource },
        ],
      }).compile();
      service = module.get(DepartmentService);
    };

    it('generates 0001 for the first department', async () => {
      await build(0);
      await service.create(ORG_A, { name: 'Engineering' } as CreateDepartmentDto, USER);
      expect(harness.saved[0].code).toBe('0001');
    });

    it('continues the organization sequence', async () => {
      await build(11);
      await service.create(ORG_A, { name: 'Procurement' } as CreateDepartmentDto, USER);
      expect(harness.saved[0].code).toBe('0012');
    });

    it('ignores a code supplied in the payload', async () => {
      await build(0);
      await service.create(ORG_A, { name: 'Engineering', code: 'ENG' } as any, USER);
      expect(harness.saved[0].code).toBe('0001');
    });

    it('uses the DEPARTMENT sequence key', async () => {
      await build(0);
      await service.create(ORG_A, { name: 'Engineering' } as CreateDepartmentDto, USER);
      expect(harness.queryRunner.manager.findOne).toHaveBeenCalledWith(
        MasterCodeCounter,
        expect.objectContaining({
          where: expect.objectContaining({ sequenceKey: MasterSequenceKey.DEPARTMENT }),
        }),
      );
    });

    it('rolls back without consuming a number when the insert fails', async () => {
      await build(0);
      harness.queryRunner.manager.save.mockRejectedValue(new Error('db down'));

      await expect(
        service.create(ORG_A, { name: 'Engineering' } as CreateDepartmentDto, USER),
      ).rejects.toThrow('db down');
      expect(harness.queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(harness.queryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('surfaces a code collision as 409', async () => {
      await build(0);
      const err: any = new Error('dup'); err.code = 'ER_DUP_ENTRY';
      harness.queryRunner.manager.save.mockRejectedValue(err);

      await expect(
        service.create(ORG_A, { name: 'Engineering' } as CreateDepartmentDto, USER),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects an attempt to change the code on update', async () => {
      await build(0);
      repo.findOne.mockResolvedValue({ id: DEPT_ID, organizationId: ORG_A, code: '0001', isDeleted: false });

      await expect(
        service.update(ORG_A, DEPT_ID, { code: 'HACKED' } as any, USER),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── Discipline ───────────────────────────────────────────────────

  describe('DisciplineService.create', () => {
    const build = async (lastSequence = 0) => {
      const harness = buildHarness(lastSequence);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DisciplineService, MasterCodeService,
          { provide: getRepositoryToken(Discipline),        useValue: makeRepo() },
          { provide: getRepositoryToken(MasterCodeCounter), useValue: makeRepo() },
          { provide: DataSource, useValue: harness.dataSource },
        ],
      }).compile();
      return { service: module.get(DisciplineService), harness };
    };

    it('generates 0001 for the first discipline', async () => {
      const { service, harness } = await build(0);
      await service.create(ORG_A, { name: 'Piping' } as CreateDisciplineDto, USER);
      expect(harness.saved[0].code).toBe('0001');
    });

    it('continues the organization sequence', async () => {
      const { service, harness } = await build(4);
      await service.create(ORG_A, { name: 'Welding' } as CreateDisciplineDto, USER);
      expect(harness.saved[0].code).toBe('0005');
    });

    it('uses the DISCIPLINE sequence key — independent of DEPARTMENT', async () => {
      const { service, harness } = await build(0);
      await service.create(ORG_A, { name: 'Piping' } as CreateDisciplineDto, USER);
      expect(harness.queryRunner.manager.findOne).toHaveBeenCalledWith(
        MasterCodeCounter,
        expect.objectContaining({
          where: expect.objectContaining({ sequenceKey: MasterSequenceKey.DISCIPLINE }),
        }),
      );
    });
  });

  // ── Activity ─────────────────────────────────────────────────────

  describe('ActivityService', () => {
    const mapping = {
      id: MAP_ID, organizationId: ORG_A,
      departmentId: DEPT_ID, disciplineId: DISC_ID, isDeleted: false, isActive: true,
    };

    const build = async (lastSequence = 0) => {
      const harness = buildHarness(lastSequence);
      const activityRepo = makeRepo();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ActivityService, MasterCodeService,
          { provide: getRepositoryToken(Activity),   useValue: activityRepo },
          { provide: getRepositoryToken(Department), useValue: makeRepo({
            findOne: jest.fn(async () => ({ id: DEPT_ID, name: 'Engineering', code: '0001' })),
          }) },
          { provide: getRepositoryToken(Discipline), useValue: makeRepo({
            findOne: jest.fn(async () => ({ id: DISC_ID, name: 'Piping', code: '0001' })),
          }) },
          { provide: getRepositoryToken(DepartmentDiscipline), useValue: makeRepo({
            findOne: jest.fn(async () => mapping),
          }) },
          { provide: getRepositoryToken(MasterCodeCounter), useValue: makeRepo() },
          { provide: DataSource, useValue: harness.dataSource },
        ],
      }).compile();
      return { service: module.get(ActivityService), harness, activityRepo };
    };

    const singleDto = () => ({
      departmentDisciplineId: MAP_ID,
      departmentId: DEPT_ID,
      disciplineId: DISC_ID,
      name: 'Request for Quotation',
    } as CreateActivityDto);

    it('generates 0001 for the first activity', async () => {
      const { service, harness } = await build(0);
      await service.create(ORG_A, singleDto(), USER);
      expect(harness.saved[0].code).toBe('0001');
    });

    it('uses the ACTIVITY sequence key', async () => {
      const { service, harness } = await build(0);
      await service.create(ORG_A, singleDto(), USER);
      expect(harness.queryRunner.manager.findOne).toHaveBeenCalledWith(
        MasterCodeCounter,
        expect.objectContaining({
          where: expect.objectContaining({ sequenceKey: MasterSequenceKey.ACTIVITY }),
        }),
      );
    });

    it('ignores a code supplied in the payload', async () => {
      const { service, harness } = await build(0);
      await service.create(ORG_A, { ...singleDto(), code: 'RFQ' } as any, USER);
      expect(harness.saved[0].code).toBe('0001');
    });

    it('still rejects a duplicate name', async () => {
      const { service, activityRepo } = await build(0);
      activityRepo.findOne.mockResolvedValue({ id: 'other' });

      await expect(service.create(ORG_A, singleDto(), USER)).rejects.toThrow(ConflictException);
    });

    it('rejects an attempt to change the code on update', async () => {
      const { service, activityRepo } = await build(0);
      activityRepo.findOne.mockResolvedValue({
        id: 'act-1', organizationId: ORG_A, code: '0001',
        departmentDisciplineId: MAP_ID, isDeleted: false,
      });

      await expect(
        service.update(ORG_A, 'act-1', { code: 'HACKED' } as any, USER),
      ).rejects.toThrow(ConflictException);
    });

    // ── Bulk ─────────────────────────────────────────────────────

    it('bulk: issues one sequential code per created activity', async () => {
      const { service, harness } = await build(0);

      await service.bulkCreate(ORG_A, {
        departmentDisciplineId: MAP_ID,
        activities: [{ name: 'RFQ' }, { name: 'TBE' }, { name: 'CBE' }],
      } as BulkCreateActivityDto, USER);

      // One save call carrying the whole array.
      const rows = harness.saved.flat();
      expect(rows.map((r: any) => r.code)).toEqual(['0001', '0002', '0003']);
    });

    it('bulk: continues the same sequence as single create', async () => {
      const { service, harness } = await build(9);

      await service.bulkCreate(ORG_A, {
        departmentDisciplineId: MAP_ID,
        activities: [{ name: 'RFQ' }, { name: 'TBE' }],
      } as BulkCreateActivityDto, USER);

      const rows = harness.saved.flat();
      expect(rows.map((r: any) => r.code)).toEqual(['0010', '0011']);
    });

    it('bulk: skips names that already exist under the mapping', async () => {
      const { service, activityRepo, harness } = await build(0);
      activityRepo.find.mockResolvedValue([{ name: 'RFQ' }]);

      const result = await service.bulkCreate(ORG_A, {
        departmentDisciplineId: MAP_ID,
        activities: [{ name: 'RFQ' }, { name: 'TBE' }],
      } as BulkCreateActivityDto, USER);

      expect(result.skipped).toBe(1);
      expect(result.skippedNames).toEqual(['RFQ']);
      const rows = harness.saved.flat();
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('TBE');
    });

    it('bulk: de-duplicates repeated names within one request', async () => {
      const { service, harness } = await build(0);

      const result = await service.bulkCreate(ORG_A, {
        departmentDisciplineId: MAP_ID,
        activities: [{ name: 'RFQ' }, { name: 'RFQ' }, { name: 'TBE' }],
      } as BulkCreateActivityDto, USER);

      const rows = harness.saved.flat();
      expect(rows).toHaveLength(2);
      expect(result.skippedNames).toEqual(['RFQ']);
    });

    it('bulk: consumes no numbers when every name is already taken', async () => {
      const { service, activityRepo, harness } = await build(0);
      activityRepo.find.mockResolvedValue([{ name: 'RFQ' }]);

      const result = await service.bulkCreate(ORG_A, {
        departmentDisciplineId: MAP_ID,
        activities: [{ name: 'RFQ' }],
      } as BulkCreateActivityDto, USER);

      expect(result.created).toEqual([]);
      expect(result.skipped).toBe(1);
      expect(harness.counter.lastSequence).toBe(0);
    });
  });

  // ── DTO contract ─────────────────────────────────────────────────

  describe('create DTOs no longer accept a code', () => {
    const cases: Array<[string, any, Record<string, any>]> = [
      ['Department', CreateDepartmentDto, { name: 'Engineering' }],
      ['Discipline', CreateDisciplineDto, { name: 'Piping' }],
      ['Activity',   CreateActivityDto,   {
        name: 'RFQ', departmentDisciplineId: MAP_ID, departmentId: DEPT_ID, disciplineId: DISC_ID,
      }],
    ];

    it.each(cases)('%s: validates without a code in the body', async (_label, dtoClass, payload) => {
      const dto = plainToInstance(dtoClass as any, payload) as object;
      const errors = await validate(dto, { whitelist: true });
      expect(errors.map(e => e.property)).not.toContain('code');
    });

    it.each(cases)('%s: a supplied code is rejected as non-whitelisted', async (_label, dtoClass, payload) => {
      const dto = plainToInstance(dtoClass as any, { ...payload, code: 'MANUAL' }) as object;
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      expect(errors.map(e => e.property)).toContain('code');
    });
  });
});
