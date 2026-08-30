import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { MaterialService } from './material.service';
import { MaterialCodeService } from './material-code.service';
import { MaterialUsageValidationService } from './material-usage-validation.service';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';

import { Material }            from './entities/material.entity';
import { MaterialCodeCounter } from './entities/material-code-counter.entity';
import { MaterialCategory }    from '../material-category/entities/material-category.entity';
import { MaterialGroup }       from '../material-group/entities/material-group.entity';
import { UnitOfMeasurement }   from '../unit-of-measurement/entities/unit-of-measurement.entity';
import { User }                from '../user/entity/user.entity';

import { MaterialStatus }   from './enums/material-status.enum';
import { CriticalityLevel } from './enums/criticality-level.enum';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';
const MATERIAL_ID = '44444444-4444-4444-8444-444444444444';
const CAT_ID = '55555555-5555-4555-8555-555555555555';
const GRP_ID = '66666666-6666-4666-8666-666666666666';
const UOM_ID = '77777777-7777-4777-8777-777777777777';
const USER = 'planner@example.com';

function makeRepo(overrides: Record<string, any> = {}) {
  return {
    find:    jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    save:    jest.fn(async (e: any) => e),
    create:  jest.fn((e: any) => e),
    createQueryBuilder: jest.fn(),
    ...overrides,
  };
}

// A fully-populated source material spanning every section, so the clone test
// proves the whole row is carried over rather than a handful of columns.
function sourceMaterial(overrides: Partial<Material> = {}): Material {
  return {
    id:    MATERIAL_ID,
    dguid: 'source-dguid',
    code:  'RAW000007',
    organizationId: ORG_A,

    materialCategoryId:  CAT_ID,
    materialGroupId:     GRP_ID,
    unitOfMeasurementId: UOM_ID,

    shortDescription: 'Carbon Steel Seamless Pipe',
    longDescription:  'ASTM A106 Grade B, 6 inch NB, Schedule 40',
    status:           MaterialStatus.ACTIVE,
    criticalityLevel: CriticalityLevel.HIGH,
    isSystem:         false,
    isStockItem:      true,
    isSerialized:     false,
    isBatchManaged:   true,
    remarks:          'High-priority item for plant expansion',

    // technical spec
    manufacturerName:   'Tenaris',
    modelPartNumber:    'TEN-A106B-6-40',
    pressureRating:     'Class 300',
    // procurement
    leadTimeDays:       45,
    lastPurchasePrice:  245.5,
    currency:           'USD',
    countryOfOrigin:    'IT',
    // inventory
    storageLocation:    'Yard-B',
    safetyStock:        120,
    // quality / accounting / safety / logistics
    inspectionType:     'INCOMING',
    standardPrice:      250,
    hazardClassification: 'NON_HAZARDOUS',
    packagingType:      'BUNDLE',
    // documents
    datasheetUrl:       'https://storage.example.com/ds/pipe.pdf',
    photos:             ['https://storage.example.com/img/1.jpg'],

    // audit / soft delete on the SOURCE — must not leak into the clone
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    createdBy: 'someone.else@example.com',
    updatedBy: 'someone.else@example.com',
    createdAt: new Date('2020-01-01T00:00:00Z'),
    updatedAt: new Date('2021-06-01T00:00:00Z'),

    ...overrides,
  } as Material;
}

