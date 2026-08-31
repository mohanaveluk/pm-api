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
import { MaterialDocument }    from './entities/material-document.entity';
import { MaterialCategory }    from '../material-category/entities/material-category.entity';
import { MaterialGroup }       from '../material-group/entities/material-group.entity';
import { UnitOfMeasurement }   from '../unit-of-measurement/entities/unit-of-measurement.entity';
import { User }                from '../user/entity/user.entity';

import { MaterialStatus }   from './enums/material-status.enum';
import { CriticalityLevel } from './enums/criticality-level.enum';
import { MaterialDocumentType } from './enums/material-document-type.enum';

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
  let documentRepo: any;
  let dataSource: any;
  let queryRunner: any;
  let saved: any[];
  let txManager: any;

  beforeEach(async () => {
    saved = [];
    txManager = {
      create:  jest.fn((_e, v) => v),
      save:    jest.fn(async (e, v) => { saved.push({ entity: e, rows: v }); return v; }),
      find:    jest.fn(async () => []),
      findOne: jest.fn(async () => null),
      update:  jest.fn(async () => ({ affected: 1 })),
    };
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
        find:    jest.fn(async () => []),
        update:  jest.fn(async () => ({ affected: 1 })),
      },
    };

    documentRepo = makeRepo({ count: jest.fn(async () => 0) });
    dataSource   = {
      createQueryRunner: jest.fn(() => queryRunner),
      transaction: jest.fn(async (cb) => cb(txManager)),
    };
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
        { provide: getRepositoryToken(MaterialDocument),    useValue: documentRepo },
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

// ══ Purchase-order lock & document register ═══════════════════════════════

