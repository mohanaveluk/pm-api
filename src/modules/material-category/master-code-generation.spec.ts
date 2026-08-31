import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConflictException } from '@nestjs/common';

import { MasterCodeService, MasterSequenceKey } from 'src/common/services/master-code.service';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';

import { MaterialCategoryService } from './material-category.service';
import { MaterialCategory }        from './entities/material-category.entity';
import { CreateMaterialCategoryDto } from './dto/create-material-category.dto';

import { MaterialGroupService } from '../material-group/material-group.service';
import { MaterialGroup }        from '../material-group/entities/material-group.entity';
import { CreateMaterialGroupDto } from '../material-group/dto/create-material-group.dto';

import { UnitOfMeasurementService } from '../unit-of-measurement/unit-of-measurement.service';
import { UnitOfMeasurement }        from '../unit-of-measurement/entities/unit-of-measurement.entity';
import { CreateUnitOfMeasurementDto } from '../unit-of-measurement/dto/create-unit-of-measurement.dto';

import { IndustryCategoryService } from '../industry-category/industry-category.service';
import { IndustryCategory }        from '../industry-category/entities/industry-category.entity';
import { CreateIndustryCategoryDto } from '../industry-category/dto/create-industry-category.dto';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const CAT_ID = '55555555-5555-4555-8555-555555555555';
const USER = 'admin@example.com';

function makeQb(overrides: Record<string, any> = {}) {
  const qb: any = {
    where: jest.fn(() => qb), andWhere: jest.fn(() => qb),
    getExists: jest.fn(async () => false), getOne: jest.fn(async () => null),
  };
  Object.assign(qb, overrides);
  return qb;
}

function makeRepo(overrides: Record<string, any> = {}) {
  return {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    findAndCount: jest.fn(async () => [[], 0]),
    save: jest.fn(async (e: any) => e),
    create: jest.fn((e: any) => e),
    count: jest.fn(async () => 0),
    createQueryBuilder: jest.fn(() => makeQb()),
    ...overrides,
  };
}

// Shared harness: a query runner whose counter sits at `lastSequence`, and a
// capture of whatever the service saved.
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
  return {
    saved,
    queryRunner,
    dataSource: { createQueryRunner: jest.fn(() => queryRunner) },
  };
}