describe('MaterialService.clone', () => {
  let service: MaterialService;
  let materialRepo: any;
  let categoryRepo: any;
  let groupRepo: any;
  let uomRepo: any;
  let dataSource: any;
  let queryRunner: any;
  let saved: any[];

  beforeEach(async () => {
    saved = [];
    queryRunner = {
      connect:             jest.fn(),
      startTransaction:    jest.fn(),
      commitTransaction:   jest.fn(),
      rollbackTransaction: jest.fn(),
      release:             jest.fn(),
      manager: {
        create:  jest.fn((_e: any, v: any) => v),
        save:    jest.fn(async (_e: any, v: any) => { saved.push(v); return v; }),
        findOne: jest.fn(async () => ({ categoryPrefix: 'RAW', lastSequence: 7 })),
      },
    };

    dataSource   = { createQueryRunner: jest.fn(() => queryRunner) };
    materialRepo = makeRepo();
    categoryRepo = makeRepo({
      findOne: jest.fn(async () => ({
        id: CAT_ID, organizationId: ORG_A, name: 'Raw Material', isActive: true, isDeleted: false,
      })),
    });
    groupRepo = makeRepo({
      findOne: jest.fn(async () => ({
        id: GRP_ID, organizationId: ORG_A, name: 'Pipes', isActive: true, isDeleted: false,
      })),
    });
    uomRepo = makeRepo({
      findOne: jest.fn(async () => ({
        id: UOM_ID, organizationId: ORG_A, name: 'Metre', isActive: true, isDeleted: false,
      })),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialService,
        MaterialCodeService,
        MaterialUsageValidationService,
        { provide: getRepositoryToken(Material),            useValue: materialRepo },
        { provide: getRepositoryToken(MaterialCodeCounter), useValue: makeRepo() },
        { provide: getRepositoryToken(MaterialCategory),    useValue: categoryRepo },
        { provide: getRepositoryToken(MaterialGroup),       useValue: groupRepo },
        { provide: getRepositoryToken(UnitOfMeasurement),   useValue: uomRepo },
        { provide: getRepositoryToken(User),                useValue: makeRepo() },
        { provide: DataSource,          useValue: dataSource },
        { provide: CloudStorageService, useValue: { isFileValid: jest.fn(), uploadFile: jest.fn() } },
      ],
    }).compile();

    service = module.get(MaterialService);
  });

  const clonedRow = () => saved.find(s => s.shortDescription);

  it('issues the next sequential code in the same category', async () => {
    materialRepo.findOne.mockResolvedValue(sourceMaterial());
    jest.spyOn(service, 'findOne').mockResolvedValue({} as any);

    await service.clone(MATERIAL_ID, ORG_A, USER);

    // Source was RAW000007 and the counter stood at 7 → clone takes RAW000008.
    expect(clonedRow().code).toBe('RAW000008');
  });

  it('mints a new id and dguid', async () => {
    const source = sourceMaterial();
    materialRepo.findOne.mockResolvedValue(source);
    jest.spyOn(service, 'findOne').mockResolvedValue({} as any);

    await service.clone(MATERIAL_ID, ORG_A, USER);

    const clone = clonedRow();
    expect(clone.id).toBeDefined();
    expect(clone.dguid).toBeDefined();
    expect(clone.id).not.toBe(source.id);
    expect(clone.dguid).not.toBe(source.dguid);
    expect(clone.id).not.toBe(clone.dguid);
  });

  it('copies every other field verbatim', async () => {
    const source = sourceMaterial();
    materialRepo.findOne.mockResolvedValue(source);
    jest.spyOn(service, 'findOne').mockResolvedValue({} as any);

    await service.clone(MATERIAL_ID, ORG_A, USER);
    const clone = clonedRow();

    // Identity fields differ; everything else must match the source exactly.
    const identityFields = new Set([
      'id', 'dguid', 'code', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt',
      'deletedAt', 'deletedBy',
    ]);
    for (const [key, value] of Object.entries(source)) {
      if (identityFields.has(key)) continue;
      expect({ [key]: clone[key] }).toEqual({ [key]: value });
    }
  });

  it('carries over classification, flags, and document URLs', async () => {
    materialRepo.findOne.mockResolvedValue(sourceMaterial());
    jest.spyOn(service, 'findOne').mockResolvedValue({} as any);

    await service.clone(MATERIAL_ID, ORG_A, USER);
    const clone = clonedRow();

    expect(clone.materialCategoryId).toBe(CAT_ID);
    expect(clone.materialGroupId).toBe(GRP_ID);
    expect(clone.unitOfMeasurementId).toBe(UOM_ID);
    expect(clone.criticalityLevel).toBe(CriticalityLevel.HIGH);
    expect(clone.isBatchManaged).toBe(true);
    expect(clone.manufacturerName).toBe('Tenaris');
    expect(clone.lastPurchasePrice).toBe(245.5);
    expect(clone.datasheetUrl).toBe('https://storage.example.com/ds/pipe.pdf');
    expect(clone.photos).toEqual(['https://storage.example.com/img/1.jpg']);
  });

  it('stamps audit fields with the calling user, not the source author', async () => {
    materialRepo.findOne.mockResolvedValue(sourceMaterial());
    jest.spyOn(service, 'findOne').mockResolvedValue({} as any);

    await service.clone(MATERIAL_ID, ORG_A, USER);
    const clone = clonedRow();

    expect(clone.createdBy).toBe(USER);
    expect(clone.updatedBy).toBe(USER);
    expect(clone.createdBy).not.toBe('someone.else@example.com');
  });

  it('never carries a soft-delete marker onto the clone', async () => {
    // Defensive: even if a deleted row somehow reached the copy step.
    materialRepo.findOne.mockResolvedValue(
      sourceMaterial({ deletedAt: new Date(), deletedBy: 'x@example.com' } as any),
    );
    jest.spyOn(service, 'findOne').mockResolvedValue({} as any);

    await service.clone(MATERIAL_ID, ORG_A, USER);
    const clone = clonedRow();

    expect(clone.isDeleted).toBe(false);
    expect(clone.deletedAt).toBeNull();
    expect(clone.deletedBy).toBeNull();
  });

  it('loads the source without relations so parent entities are not re-persisted', async () => {
    materialRepo.findOne.mockResolvedValue(sourceMaterial());
    jest.spyOn(service, 'findOne').mockResolvedValue({} as any);

    await service.clone(MATERIAL_ID, ORG_A, USER);

    expect(materialRepo.findOne).toHaveBeenCalledWith({
      where: { id: MATERIAL_ID, organizationId: ORG_A, isDeleted: false },
    });
    const clone = clonedRow();
    expect(clone.materialCategory).toBeUndefined();
    expect(clone.materialGroup).toBeUndefined();
    expect(clone.unitOfMeasurement).toBeUndefined();
    expect(clone.organization).toBeUndefined();
  });

  it('generates the code inside the transaction, under the counter lock', async () => {
    materialRepo.findOne.mockResolvedValue(sourceMaterial());
    jest.spyOn(service, 'findOne').mockResolvedValue({} as any);

    await service.clone(MATERIAL_ID, ORG_A, USER);

    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(queryRunner.manager.findOne).toHaveBeenCalledWith(
      MaterialCodeCounter,
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('returns 404 for an unknown material', async () => {
    materialRepo.findOne.mockResolvedValue(null);
    await expect(service.clone(MATERIAL_ID, ORG_A, USER)).rejects.toThrow(NotFoundException);
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('refuses to clone another organization\'s material', async () => {
    materialRepo.findOne.mockResolvedValue(null);

    await expect(service.clone(MATERIAL_ID, ORG_B, USER)).rejects.toThrow(NotFoundException);
    expect(materialRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: ORG_B }) }),
    );
  });

  it('refuses when the category has since been deactivated', async () => {
    materialRepo.findOne.mockResolvedValue(sourceMaterial());
    categoryRepo.findOne.mockResolvedValue({
      id: CAT_ID, organizationId: ORG_A, name: 'Raw Material', isActive: false, isDeleted: false,
    });

    await expect(service.clone(MATERIAL_ID, ORG_A, USER)).rejects.toThrow(ConflictException);
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('refuses when the UOM has since been deactivated', async () => {
    materialRepo.findOne.mockResolvedValue(sourceMaterial());
    uomRepo.findOne.mockResolvedValue({
      id: UOM_ID, organizationId: ORG_A, name: 'Metre', isActive: false, isDeleted: false,
    });

    await expect(service.clone(MATERIAL_ID, ORG_A, USER)).rejects.toThrow(ConflictException);
  });

  it('rolls back and releases the connection when the insert fails', async () => {
    materialRepo.findOne.mockResolvedValue(sourceMaterial());
    queryRunner.manager.save.mockRejectedValue(new Error('db down'));

    await expect(service.clone(MATERIAL_ID, ORG_A, USER)).rejects.toThrow('db down');
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('surfaces a duplicate-code collision as 409', async () => {
    materialRepo.findOne.mockResolvedValue(sourceMaterial());
    const err: any = new Error('duplicate'); err.code = 'ER_DUP_ENTRY';
    queryRunner.manager.save.mockRejectedValue(err);

    await expect(service.clone(MATERIAL_ID, ORG_A, USER)).rejects.toThrow(ConflictException);
  });

  it('issues distinct codes when the same material is cloned repeatedly', async () => {
    materialRepo.findOne.mockResolvedValue(sourceMaterial());
    jest.spyOn(service, 'findOne').mockResolvedValue({} as any);

    // One shared counter row, as the row lock guarantees in production.
    const counter = { categoryPrefix: 'RAW', lastSequence: 7 };
    queryRunner.manager.findOne.mockResolvedValue(counter);
    queryRunner.manager.save.mockImplementation(async (_e: any, v: any) => {
      if (v.lastSequence !== undefined) counter.lastSequence = v.lastSequence;
      saved.push(v);
      return v;
    });

    await service.clone(MATERIAL_ID, ORG_A, USER);
    await service.clone(MATERIAL_ID, ORG_A, USER);
    await service.clone(MATERIAL_ID, ORG_A, USER);

    const codes = saved.filter(s => s.shortDescription).map(s => s.code);
    expect(codes).toEqual(['RAW000008', 'RAW000009', 'RAW000010']);
    expect(new Set(codes).size).toBe(3);
  });
});