describe('MaterialService — purchase-order lock and documents', () => {
  let service: MaterialService;
  let materialRepo: any;
  let documentRepo: any;
  let dataSource: any;
  let txManager: any;
  let saved: Array<{ entity: any; rows: any }>;

  const lockedMaterial = (overrides: Partial<Material> = {}) => sourceMaterial({
    isPurchaseOrderIssued: true,
    purchaseOrderReference: 'PO-2026-0451',
    purchaseOrderIssuedAt: new Date('2026-02-01T00:00:00Z'),
    ...overrides,
  } as Partial<Material>);

  beforeEach(async () => {
    saved = [];
    txManager = {
      create:  jest.fn((_e: any, v: any) => v),
      save:    jest.fn(async (e: any, v: any) => { saved.push({ entity: e, rows: v }); return v; }),
      find:    jest.fn(async () => []),
      findOne: jest.fn(async () => null),
      update:  jest.fn(async () => ({ affected: 1 })),
    };
    dataSource = {
      createQueryRunner: jest.fn(() => ({
        connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(), release: jest.fn(),
        manager: {
          create:  jest.fn((_e: any, v: any) => v),
          save:    jest.fn(async (_e: any, v: any) => v),
          find:    jest.fn(async () => []),
          findOne: jest.fn(async () => ({ categoryPrefix: 'RAW', lastSequence: 7 })),
          update:  jest.fn(async () => ({ affected: 1 })),
        },
      })),
      transaction: jest.fn(async (cb: any) => cb(txManager)),
    };
    materialRepo = makeRepo();
    documentRepo = makeRepo({ count: jest.fn(async () => 0) });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialService, MaterialCodeService, MaterialUsageValidationService,
        { provide: getRepositoryToken(Material),            useValue: materialRepo },
        { provide: getRepositoryToken(MaterialCodeCounter), useValue: makeRepo() },
        { provide: getRepositoryToken(MaterialDocument),    useValue: documentRepo },
        {
          provide: getRepositoryToken(MaterialCategory),
          useValue: makeRepo({ findOne: jest.fn(async () => ({
            id: CAT_ID, organizationId: ORG_A, name: 'Raw Material', isActive: true, isDeleted: false,
          })) }),
        },
        {
          provide: getRepositoryToken(MaterialGroup),
          useValue: makeRepo({ findOne: jest.fn(async () => ({ id: GRP_ID, isActive: true, isDeleted: false })) }),
        },
        {
          provide: getRepositoryToken(UnitOfMeasurement),
          useValue: makeRepo({ findOne: jest.fn(async () => ({ id: UOM_ID, isActive: true, isDeleted: false })) }),
        },
        { provide: getRepositoryToken(User),                useValue: makeRepo() },
        { provide: DataSource,          useValue: dataSource },
        { provide: CloudStorageService, useValue: { isFileValid: jest.fn(), uploadFile: jest.fn() } },
      ],
    }).compile();

    service = module.get(MaterialService);
    jest.spyOn(service, 'findOne').mockResolvedValue({} as any);
  });

  const savedDocs = () =>
    saved.filter(s => s.entity === MaterialDocument).flatMap(s => [].concat(s.rows));

  // ── Locking ──────────────────────────────────────────────────────

  describe('markPurchaseOrderIssued', () => {
    it('locks the material and records the PO reference', async () => {
      const material = sourceMaterial();
      materialRepo.findOne.mockResolvedValue(material);

      await service.markPurchaseOrderIssued(MATERIAL_ID, ORG_A, 'PO-2026-0451', USER);

      expect(material.isPurchaseOrderIssued).toBe(true);
      expect(material.purchaseOrderReference).toBe('PO-2026-0451');
      expect(material.purchaseOrderIssuedBy).toBe(USER);
      expect(material.purchaseOrderIssuedAt).toBeInstanceOf(Date);
    });

    it('is idempotent and keeps the original locking reference', async () => {
      const material = lockedMaterial();
      materialRepo.findOne.mockResolvedValue(material);

      await service.markPurchaseOrderIssued(MATERIAL_ID, ORG_A, 'PO-2026-9999', USER);

      expect(material.purchaseOrderReference).toBe('PO-2026-0451');
      expect(materialRepo.save).not.toHaveBeenCalled();
    });

    it('returns 404 for a material in another organization', async () => {
      materialRepo.findOne.mockResolvedValue(null);
      await expect(
        service.markPurchaseOrderIssued(MATERIAL_ID, ORG_B, 'PO-1', USER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── What the lock blocks ─────────────────────────────────────────

  describe('lock enforcement', () => {
    it('allows updating a PO-locked material, but freezes the two descriptions', async () => {
      const material = lockedMaterial();
      materialRepo.findOne.mockResolvedValue(material);

      await service.update(MATERIAL_ID, {
        shortDescription: 'RENAMED',
        longDescription:  'REWRITTEN',
        storageLocation:  'Yard-C',
        leadTimeDays:     60,
      } as any, ORG_A, USER);

      // Descriptions untouched...
      expect(material.shortDescription).toBe('Carbon Steel Seamless Pipe');
      expect(material.longDescription).toBe('ASTM A106 Grade B, 6 inch NB, Schedule 40');
      // ...everything else applied.
      expect(material.storageLocation).toBe('Yard-C');
      expect(material.leadTimeDays).toBe(60);
      expect(material.updatedBy).toBe(USER);
    });

    it('updates both descriptions freely when the material is NOT PO-locked', async () => {
      const material = sourceMaterial();
      materialRepo.findOne.mockResolvedValue(material);

      await service.update(MATERIAL_ID, {
        shortDescription: 'RENAMED',
        longDescription:  'REWRITTEN',
      } as any, ORG_A, USER);

      expect(material.shortDescription).toBe('RENAMED');
      expect(material.longDescription).toBe('REWRITTEN');
    });

    it('freezes each description independently', async () => {
      const material = lockedMaterial();
      materialRepo.findOne.mockResolvedValue(material);

      await service.update(MATERIAL_ID, { shortDescription: 'RENAMED' } as any, ORG_A, USER);

      expect(material.shortDescription).toBe('Carbon Steel Seamless Pipe');
      // The untouched one is not disturbed either.
      expect(material.longDescription).toBe('ASTM A106 Grade B, 6 inch NB, Schedule 40');
    });

    it('does not fail when a locked update omits the descriptions entirely', async () => {
      const material = lockedMaterial();
      materialRepo.findOne.mockResolvedValue(material);

      await service.update(MATERIAL_ID, { remarks: 'Reordered' } as any, ORG_A, USER);

      expect(material.remarks).toBe('Reordered');
      expect(material.shortDescription).toBe('Carbon Steel Seamless Pipe');
    });

    it('still lets a locked material take document and category updates', async () => {
      const material = lockedMaterial();
      materialRepo.findOne.mockResolvedValue(material);

      await service.update(MATERIAL_ID, {
        criticalityLevel: CriticalityLevel.LOW,
        documentList: [{
          documentType: MaterialDocumentType.INSPECTION_REPORT,
          documentUrl: 'https://s/ir.pdf',
        }],
      } as any, ORG_A, USER);

      expect(material.criticalityLevel).toBe(CriticalityLevel.LOW);
      expect(saved.some(s => s.entity === MaterialDocument)).toBe(true);
    });

    it('refuses to delete a PO-locked material', async () => {
      materialRepo.findOne.mockResolvedValue(lockedMaterial());
      await expect(service.remove(MATERIAL_ID, ORG_A, USER)).rejects.toThrow(ConflictException);
    });

    it('refuses to delete a document filed before the PO lock', async () => {
      materialRepo.findOne.mockResolvedValue(lockedMaterial());
      documentRepo.findOne.mockResolvedValue({
        id: 'doc-1', materialId: MATERIAL_ID, organizationId: ORG_A,
        isDeleted: false, isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'), // before the 2026-02-01 lock
      });
      await expect(
        service.removeDocument(MATERIAL_ID, 'doc-1', ORG_A, USER),
      ).rejects.toThrow(/purchase order/);
    });

    it('still allows deleting a document filed after the PO lock', async () => {
      materialRepo.findOne.mockResolvedValue(lockedMaterial());
      documentRepo.findOne.mockResolvedValue({
        id: 'doc-1', materialId: MATERIAL_ID, organizationId: ORG_A,
        isDeleted: false, isActive: true,
        createdAt: new Date('2026-03-01T00:00:00Z'), // after the 2026-02-01 lock
      });

      await service.removeDocument(MATERIAL_ID, 'doc-1', ORG_A, USER);

      const [doc] = savedDocs();
      expect(doc.isDeleted).toBe(true);
    });

    it('still allows updating an unlocked material', async () => {
      materialRepo.findOne.mockResolvedValue(sourceMaterial());
      await service.update(MATERIAL_ID, { longDescription: 'changed' } as any, ORG_A, USER);
      expect(saved.some(s => s.entity === Material)).toBe(true);
    });

    it('still allows deleting a document from an unlocked material', async () => {
      materialRepo.findOne.mockResolvedValue(sourceMaterial());
      documentRepo.findOne.mockResolvedValue({
        id: 'doc-1', materialId: MATERIAL_ID, organizationId: ORG_A, isDeleted: false, isActive: true,
      });

      await service.removeDocument(MATERIAL_ID, 'doc-1', ORG_A, USER);

      const [doc] = savedDocs();
      expect(doc.isDeleted).toBe(true);
      expect(doc.deletedBy).toBe(USER);
      expect(doc.isActive).toBe(false);
    });
  });

  // ── Adding documents stays open ──────────────────────────────────

  describe('addDocument', () => {
    it('is permitted while the material is PO-locked', async () => {
      materialRepo.findOne.mockResolvedValue(lockedMaterial());

      const result = await service.addDocument(
        MATERIAL_ID,
        { documentType: MaterialDocumentType.INSPECTION_REPORT, documentUrl: 'https://s/ir.pdf' },
        ORG_A, USER,
      );

      expect(result.version).toBe(1);
      expect(result.isActive).toBe(true);
    });

    it('starts a new chain at version 1 when no predecessor is given', async () => {
      materialRepo.findOne.mockResolvedValue(sourceMaterial());

      const result = await service.addDocument(
        MATERIAL_ID,
        { documentType: MaterialDocumentType.PHOTO, documentUrl: 'https://s/2.jpg' },
        ORG_A, USER,
      );

      expect(result.version).toBe(1);
      expect(result.supersedesId).toBeNull();
    });

    it('files a revision as the next version and retires the predecessor', async () => {
      materialRepo.findOne.mockResolvedValue(lockedMaterial());
      const previous = {
        id: 'doc-1', materialId: MATERIAL_ID, organizationId: ORG_A,
        documentType: MaterialDocumentType.QUALITY_CERTIFICATE,
        version: 2, isActive: true, isDeleted: false,
        createdAt: new Date('2026-03-01T00:00:00Z'), // after the 2026-02-01 lock — still revisable
      };
      txManager.findOne.mockResolvedValue(previous);

      const result = await service.addDocument(
        MATERIAL_ID,
        {
          documentType: MaterialDocumentType.QUALITY_CERTIFICATE,
          documentUrl: 'https://s/cert-v3.pdf',
          supersedesId: 'doc-1',
        },
        ORG_A, USER,
      );

      expect(result.version).toBe(3);
      expect(result.supersedesId).toBe('doc-1');
      // Predecessor retained, only deactivated — never deleted.
      expect(previous.isActive).toBe(false);
      expect(previous.isDeleted).toBe(false);
    });

    it('files alongside — never refuses — when superseding a pre-PO document', async () => {
      // Filing a document is allowed in every case. An explicit supersedesId
      // pointing at a frozen row does not fail: the frozen row is left active
      // and the upload lands beside it.
      materialRepo.findOne.mockResolvedValue(lockedMaterial());
      const previous = {
        id: 'doc-1', materialId: MATERIAL_ID, organizationId: ORG_A,
        documentType: MaterialDocumentType.QUALITY_CERTIFICATE,
        version: 1, isActive: true, isDeleted: false,
        createdAt: new Date('2026-01-01T00:00:00Z'), // before the 2026-02-01 lock — frozen
      };
      txManager.findOne.mockResolvedValue(previous);

      const result = await service.addDocument(
        MATERIAL_ID,
        {
          documentType: MaterialDocumentType.QUALITY_CERTIFICATE,
          documentUrl: 'https://s/cert-v2.pdf',
          supersedesId: 'doc-1',
        },
        ORG_A, USER,
      );

      expect(result.supersedesId).toBeNull();
      expect(previous.isActive).toBe(true); // untouched — still the PO's basis
    });

    it('does supersede normally when the target was filed after the PO', async () => {
      materialRepo.findOne.mockResolvedValue(lockedMaterial());
      const previous = {
        id: 'doc-9', materialId: MATERIAL_ID, organizationId: ORG_A,
        documentType: MaterialDocumentType.QUALITY_CERTIFICATE,
        version: 3, isActive: true, isDeleted: false,
        createdAt: new Date('2026-06-01T00:00:00Z'), // after the 2026-02-01 lock
      };
      txManager.findOne.mockResolvedValue(previous);

      const result = await service.addDocument(
        MATERIAL_ID,
        {
          documentType: MaterialDocumentType.QUALITY_CERTIFICATE,
          documentUrl: 'https://s/cert-v4.pdf',
          supersedesId: 'doc-9',
        },
        ORG_A, USER,
      );

      expect(result.version).toBe(4);
      expect(result.supersedesId).toBe('doc-9');
      expect(previous.isActive).toBe(false);
    });

    it('adds a new document alongside a frozen singleton instead of superseding it', async () => {
      materialRepo.findOne.mockResolvedValue(lockedMaterial());
      const current = {
        id: 'ds-1', materialId: MATERIAL_ID, organizationId: ORG_A,
        documentType: MaterialDocumentType.DATASHEET, version: 1, isActive: true, isDeleted: false,
        createdAt: new Date('2026-01-01T00:00:00Z'), // before the 2026-02-01 lock — frozen
      };
      txManager.findOne.mockResolvedValue(current);

      const result = await service.addDocument(
        MATERIAL_ID,
        { documentType: MaterialDocumentType.DATASHEET, documentUrl: 'https://s/ds-v2.pdf' },
        ORG_A, USER,
      );

      // The frozen row is left exactly as it was — still active, not superseded.
      expect(current.isActive).toBe(true);
      expect(result.version).toBe(2);
      expect(result.supersedesId).toBeNull();
      expect(result.isActive).toBe(true);
    });

    it('auto-supersedes the current version for single-instance types', async () => {
      materialRepo.findOne.mockResolvedValue(sourceMaterial());
      const current = {
        id: 'ds-1', materialId: MATERIAL_ID, organizationId: ORG_A,
        documentType: MaterialDocumentType.DATASHEET, version: 1, isActive: true, isDeleted: false,
      };
      txManager.findOne.mockResolvedValue(current);

      const result = await service.addDocument(
        MATERIAL_ID,
        { documentType: MaterialDocumentType.DATASHEET, documentUrl: 'https://s/ds-v2.pdf' },
        ORG_A, USER,
      );

      expect(result.version).toBe(2);
      expect(result.supersedesId).toBe('ds-1');
      expect(current.isActive).toBe(false);
    });

    it('does not auto-supersede multi-instance types like PHOTO', async () => {
      materialRepo.findOne.mockResolvedValue(sourceMaterial());
      txManager.findOne.mockResolvedValue({
        id: 'ph-1', documentType: MaterialDocumentType.PHOTO, version: 1, isActive: true,
      });

      const result = await service.addDocument(
        MATERIAL_ID,
        { documentType: MaterialDocumentType.PHOTO, documentUrl: 'https://s/3.jpg' },
        ORG_A, USER,
      );

      expect(result.version).toBe(2);
      expect(result.supersedesId).toBeNull();
    });

    it('rejects superseding a document of a different type', async () => {
      materialRepo.findOne.mockResolvedValue(sourceMaterial());
      txManager.findOne.mockResolvedValue({
        id: 'doc-1', documentType: MaterialDocumentType.DATASHEET, version: 1, isActive: true,
      });

      await expect(service.addDocument(
        MATERIAL_ID,
        { documentType: MaterialDocumentType.MSDS, documentUrl: 'https://s/m.pdf', supersedesId: 'doc-1' },
        ORG_A, USER,
      )).rejects.toThrow(/cannot supersede/);
    });

    it('rejects superseding an already-superseded document', async () => {
      materialRepo.findOne.mockResolvedValue(sourceMaterial());
      txManager.findOne.mockResolvedValue({
        id: 'doc-1', documentType: MaterialDocumentType.PHOTO, version: 1, isActive: false,
      });

      await expect(service.addDocument(
        MATERIAL_ID,
        { documentType: MaterialDocumentType.PHOTO, documentUrl: 'https://s/x.jpg', supersedesId: 'doc-1' },
        ORG_A, USER,
      )).rejects.toThrow(/already been superseded/);
    });

    it('returns 404 for a material in another organization', async () => {
      materialRepo.findOne.mockResolvedValue(null);
      await expect(service.addDocument(
        MATERIAL_ID, { documentType: MaterialDocumentType.PHOTO, documentUrl: 'https://s/1.jpg' },
        ORG_B, USER,
      )).rejects.toThrow(NotFoundException);
    });
  });

  // ── Legacy URL migration on write ────────────────────────────────

  describe('legacy document input', () => {
    it('converts the flat documents section into typed document rows', async () => {
      materialRepo.findOne.mockResolvedValue(sourceMaterial());

      await service.update(MATERIAL_ID, {
        documents: {
          datasheetUrl: 'https://s/ds.pdf',
          qualityCertificatesUrl: 'https://s/qc.pdf',
          photos: ['https://s/1.jpg', 'https://s/2.jpg'],
        },
      } as any, ORG_A, USER);

      const types = savedDocs().map(d => d.documentType);
      expect(types).toContain(MaterialDocumentType.DATASHEET);
      expect(types).toContain(MaterialDocumentType.QUALITY_CERTIFICATE);
      expect(types.filter(t => t === MaterialDocumentType.PHOTO)).toHaveLength(2);
    });

    it('accepts the richer documentList shape', async () => {
      materialRepo.findOne.mockResolvedValue(sourceMaterial());

      await service.update(MATERIAL_ID, {
        documentList: [{
          documentType: MaterialDocumentType.MILL_CERTIFICATE,
          documentUrl: 'https://s/mill.pdf',
          title: 'Heat 12345',
          expiryDate: '2030-01-01',
        }],
      } as any, ORG_A, USER);

      const [doc] = savedDocs().filter(d => d.documentType === MaterialDocumentType.MILL_CERTIFICATE);
      expect(doc.documentUrl).toBe('https://s/mill.pdf');
      expect(doc.title).toBe('Heat 12345');
    });

    it('never writes the deprecated flat columns straight from the payload', async () => {
      materialRepo.findOne.mockResolvedValue(sourceMaterial());
      txManager.find.mockResolvedValue([
        { documentType: MaterialDocumentType.DATASHEET, documentUrl: 'https://s/ds-v2.pdf' },
        { documentType: MaterialDocumentType.PHOTO,     documentUrl: 'https://s/1.jpg' },
        { documentType: MaterialDocumentType.PHOTO,     documentUrl: 'https://s/2.jpg' },
      ]);

      await service.update(MATERIAL_ID, {
        documentList: [{ documentType: MaterialDocumentType.DATASHEET, documentUrl: 'https://s/ds-v2.pdf' }],
      } as any, ORG_A, USER);

      // They are re-derived from material_documents instead.
      expect(txManager.update).toHaveBeenCalledWith(
        Material,
        { id: MATERIAL_ID, organizationId: ORG_A },
        expect.objectContaining({
          datasheetUrl: 'https://s/ds-v2.pdf',
          photos: ['https://s/1.jpg', 'https://s/2.jpg'],
        }),
      );
    });
  });

  // ── Backfill ─────────────────────────────────────────────────────

  describe('backfillLegacyDocuments', () => {
    it('migrates flat URLs into document rows, flagged isMigrated', async () => {
      materialRepo.find.mockResolvedValue([sourceMaterial()]);

      const result = await service.backfillLegacyDocuments(ORG_A, USER);

      expect(result.materialsBackfilled).toBe(1);
      expect(result.documentsCreated).toBe(2); // datasheet + 1 photo
      expect(savedDocs().every(d => d.isMigrated)).toBe(true);
    });

    it('skips materials that already have documents, so it is re-runnable', async () => {
      materialRepo.find.mockResolvedValue([sourceMaterial()]);
      documentRepo.count.mockResolvedValue(3);

      const result = await service.backfillLegacyDocuments(ORG_A, USER);

      expect(result.materialsBackfilled).toBe(0);
      expect(result.documentsCreated).toBe(0);
    });

    it('skips materials with no legacy URLs at all', async () => {
      materialRepo.find.mockResolvedValue([
        sourceMaterial({ datasheetUrl: null, photos: null } as Partial<Material>),
      ]);

      const result = await service.backfillLegacyDocuments(ORG_A, USER);

      expect(result.materialsScanned).toBe(1);
      expect(result.materialsBackfilled).toBe(0);
    });
  });
});

// ══ Documents on the fetch endpoints ══════════════════════════════════════

describe('MaterialService — documents in fetch responses', () => {
  let service: MaterialService;
  let materialRepo: any;
  let documentRepo: any;
  let qb: any;

  const docRow = (overrides: Record<string, any> = {}) => ({
    id: 'doc-1',
    dguid: 'doc-dguid-1',
    materialId: MATERIAL_ID,
    documentType: MaterialDocumentType.DATASHEET,
    documentUrl: 'https://s/ds-v2.pdf',
    fileName: 'ds-v2.pdf',
    version: 2,
    supersedesId: 'doc-0',
    isActive: true,
    isDeleted: false,
    isMigrated: false,
    expiryDate: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

  function makeQb(overrides: Record<string, any> = {}) {
    const builder: any = {
      select:            jest.fn(() => builder),
      leftJoinAndSelect: jest.fn(() => builder),
      where:             jest.fn(() => builder),
      andWhere:          jest.fn(() => builder),
      orderBy:           jest.fn(() => builder),
      skip:              jest.fn(() => builder),
      take:              jest.fn(() => builder),
      getMany:           jest.fn(async () => []),
      getManyAndCount:   jest.fn(async () => [[], 0]),
    };
    Object.assign(builder, overrides);
    return builder;
  }

  beforeEach(async () => {
    qb = makeQb();
    materialRepo = makeRepo({ createQueryBuilder: jest.fn(() => qb) });
    documentRepo = makeRepo({ count: jest.fn(async () => 0) });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialService, MaterialCodeService, MaterialUsageValidationService,
        { provide: getRepositoryToken(Material),            useValue: materialRepo },
        { provide: getRepositoryToken(MaterialCodeCounter), useValue: makeRepo() },
        { provide: getRepositoryToken(MaterialDocument),    useValue: documentRepo },
        { provide: getRepositoryToken(MaterialCategory),    useValue: makeRepo() },
        { provide: getRepositoryToken(MaterialGroup),       useValue: makeRepo() },
        { provide: getRepositoryToken(UnitOfMeasurement),   useValue: makeRepo() },
        { provide: getRepositoryToken(User),                useValue: makeRepo() },
        { provide: DataSource,          useValue: { createQueryRunner: jest.fn(), transaction: jest.fn() } },
        { provide: CloudStorageService, useValue: { isFileValid: jest.fn(), uploadFile: jest.fn() } },
      ],
    }).compile();

    service = module.get(MaterialService);
  });

  // ── GET /materials/:id ───────────────────────────────────────────

  describe('findOne', () => {
    it('returns the material with its current documents', async () => {
      materialRepo.findOne.mockResolvedValue(sourceMaterial());
      documentRepo.find.mockResolvedValue([docRow()]);

      const result = await service.findOne(MATERIAL_ID, ORG_A);

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]).toMatchObject({
        id: 'doc-1',
        documentType: MaterialDocumentType.DATASHEET,
        documentUrl: 'https://s/ds-v2.pdf',
        version: 2,
        supersedesId: 'doc-0',
        isActive: true,
      });
      // Still carries the material's own fields.
      expect(result.code).toBe('RAW000007');
    });

    it('excludes superseded and deleted documents', async () => {
      materialRepo.findOne.mockResolvedValue(sourceMaterial());
      documentRepo.find.mockResolvedValue([]);

      await service.findOne(MATERIAL_ID, ORG_A);

      expect(documentRepo.find).toHaveBeenCalledWith({
        where: { materialId: MATERIAL_ID, organizationId: ORG_A, isDeleted: false, isActive: true },
        order: { documentType: 'ASC', version: 'DESC' },
      });
    });

    it('scopes the document lookup to the caller organization', async () => {
      materialRepo.findOne.mockResolvedValue(sourceMaterial());
      documentRepo.find.mockResolvedValue([]);

      await service.findOne(MATERIAL_ID, ORG_B);

      expect(documentRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: ORG_B }) }),
      );
    });

    it('returns an empty array when the material has no documents', async () => {
      materialRepo.findOne.mockResolvedValue(sourceMaterial());
      documentRepo.find.mockResolvedValue([]);

      const result = await service.findOne(MATERIAL_ID, ORG_A);

      expect(result.documents).toEqual([]);
    });

    it('derives expiry flags on each document', async () => {
      materialRepo.findOne.mockResolvedValue(sourceMaterial());
      documentRepo.find.mockResolvedValue([
        docRow({ id: 'expired', expiryDate: new Date('2020-01-01') }),
        docRow({ id: 'valid',   expiryDate: new Date('2999-01-01') }),
      ]);

      const result = await service.findOne(MATERIAL_ID, ORG_A);

      expect(result.documents.find(d => d.id === 'expired').isExpired).toBe(true);
      expect(result.documents.find(d => d.id === 'valid').isExpired).toBe(false);
    });

    it('still 404s for a material in another organization', async () => {
      materialRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(MATERIAL_ID, ORG_B)).rejects.toThrow(NotFoundException);
      expect(documentRepo.find).not.toHaveBeenCalled();
    });
  });

  // ── GET /materials ───────────────────────────────────────────────

  describe('findAll', () => {
    it('joins current documents onto every list row', async () => {
      qb.getManyAndCount.mockResolvedValue([
        [{ ...sourceMaterial(), documents: [docRow()] }],
        1,
      ]);

      const result = await service.findAll({} as any, ORG_A);

      expect(result.data[0].documents).toHaveLength(1);
      expect(result.data[0].documents[0].documentUrl).toBe('https://s/ds-v2.pdf');
    });

    it('filters the join to active, non-deleted documents', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({} as any, ORG_A);

      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'm.documents',
        'documents',
        'documents.isDeleted = false AND documents.isActive = true',
      );
    });

    it('returns an empty array for a material with no documents', async () => {
      qb.getManyAndCount.mockResolvedValue([[sourceMaterial()], 1]);

      const result = await service.findAll({} as any, ORG_A);

      expect(result.data[0].documents).toEqual([]);
    });

    it('keeps the existing pagination envelope', async () => {
      qb.getManyAndCount.mockResolvedValue([[sourceMaterial()], 1]);

      const result = await service.findAll({ page: 1, limit: 20 } as any, ORG_A);

      expect(result).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 });
    });
  });

  // ── GET /materials/active ────────────────────────────────────────

  describe('findActive', () => {
    it('includes current documents on each dropdown entry', async () => {
      qb.getMany.mockResolvedValue([{ ...sourceMaterial(), documents: [docRow()] }]);

      const [item] = await service.findActive(ORG_A);

      expect(item.documents).toHaveLength(1);
      expect(item.documents[0].documentType).toBe(MaterialDocumentType.DATASHEET);
      expect(item.code).toBe('RAW000007');
    });

    it('filters the join to active, non-deleted documents', async () => {
      qb.getMany.mockResolvedValue([]);

      await service.findActive(ORG_A);

      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'm.documents',
        'documents',
        'documents.isDeleted = false AND documents.isActive = true',
      );
    });

    it('still restricts to ACTIVE, non-deleted materials in the organization', async () => {
      qb.getMany.mockResolvedValue([]);

      await service.findActive(ORG_A);

      expect(qb.where).toHaveBeenCalledWith(
        'm.organizationId = :organizationId', { organizationId: ORG_A },
      );
      const clauses = qb.andWhere.mock.calls.map((c: any[]) => c[0]).join(' | ');
      expect(clauses).toContain('m.isDeleted = false');
      expect(clauses).toContain('m.status = :status');
    });

    it('still honours the category and group filters', async () => {
      qb.getMany.mockResolvedValue([]);

      await service.findActive(ORG_A, CAT_ID, GRP_ID);

      expect(qb.andWhere).toHaveBeenCalledWith('m.materialCategoryId = :catId', { catId: CAT_ID });
      expect(qb.andWhere).toHaveBeenCalledWith('m.materialGroupId = :grpId',    { grpId: GRP_ID });
    });

    it('exposes the purchase-order lock so a picker can flag frozen items', async () => {
      qb.getMany.mockResolvedValue([
        { ...sourceMaterial({ isPurchaseOrderIssued: true } as Partial<Material>), documents: [] },
      ]);

      const [item] = await service.findActive(ORG_A);

      expect(item.isPurchaseOrderIssued).toBe(true);
    });
  });
});