describe('Master code generation across the four masters', () => {
  // ── Material Category ────────────────────────────────────────────

  describe('MaterialCategoryService.create', () => {
    let service: MaterialCategoryService;
    let harness: ReturnType<typeof buildHarness>;
    let repo: any;

    const build = async (lastSequence = 0) => {
      harness = buildHarness(lastSequence);
      repo = makeRepo();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MaterialCategoryService, MasterCodeService,
          { provide: getRepositoryToken(MaterialCategory),   useValue: repo },
          { provide: getRepositoryToken(MasterCodeCounter),  useValue: makeRepo() },
          { provide: DataSource, useValue: harness.dataSource },
        ],
      }).compile();
      service = module.get(MaterialCategoryService);
      jest.spyOn(service as any, 'loadWithOrg').mockResolvedValue({ organization: {} });
    };

    it('generates 0001 for the first category in an organization', async () => {
      await build(0);
      await service.create(ORG_A, { name: 'Raw Material' } as CreateMaterialCategoryDto, USER);
      expect(harness.saved[0].code).toBe('0001');
    });

    it('continues the organization sequence', async () => {
      await build(41);
      await service.create(ORG_A, { name: 'Consumable' } as CreateMaterialCategoryDto, USER);
      expect(harness.saved[0].code).toBe('0042');
    });

    it('ignores any code supplied in the payload', async () => {
      await build(0);
      await service.create(
        ORG_A, { name: 'Raw Material', code: 'HACKED' } as any, USER,
      );
      expect(harness.saved[0].code).toBe('0001');
    });

    it('uses the MATERIAL_CATEGORY sequence key', async () => {
      await build(0);
      await service.create(ORG_A, { name: 'Raw Material' } as CreateMaterialCategoryDto, USER);
      expect(harness.queryRunner.manager.findOne).toHaveBeenCalledWith(
        MasterCodeCounter,
        expect.objectContaining({
          where: expect.objectContaining({ sequenceKey: MasterSequenceKey.MATERIAL_CATEGORY }),
        }),
      );
    });

    it('rolls back and does not consume a number when the insert fails', async () => {
      await build(0);
      harness.queryRunner.manager.save.mockRejectedValue(new Error('db down'));

      await expect(
        service.create(ORG_A, { name: 'Raw Material' } as CreateMaterialCategoryDto, USER),
      ).rejects.toThrow('db down');
      expect(harness.queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(harness.queryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('surfaces a code collision as 409', async () => {
      await build(0);
      const err: any = new Error('dup'); err.code = 'ER_DUP_ENTRY';
      harness.queryRunner.manager.save.mockRejectedValue(err);

      await expect(
        service.create(ORG_A, { name: 'Raw Material' } as CreateMaterialCategoryDto, USER),
      ).rejects.toThrow(ConflictException);
    });

    it('still rejects a duplicate name before touching the counter', async () => {
      await build(0);
      repo.findOne.mockResolvedValue({ id: 'other' });

      await expect(
        service.create(ORG_A, { name: 'Raw Material' } as CreateMaterialCategoryDto, USER),
      ).rejects.toThrow(ConflictException);
      expect(harness.dataSource.createQueryRunner).not.toHaveBeenCalled();
    });
  });

  // ── Material Group ───────────────────────────────────────────────

  describe('MaterialGroupService.create', () => {
    it('generates a sequential code and keeps the category link', async () => {
      const harness = buildHarness(7);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MaterialGroupService, MasterCodeService,
          { provide: getRepositoryToken(MaterialGroup),     useValue: makeRepo() },
          { provide: getRepositoryToken(MaterialCategory),  useValue: makeRepo({
            findOne: jest.fn(async () => ({ id: CAT_ID, name: 'Raw Material', isActive: true, isDeleted: false })),
          }) },
          { provide: getRepositoryToken(MasterCodeCounter), useValue: makeRepo() },
          { provide: DataSource, useValue: harness.dataSource },
        ],
      }).compile();
      const service = module.get(MaterialGroupService);
      jest.spyOn(service as any, 'loadWithRelations').mockResolvedValue({ organization: {}, materialCategory: {} });

      await service.create(
        ORG_A, { materialCategoryId: CAT_ID, name: 'Steel Products' } as CreateMaterialGroupDto, USER,
      );

      expect(harness.saved[0].code).toBe('0008');
      expect(harness.saved[0].materialCategoryId).toBe(CAT_ID);
    });

    it('uses the MATERIAL_GROUP sequence key', async () => {
      const harness = buildHarness(0);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MaterialGroupService, MasterCodeService,
          { provide: getRepositoryToken(MaterialGroup),     useValue: makeRepo() },
          { provide: getRepositoryToken(MaterialCategory),  useValue: makeRepo({
            findOne: jest.fn(async () => ({ id: CAT_ID, name: 'Raw', isActive: true, isDeleted: false })),
          }) },
          { provide: getRepositoryToken(MasterCodeCounter), useValue: makeRepo() },
          { provide: DataSource, useValue: harness.dataSource },
        ],
      }).compile();
      const service = module.get(MaterialGroupService);
      jest.spyOn(service as any, 'loadWithRelations').mockResolvedValue({ organization: {}, materialCategory: {} });

      await service.create(
        ORG_A, { materialCategoryId: CAT_ID, name: 'Steel' } as CreateMaterialGroupDto, USER,
      );

      expect(harness.queryRunner.manager.findOne).toHaveBeenCalledWith(
        MasterCodeCounter,
        expect.objectContaining({
          where: expect.objectContaining({ sequenceKey: MasterSequenceKey.MATERIAL_GROUP }),
        }),
      );
    });
  });

  // ── Unit of Measurement ──────────────────────────────────────────

  describe('UnitOfMeasurementService.create', () => {
    it('generates a sequential code', async () => {
      const harness = buildHarness(0);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UnitOfMeasurementService, MasterCodeService,
          { provide: getRepositoryToken(UnitOfMeasurement), useValue: makeRepo() },
          { provide: getRepositoryToken(MasterCodeCounter), useValue: makeRepo() },
          { provide: DataSource, useValue: harness.dataSource },
        ],
      }).compile();
      const service = module.get(UnitOfMeasurementService);
      jest.spyOn(service as any, 'loadWithOrg').mockResolvedValue({ organization: {} });

      await service.create(
        ORG_A, { name: 'Metre', symbol: 'm' } as CreateUnitOfMeasurementDto, USER,
      );

      expect(harness.saved[0].code).toBe('0001');
      expect(harness.queryRunner.manager.findOne).toHaveBeenCalledWith(
        MasterCodeCounter,
        expect.objectContaining({
          where: expect.objectContaining({ sequenceKey: MasterSequenceKey.UNIT_OF_MEASUREMENT }),
        }),
      );
    });
  });

  // ── Industry Category ────────────────────────────────────────────

  describe('IndustryCategoryService.create', () => {
    it('generates a sequential code', async () => {
      const harness = buildHarness(2);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          IndustryCategoryService, MasterCodeService,
          { provide: getRepositoryToken(IndustryCategory),  useValue: makeRepo() },
          { provide: getRepositoryToken(MasterCodeCounter), useValue: makeRepo() },
          { provide: DataSource, useValue: harness.dataSource },
        ],
      }).compile();
      const service = module.get(IndustryCategoryService);
      jest.spyOn(service as any, 'loadWithOrg').mockResolvedValue({ organization: {} });

      await service.create(ORG_A, { name: 'Civil' } as CreateIndustryCategoryDto, USER);

      expect(harness.saved[0].code).toBe('0003');
      expect(harness.queryRunner.manager.findOne).toHaveBeenCalledWith(
        MasterCodeCounter,
        expect.objectContaining({
          where: expect.objectContaining({ sequenceKey: MasterSequenceKey.INDUSTRY_CATEGORY }),
        }),
      );
    });
  });

  // ── DTO contract ─────────────────────────────────────────────────

  describe('create DTOs no longer accept a code', () => {
    const cases: Array<[string, any, Record<string, any>]> = [
      ['MaterialCategory',   CreateMaterialCategoryDto,   { name: 'Raw Material' }],
      ['MaterialGroup',      CreateMaterialGroupDto,      { name: 'Steel', materialCategoryId: CAT_ID }],
      ['UnitOfMeasurement',  CreateUnitOfMeasurementDto,  { name: 'Metre', symbol: 'm' }],
      ['IndustryCategory',   CreateIndustryCategoryDto,   { name: 'Civil' }],
    ];

    it.each(cases)('%s: validates without a code in the body', async (_label, dtoClass, payload) => {
      const dto = plainToInstance(dtoClass as any, payload) as object;
      const errors = await validate(dto, { whitelist: true });
      const failed = errors.map(e => e.property);
      expect(failed).not.toContain('code');
    });

    it.each(cases)('%s: strips a supplied code under whitelist', async (_label, dtoClass, payload) => {
      // The global ValidationPipe runs with whitelist, so an unknown `code`
      // property never reaches the service.
      const dto = plainToInstance(dtoClass as any, { ...payload, code: 'MANUAL' }) as object;
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      const failed = errors.map(e => e.property);
      expect(failed).toContain('code');
    });
  });
});