// ══ Purchase-order lock matrix ════════════════════════════════════════════
//
// One table covering every operation against every lock state, so the agreed
// rules are readable in one place rather than scattered across suites.

describe('MaterialService — purchase-order lock matrix', () => {
  let service: MaterialService;
  let materialRepo: any;
  let documentRepo: any;
  let txManager: any;
  let saved: Array<{ entity: any; rows: any }>;

  const PO_AT = new Date('2026-02-01T00:00:00Z');

  const locked = (overrides: Partial<Material> = {}) => sourceMaterial({
    isPurchaseOrderIssued: true,
    purchaseOrderIssuedAt: PO_AT,
    purchaseOrderReference: 'PO-2026-0451',
    ...overrides,
  } as Partial<Material>);

  // Filed before the PO — part of what the supplier was contracted against.
  const preP0Doc = () => ({
    id: 'doc-pre', materialId: MATERIAL_ID, organizationId: ORG_A,
    documentType: MaterialDocumentType.QUALITY_CERTIFICATE,
    version: 1, isActive: true, isDeleted: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  });

  // Filed after the PO — not part of the order basis.
  const postPoDoc = () => ({
    id: 'doc-post', materialId: MATERIAL_ID, organizationId: ORG_A,
    documentType: MaterialDocumentType.INSPECTION_REPORT,
    version: 1, isActive: true, isDeleted: false,
    createdAt: new Date('2026-06-01T00:00:00Z'),
  });

  beforeEach(async () => {
    saved = [];
    txManager = {
      create:  jest.fn((_e: any, v: any) => v),
      save:    jest.fn(async (e: any, v: any) => { saved.push({ entity: e, rows: v }); return v; }),
      find:    jest.fn(async () => []),
      findOne: jest.fn(async () => null),
      update:  jest.fn(async () => ({ affected: 1 })),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(), getRawOne: jest.fn(async () => ({ max: 0 })),
      })),
    };
    materialRepo = makeRepo();
    documentRepo = makeRepo({ count: jest.fn(async () => 0) });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialService, MaterialCodeService, MaterialUsageValidationService,
        { provide: getRepositoryToken(Material),            useValue: materialRepo },
        { provide: getRepositoryToken(MaterialCodeCounter), useValue: makeRepo() },
        { provide: getRepositoryToken(MaterialDocument),    useValue: documentRepo },
        { provide: getRepositoryToken(MaterialCategory),    useValue: makeRepo() },
        { provide: getRepositoryToken(MaterialGroup),       useValue: makeRepo() },
        { provide: getRepositoryToken(UnitOfMeasurement),   useValue: makeRepo() },
        { provide: getRepositoryToken(User),                useValue: makeRepo() },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
            transaction: jest.fn(async (cb: any) => cb(txManager)),
          },
        },
        { provide: CloudStorageService, useValue: { isFileValid: jest.fn(), uploadFile: jest.fn() } },
      ],
    }).compile();

    service = module.get(MaterialService);
    jest.spyOn(service, 'findOne').mockResolvedValue({} as any);
  });

  // ── DELETE /materials/:id — blocked whenever locked ──────────────

  describe('DELETE /materials/:id', () => {
    it('is refused when the material is PO-locked', async () => {
      materialRepo.findOne.mockResolvedValue(locked());
      await expect(service.remove(MATERIAL_ID, ORG_A, USER)).rejects.toThrow(ConflictException);
    });

    it('is refused regardless of when the PO was issued', async () => {
      materialRepo.findOne.mockResolvedValue(locked({
        purchaseOrderIssuedAt: new Date('2099-01-01T00:00:00Z'),
      } as Partial<Material>));
      await expect(service.remove(MATERIAL_ID, ORG_A, USER)).rejects.toThrow(ConflictException);
    });

    it('is allowed when the material is not locked', async () => {
      materialRepo.findOne.mockResolvedValue(sourceMaterial());
      await expect(service.remove(MATERIAL_ID, ORG_A, USER)).resolves.toBeUndefined();
    });
  });

  // ── DELETE document — conditional on filing date ─────────────────

  describe('DELETE /materials/:id/documents/:documentId', () => {
    it('is REFUSED for a document filed before the PO was issued', async () => {
      materialRepo.findOne.mockResolvedValue(locked());
      documentRepo.findOne.mockResolvedValue(preP0Doc());

      await expect(
        service.removeDocument(MATERIAL_ID, 'doc-pre', ORG_A, USER),
      ).rejects.toThrow(ConflictException);
    });

    it('names the purchase order in the refusal', async () => {
      materialRepo.findOne.mockResolvedValue(locked());
      documentRepo.findOne.mockResolvedValue(preP0Doc());

      await expect(
        service.removeDocument(MATERIAL_ID, 'doc-pre', ORG_A, USER),
      ).rejects.toThrow(/PO-2026-0451/);
    });

    it('is ALLOWED for a document filed after the PO was issued', async () => {
      const doc = postPoDoc();
      materialRepo.findOne.mockResolvedValue(locked());
      documentRepo.findOne.mockResolvedValue(doc);

      await service.removeDocument(MATERIAL_ID, 'doc-post', ORG_A, USER);

      expect(doc.isDeleted).toBe(true);
      expect(doc.isActive).toBe(false);
      expect((doc as any).deletedBy).toBe(USER);
    });

    it('is ALLOWED for any document when the material is not locked', async () => {
      const doc = preP0Doc();
      materialRepo.findOne.mockResolvedValue(sourceMaterial());
      documentRepo.findOne.mockResolvedValue(doc);

      await service.removeDocument(MATERIAL_ID, 'doc-pre', ORG_A, USER);

      expect(doc.isDeleted).toBe(true);
    });

    it('treats a document filed at the exact PO instant as frozen', async () => {
      materialRepo.findOne.mockResolvedValue(locked());
      documentRepo.findOne.mockResolvedValue({ ...preP0Doc(), createdAt: new Date(PO_AT) });

      await expect(
        service.removeDocument(MATERIAL_ID, 'doc-pre', ORG_A, USER),
      ).rejects.toThrow(ConflictException);
    });

    it('fails closed when the lock flag is set but no issue timestamp exists', async () => {
      // Legacy or seeded data: the record says an order exists, so every
      // document on it is treated as predating that order.
      materialRepo.findOne.mockResolvedValue(locked({ purchaseOrderIssuedAt: null } as Partial<Material>));
      documentRepo.findOne.mockResolvedValue(postPoDoc());

      await expect(
        service.removeDocument(MATERIAL_ID, 'doc-post', ORG_A, USER),
      ).rejects.toThrow(ConflictException);
    });

    it('still 404s for a document that does not belong to the material', async () => {
      materialRepo.findOne.mockResolvedValue(locked());
      documentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeDocument(MATERIAL_ID, 'nope', ORG_A, USER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── POST document — never refused ────────────────────────────────

  describe('POST /materials/:id/documents', () => {
    it('is allowed on an unlocked material', async () => {
      materialRepo.findOne.mockResolvedValue(sourceMaterial());

      const result = await service.addDocument(
        MATERIAL_ID,
        { documentType: MaterialDocumentType.INSPECTION_REPORT, documentUrl: 'https://s/a.pdf' },
        ORG_A, USER,
      );
      expect(result.isActive).toBe(true);
    });

    it('is allowed on a locked material', async () => {
      materialRepo.findOne.mockResolvedValue(locked());

      const result = await service.addDocument(
        MATERIAL_ID,
        { documentType: MaterialDocumentType.INSPECTION_REPORT, documentUrl: 'https://s/b.pdf' },
        ORG_A, USER,
      );
      expect(result.isActive).toBe(true);
    });

    it('is allowed even when the lock flag has no issue timestamp', async () => {
      materialRepo.findOne.mockResolvedValue(locked({ purchaseOrderIssuedAt: null } as Partial<Material>));

      const result = await service.addDocument(
        MATERIAL_ID,
        { documentType: MaterialDocumentType.MILL_CERTIFICATE, documentUrl: 'https://s/c.pdf' },
        ORG_A, USER,
      );
      expect(result.isActive).toBe(true);
    });

    it('is allowed when explicitly superseding a frozen document', async () => {
      materialRepo.findOne.mockResolvedValue(locked());
      txManager.findOne.mockResolvedValue(preP0Doc());

      const result = await service.addDocument(
        MATERIAL_ID,
        {
          documentType: MaterialDocumentType.QUALITY_CERTIFICATE,
          documentUrl: 'https://s/d.pdf',
          supersedesId: 'doc-pre',
        },
        ORG_A, USER,
      );
      expect(result.isActive).toBe(true);
    });
  });
});
