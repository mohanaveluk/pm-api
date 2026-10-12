import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as ExcelJS from 'exceljs';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { MasterCodeService, MasterSequenceKey } from 'src/common/services/master-code.service';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { Material } from '../material/entities/material.entity';
import { Project } from '../project/entities/project.entity';
import { WbsCostCode } from '../wbs-cost-code/entity/wbs-cost-code.entity';

import { MaterialRequisitionService } from './material-requisition.service';
import { MaterialRequisition } from './entities/material-requisition.entity';
import { MaterialRequisitionItem } from './entities/material-requisition-item.entity';
import { MaterialRequisitionDocument } from './entities/material-requisition-document.entity';
import { MaterialRequisitionStatus } from './enums/material-requisition.enums';
import { CreateMaterialRequisitionDto } from './dto/create-material-requisition.dto';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const MR_ID = '33333333-3333-4333-8333-333333333333';
const PROJECT_ID = '44444444-4444-4444-8444-444444444444';
const WBS_ID = '55555555-5555-4555-8555-555555555555';
const MAT_1 = '66666666-6666-4666-8666-666666666661';
const MAT_2 = '66666666-6666-4666-8666-666666666662';
const USER = 'pm@example.com';
const FUTURE = '2999-01-01';

const material = (id: string, code: string, extra: Record<string, unknown> = {}) => ({
  id, code, shortDescription: `${code} description`, status: 'ACTIVE',
  materialCategory: { name: 'Piping' }, materialGroup: { name: 'Pipes' },
  unitOfMeasurement: { symbol: 'MTR', code: 'MTR' }, ...extra,
});

function makeRepo(overrides: Record<string, any> = {}) {
  return {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    count: jest.fn(async () => 0),
    save: jest.fn(async (e: any) => e),
    manager: undefined as any,
    ...overrides,
  };
}

function buildHarness(lastSequence = 0) {
  const saved: Record<string, any[]> = {};
  const deleted: Array<{ entity: string; where: any }> = [];
  const counter = { organizationId: ORG_A, lastSequence };
  const manager: any = {
    create: jest.fn((entity: any, v: any) => ({ id: entity === MaterialRequisition ? MR_ID : 'child', ...v })),
    save: jest.fn(async (entity: any, v: any) => {
      if (entity === MasterCodeCounter) { counter.lastSequence = v.lastSequence; return v; }
      (saved[entity.name] ??= []).push(v);
      return v;
    }),
    findOne: jest.fn(async () => counter),
    count: jest.fn(async () => 0),
    delete: jest.fn(async (entity: any, where: any) => { deleted.push({ entity: entity.name, where }); }),
    transaction: undefined,
  };
  manager.transaction = jest.fn(async (cb: any) => cb(manager));
  const queryRunner = {
    connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(), release: jest.fn(), manager,
  };
  return { saved, deleted, counter, manager, queryRunner, dataSource: { createQueryRunner: jest.fn(() => queryRunner) } };
}

function existingMr(overrides: Partial<MaterialRequisition> = {}): MaterialRequisition {
  return {
    id: MR_ID, dguid: 'd', organizationId: ORG_A, code: '0001', mrNumber: '0001',
    projectId: PROJECT_ID, wbsCostCodeId: WBS_ID, budgetHead: 'CAPEX', requiredOnSiteDate: FUTURE,
    mtoReference: null, pidReference: null, isometricReference: null, areaUnit: null, remarks: null,
    status: MaterialRequisitionStatus.DRAFT, submittedBy: null, submittedAt: null,
    isDeleted: false, createdBy: USER, updatedBy: null,
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
    project: { code: '0042', projectName: 'Unit 4', client: { code: '0007', clientName: 'Gulf' } },
    wbsCostCode: {
      id: WBS_ID, code: '0003', projectDetails: 'Civil works', areaFacility: 'Area 1', systemSubsystem: 'CW',
      workPackage: 'WP-1', activities: 'Excavation',
      discipline: { name: 'Civil', department: { name: 'Engineering' } },
    },
    items: [], documents: [],
    ...overrides,
  } as unknown as MaterialRequisition;
}

function csvFile(text: string, name = 'bom.csv'): Express.Multer.File {
  return { originalname: name, buffer: Buffer.from(text), size: text.length } as Express.Multer.File;
}

describe('MaterialRequisitionService', () => {
  let service: MaterialRequisitionService;
  let mrRepo: any, itemRepo: any, docRepo: any, materialRepo: any, projectRepo: any, wbsRepo: any;
  let harness: ReturnType<typeof buildHarness>;
  let cloud: { isFileValid: jest.Mock; uploadFile: jest.Mock };

  const build = async (lastSequence = 0) => {
    harness = buildHarness(lastSequence);
    mrRepo = makeRepo({ findOne: jest.fn(async () => existingMr()), manager: harness.manager });
    itemRepo = makeRepo();
    docRepo = makeRepo();
    materialRepo = makeRepo({
      find: jest.fn(async () => [material(MAT_1, 'MAT-1'), material(MAT_2, 'MAT-2')]),
    });
    projectRepo = makeRepo({ findOne: jest.fn(async () => ({ id: PROJECT_ID, status: 'ACTIVE' })) });
    wbsRepo = makeRepo({
      findOne: jest.fn(async () => ({ id: WBS_ID, projectId: PROJECT_ID, isActive: true })),
    });
    cloud = {
      isFileValid: jest.fn(async () => true),
      uploadFile: jest.fn(async () => 'https://files.example.com/pm/doc.pdf'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialRequisitionService, MasterCodeService,
        { provide: getRepositoryToken(MaterialRequisition),         useValue: mrRepo },
        { provide: getRepositoryToken(MaterialRequisitionItem),     useValue: itemRepo },
        { provide: getRepositoryToken(MaterialRequisitionDocument), useValue: docRepo },
        { provide: getRepositoryToken(Material),                    useValue: materialRepo },
        { provide: getRepositoryToken(Project),                     useValue: projectRepo },
        { provide: getRepositoryToken(WbsCostCode),                 useValue: wbsRepo },
        { provide: getRepositoryToken(MasterCodeCounter),           useValue: makeRepo() },
        { provide: CloudStorageService, useValue: cloud },
        { provide: DataSource, useValue: harness.dataSource },
        { provide: CustomLoggerService, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), verbose: jest.fn() } },
      ],
    }).compile();
    service = module.get(MaterialRequisitionService);
  };

  beforeEach(() => build(0));

  const base = (extra: Partial<CreateMaterialRequisitionDto> = {}): CreateMaterialRequisitionDto => ({
    projectId: PROJECT_ID, wbsCostCodeId: WBS_ID, requiredOnSiteDate: FUTURE,
    items: [
      { materialId: MAT_1, requestedQty: 200 },
      { materialId: MAT_2, requestedQty: 50 },
    ],
    ...extra,
  } as CreateMaterialRequisitionDto);

  // ── Create ───────────────────────────────────────────────────────

  describe('create', () => {
    it('generates 0001 for the first requisition and uses it as the MR number', async () => {
      await service.create(ORG_A, base(), USER);
      const row = harness.saved['MaterialRequisition'][0];

      expect(row.code).toBe('0001');
      expect(row.mrNumber).toBe('0001');
    });

    it('uses the MATERIAL_REQUISITION sequence key', async () => {
      await build(8);
      await service.create(ORG_A, base(), USER);

      expect(harness.saved['MaterialRequisition'][0].code).toBe('0009');
      expect(harness.manager.findOne).toHaveBeenCalledWith(
        MasterCodeCounter,
        expect.objectContaining({ where: expect.objectContaining({ sequenceKey: MasterSequenceKey.MATERIAL_REQUISITION }) }),
      );
    });

    it('stores a supplied MR number instead of the code, and a blank one falls back to the code', async () => {
      await service.create(ORG_A, base({ mrNumber: ' MR-2026-0001 ' }), USER);
      expect(harness.saved['MaterialRequisition'][0].mrNumber).toBe('MR-2026-0001');

      await build(0);
      await service.create(ORG_A, base({ mrNumber: '   ' }), USER);
      expect(harness.saved['MaterialRequisition'][0].mrNumber).toBe('0001');
    });

    it('rejects an MR number that is already in use', async () => {
      harness.manager.count.mockResolvedValue(1);

      await expect(service.create(ORG_A, base({ mrNumber: 'MR-1' }), USER)).rejects.toThrow(ConflictException);
      expect(harness.saved['MaterialRequisitionItem']).toBeUndefined();
    });

    it('is a draft by default and Under Review when submitted', async () => {
      await service.create(ORG_A, base(), USER);
      expect(harness.saved['MaterialRequisition'][0]).toMatchObject({
        status: MaterialRequisitionStatus.DRAFT, submittedBy: null,
      });

      await build(0);
      await service.create(ORG_A, base({ submit: true }), USER);
      const row = harness.saved['MaterialRequisition'][0];
      expect(row.status).toBe(MaterialRequisitionStatus.UNDER_REVIEW);
      expect(row.submittedBy).toBe(USER);
      expect(row.submittedAt).toBeInstanceOf(Date);
    });

    it('saves each line with a snapshot of the material, in order', async () => {
      await service.create(ORG_A, base(), USER);
      const lines = harness.saved['MaterialRequisitionItem'];

      expect(lines).toHaveLength(2);
      expect(lines[0]).toMatchObject({
        requisitionId: MR_ID, lineNumber: 1, materialId: MAT_1, materialCode: 'MAT-1',
        materialDescription: 'MAT-1 description', uom: 'MTR', requestedQty: 200, source: 'MATERIAL_MASTER',
      });
      expect(lines[1]).toMatchObject({ lineNumber: 2, materialId: MAT_2, requestedQty: 50 });
    });

    it('ignores lines with no quantity or a quantity of 0', async () => {
      await service.create(ORG_A, base({
        items: [
          { materialId: MAT_1, requestedQty: 200 },
          { materialId: MAT_2, requestedQty: 0 },
          { materialId: '66666666-6666-4666-8666-666666666663', requestedQty: null },
          { materialId: '66666666-6666-4666-8666-666666666664' } as any,
        ],
      }), USER);

      const lines = harness.saved['MaterialRequisitionItem'];
      expect(lines).toHaveLength(1);
      expect(lines[0].materialId).toBe(MAT_1);
    });

    it('cannot be submitted with no quantities at all', async () => {
      await expect(service.create(ORG_A, base({
        items: [{ materialId: MAT_1, requestedQty: 0 }], submit: true,
      }), USER)).rejects.toThrow('at least one material with a quantity');
    });

    it('can be saved as a draft with no lines yet', async () => {
      await expect(service.create(ORG_A, base({ items: [] }), USER)).resolves.toBeDefined();
    });

    it('rejects a material listed twice', async () => {
      await expect(service.create(ORG_A, base({
        items: [{ materialId: MAT_1, requestedQty: 1 }, { materialId: MAT_1, requestedQty: 2 }],
      }), USER)).rejects.toThrow('listed more than once');
    });

    it('rejects an unknown or inactive material', async () => {
      materialRepo.find.mockResolvedValue([material(MAT_1, 'MAT-1')]);
      await expect(service.create(ORG_A, base(), USER)).rejects.toThrow('was not found');

      materialRepo.find.mockResolvedValue([
        material(MAT_1, 'MAT-1'), material(MAT_2, 'MAT-2', { status: 'OBSOLETE' }),
      ]);
      await expect(service.create(ORG_A, base(), USER)).rejects.toThrow('MAT-2 is not active');
    });

    describe('header', () => {
      it('requires an open project of the organization', async () => {
        projectRepo.findOne.mockResolvedValue(null);
        await expect(service.create(ORG_A, base(), USER)).rejects.toThrow('project was not found');

        projectRepo.findOne.mockResolvedValue({ id: PROJECT_ID, status: 'COMPLETED' });
        await expect(service.create(ORG_A, base(), USER)).rejects.toThrow('project is closed');
      });

      it('requires the WBS / cost code to belong to the chosen project', async () => {
        wbsRepo.findOne.mockResolvedValue({ id: WBS_ID, projectId: 'another-project', isActive: true });
        await expect(service.create(ORG_A, base(), USER)).rejects.toThrow('does not belong to the chosen project');

        wbsRepo.findOne.mockResolvedValue(null);
        await expect(service.create(ORG_A, base(), USER)).rejects.toThrow('WBS / cost code was not found');
      });

      it('needs a WBS and a required-on-site date to submit, but not to save a draft', async () => {
        await expect(service.create(ORG_A, base({ wbsCostCodeId: null, requiredOnSiteDate: null }), USER))
          .resolves.toBeDefined();

        await expect(service.create(
          ORG_A, base({ wbsCostCodeId: null, requiredOnSiteDate: null, submit: true }), USER,
        )).rejects.toThrow('a WBS / cost code, the required-on-site date');
      });

      it('refuses a required-on-site date in the past when submitting only', async () => {
        await expect(service.create(ORG_A, base({ requiredOnSiteDate: '2020-01-01' }), USER)).resolves.toBeDefined();
        await expect(service.create(ORG_A, base({ requiredOnSiteDate: '2020-01-01', submit: true }), USER))
          .rejects.toThrow('cannot be in the past');
      });

      it('rejects a date that is not on the calendar', async () => {
        await expect(service.create(ORG_A, base({ requiredOnSiteDate: '2026-02-30' }), USER))
          .rejects.toThrow('not a valid date');
      });
    });

    describe('documents', () => {
      const doc = (type: string, name: string) => ({
        documentType: type, documentName: name, documentUrl: `https://f/${name}.pdf`,
      }) as any;

      it('saves the supplied documents', async () => {
        await service.create(ORG_A, base({
          documents: [doc('SPECIFICATION', 'Spec A'), doc('PROJECT_DOCUMENT', 'Drawings')],
        }), USER);

        expect(harness.saved['MaterialRequisitionDocument'].map((d: any) => d.documentName))
          .toEqual(['Spec A', 'Drawings']);
      });

      it('keeps only the last covering document — a new upload replaces the old', async () => {
        await service.create(ORG_A, base({
          documents: [doc('COVERING_DOCUMENT', 'Old cover'), doc('SPECIFICATION', 'Spec A'), doc('COVERING_DOCUMENT', 'New cover')],
        }), USER);

        const names = harness.saved['MaterialRequisitionDocument'].map((d: any) => d.documentName);
        expect(names).toEqual(['Spec A', 'New cover']);
      });
    });

    it('rolls back without consuming a number when the insert fails', async () => {
      harness.manager.save.mockRejectedValue(new Error('db down'));

      await expect(service.create(ORG_A, base(), USER)).rejects.toThrow('db down');
      expect(harness.queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(harness.queryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  // ── Read ─────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the client, WBS details and lines read through the relationships', async () => {
      mrRepo.findOne.mockResolvedValue(existingMr({
        items: [{ id: 'i1', lineNumber: 1, materialId: MAT_1, materialCode: 'MAT-1', materialDescription: 'Pipe',
          uom: 'MTR', requestedQty: '200.000', source: 'MATERIAL_MASTER', sourceReference: null }] as any,
      }));

      const result = await service.findOne(ORG_A, MR_ID);

      expect(result).toMatchObject({ projectCode: '0042', clientCode: '0007', clientName: 'Gulf', itemCount: 1 });
      expect(result.wbs).toMatchObject({
        code: '0003', name: 'Civil works', areaFacility: 'Area 1', disciplineName: 'Civil',
        departmentName: 'Engineering', workPackage: 'WP-1', activities: 'Excavation',
      });
      expect(result.items[0]).toMatchObject({ requestedQty: 200, stockOnHand: 0 });
    });

    it('404s for another organization', async () => {
      mrRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('other-org', MR_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── Update / submit / delete ─────────────────────────────────────

  describe('update', () => {
    it('replaces lines and documents when they are sent', async () => {
      await service.update(ORG_A, MR_ID, { items: [{ materialId: MAT_1, requestedQty: 5 }], documents: [] } as any, USER);

      expect(harness.deleted.map((d) => d.entity).sort())
        .toEqual(['MaterialRequisitionDocument', 'MaterialRequisitionItem']);
      expect(harness.saved['MaterialRequisitionItem'][0]).toMatchObject({ materialId: MAT_1, requestedQty: 5 });
    });

    it('leaves lines and documents alone when they are not sent', async () => {
      await service.update(ORG_A, MR_ID, { budgetHead: 'OPEX' } as any, USER);

      expect(harness.deleted).toHaveLength(0);
      expect(harness.saved['MaterialRequisition']).toHaveLength(1);
    });

    it('refuses a requisition that has been submitted', async () => {
      mrRepo.findOne.mockResolvedValue(existingMr({ status: MaterialRequisitionStatus.UNDER_REVIEW }));
      await expect(service.update(ORG_A, MR_ID, { budgetHead: 'x' } as any, USER)).rejects.toThrow(ConflictException);
    });

    it('drops the WBS when the project changes and none is sent', async () => {
      const mr = existingMr();
      mrRepo.findOne.mockResolvedValue(mr);

      await service.update(ORG_A, MR_ID, { projectId: '77777777-7777-4777-8777-777777777777' } as any, USER);

      expect(mr.wbsCostCodeId).toBeNull();
    });

    it('rejects a code change', async () => {
      await expect(service.update(ORG_A, MR_ID, { code: 'X' } as any, USER)).rejects.toThrow(ConflictException);
    });

    it('saves and submits in one call', async () => {
      const mr = existingMr();
      mrRepo.findOne.mockResolvedValue(mr);

      await service.update(ORG_A, MR_ID, { submit: true, items: [{ materialId: MAT_1, requestedQty: 5 }] } as any, USER);

      expect(mr.status).toBe(MaterialRequisitionStatus.UNDER_REVIEW);
    });
  });

  describe('submit', () => {
    it('moves a draft to Under Review', async () => {
      const mr = existingMr();
      mrRepo.findOne.mockResolvedValue(mr);
      itemRepo.count.mockResolvedValue(2);

      await service.submit(ORG_A, MR_ID, USER);

      expect(mr).toMatchObject({ status: MaterialRequisitionStatus.UNDER_REVIEW, submittedBy: USER });
    });

    it('refuses a draft with no lines', async () => {
      itemRepo.count.mockResolvedValue(0);
      await expect(service.submit(ORG_A, MR_ID, USER)).rejects.toThrow('at least one material');
    });

    it('refuses one already submitted', async () => {
      mrRepo.findOne.mockResolvedValue(existingMr({ status: MaterialRequisitionStatus.UNDER_REVIEW }));
      await expect(service.submit(ORG_A, MR_ID, USER)).rejects.toThrow(ConflictException);
    });
  });

  describe('changeStatus', () => {
    it('puts a submitted requisition on hold and releases it back to review', async () => {
      const mr = existingMr({ status: MaterialRequisitionStatus.UNDER_REVIEW });
      mrRepo.findOne.mockResolvedValue(mr);

      await service.changeStatus(ORG_A, MR_ID, MaterialRequisitionStatus.ON_HOLD, USER);
      expect(mr.status).toBe(MaterialRequisitionStatus.ON_HOLD);

      await service.changeStatus(ORG_A, MR_ID, MaterialRequisitionStatus.UNDER_REVIEW, USER);
      expect(mr.status).toBe(MaterialRequisitionStatus.UNDER_REVIEW);
    });

    it('refuses to move a draft', async () => {
      mrRepo.findOne.mockResolvedValue(existingMr());
      await expect(service.changeStatus(ORG_A, MR_ID, MaterialRequisitionStatus.ON_HOLD, USER))
        .rejects.toThrow(ConflictException);
    });

    it('treats obsolete as final', async () => {
      mrRepo.findOne.mockResolvedValue(existingMr({ status: MaterialRequisitionStatus.OBSOLETE }));
      await expect(service.changeStatus(ORG_A, MR_ID, MaterialRequisitionStatus.UNDER_REVIEW, USER))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('soft-deletes a draft only', async () => {
      const mr = existingMr();
      mrRepo.findOne.mockResolvedValue(mr);
      await service.remove(ORG_A, MR_ID, USER);
      expect(mr).toMatchObject({ isDeleted: true, deletedBy: USER });

      mrRepo.findOne.mockResolvedValue(existingMr({ status: MaterialRequisitionStatus.UNDER_REVIEW }));
      await expect(service.remove(ORG_A, MR_ID, USER)).rejects.toThrow(ConflictException);
    });
  });

  // ── Sources ──────────────────────────────────────────────────────

  describe('material search', () => {
    it('returns every active material by default, with stock on hand 0', async () => {
      const qb: any = {};
      for (const m of ['leftJoinAndSelect', 'where', 'andWhere', 'orderBy', 'skip', 'take']) qb[m] = jest.fn(() => qb);
      qb.getManyAndCount = jest.fn(async () => [[material(MAT_1, 'MAT-1')], 1]);
      materialRepo.createQueryBuilder = jest.fn(() => qb);

      const result = await service.searchMaterials(ORG_A, {} as any);

      expect(qb.andWhere).toHaveBeenCalledWith('m.status = :active', { active: 'ACTIVE' });
      expect(qb.andWhere).not.toHaveBeenCalledWith(expect.stringContaining('LIKE'), expect.anything());
      expect(result.items[0]).toMatchObject({ code: 'MAT-1', uom: 'MTR', stockOnHand: 0, categoryName: 'Piping' });
    });

    it('filters by text, category, group and unit', async () => {
      const qb: any = {};
      for (const m of ['leftJoinAndSelect', 'where', 'andWhere', 'orderBy', 'skip', 'take']) qb[m] = jest.fn(() => qb);
      qb.getManyAndCount = jest.fn(async () => [[], 0]);
      materialRepo.createQueryBuilder = jest.fn(() => qb);

      await service.searchMaterials(ORG_A, {
        search: ' 50%_X ', materialCategoryId: 'c', materialGroupId: 'g', unitOfMeasurementId: 'u',
      } as any);

      const like = qb.andWhere.mock.calls.find((c: any[]) => String(c[0]).includes('LIKE'));
      expect(like[1]).toEqual({ like: '%50\\%\\_x%' });
      expect(qb.andWhere).toHaveBeenCalledWith('m.materialCategoryId = :materialCategoryId', { materialCategoryId: 'c' });
      expect(qb.andWhere).toHaveBeenCalledWith('m.materialGroupId = :materialGroupId', { materialGroupId: 'g' });
      expect(qb.andWhere).toHaveBeenCalledWith('m.unitOfMeasurementId = :unitOfMeasurementId', { unitOfMeasurementId: 'u' });
    });
  });

  describe('BOM', () => {
    const bomQb = (materials: any[]) => {
      const qb: any = {};
      for (const m of ['leftJoinAndSelect', 'where', 'andWhere']) qb[m] = jest.fn(() => qb);
      qb.getMany = jest.fn(async () => materials);
      materialRepo.createQueryBuilder = jest.fn(() => qb);
    };

    it('reads the columns and suggests the likely ones', async () => {
      const result = await service.getBomColumns(csvFile('Item Code,Description,Quantity,UOM\nMAT-1,Pipe,5,MTR\n'));

      expect(result.columns).toEqual(['Item Code', 'Description', 'Quantity', 'UOM']);
      expect(result.rowCount).toBe(1);
      expect(result.suggested).toEqual({
        codeColumn: 'Item Code', descriptionColumn: 'Description', quantityColumn: 'Quantity', uomColumn: 'UOM',
      });
    });

    it('reads an Excel workbook too', async () => {
      const wb = new ExcelJS.Workbook();
      const sheet = wb.addWorksheet('BOM');
      sheet.addRow(['Material Code', 'Qty']);
      sheet.addRow(['MAT-1', 12]);
      const buffer = Buffer.from(await wb.xlsx.writeBuffer());

      const result = await service.getBomColumns({ originalname: 'bom.xlsx', buffer, size: buffer.length } as any);

      expect(result.columns).toEqual(['Material Code', 'Qty']);
      expect(result.suggested.quantityColumn).toBe('Qty');
    });

    it('matches codes case-insensitively, adds up repeated rows and reports the rest', async () => {
      bomQb([material(MAT_1, 'MAT-1')]);
      const file = csvFile(
        'Item Code,Quantity\nmat-1,5\nMAT-1,"1,000"\nMAT-9,3\nMAT-1,abc\n,4\n',
      );

      const result = await service.previewBom(ORG_A, file, { codeColumn: 'Item Code', quantityColumn: 'Quantity' });

      expect(result.matched).toHaveLength(1);
      expect(result.matched[0]).toMatchObject({ code: 'MAT-1', referenceQty: 1005, stockOnHand: 0 });
      expect(result.issues.map((i) => i.reason)).toEqual([
        'Not found in the Material Master, or the material is not active',
        'Quantity must be a number greater than 0',
        'Material code is empty',
      ].sort((a, b) => 0));
      expect(result.issues).toHaveLength(3);
      expect(result.totalRows).toBe(5);
    });

    it('requires the code and quantity columns, and rejects a column that is not in the file', async () => {
      const file = csvFile('Item Code,Quantity\nMAT-1,1\n');

      await expect(service.previewBom(ORG_A, file, { quantityColumn: 'Quantity' })).rejects.toThrow('material code');
      await expect(service.previewBom(ORG_A, file, { codeColumn: 'Item Code' })).rejects.toThrow('quantity');
      await expect(service.previewBom(ORG_A, file, { codeColumn: 'Nope', quantityColumn: 'Quantity' }))
        .rejects.toThrow('is not in the file');
    });

    it('rejects an unsupported or oversized file', async () => {
      await expect(service.getBomColumns(csvFile('x', 'bom.pdf'))).rejects.toThrow('Unsupported file type');
      await expect(service.getBomColumns({ originalname: 'a.csv', buffer: Buffer.from('x'), size: 6 * 1024 * 1024 } as any))
        .rejects.toThrow('larger than 5 MB');
    });
  });

  describe('document upload', () => {
    it('stores the file under the organization folder', async () => {
      const result = await service.uploadDocument(ORG_A, { originalname: 'cover.pdf' } as any);

      expect(cloud.uploadFile).toHaveBeenCalledWith(expect.anything(), `pm/material-requisition/${ORG_A}`);
      expect(result.url).toBe('https://files.example.com/pm/doc.pdf');
    });
  });

  // ── DTO contract ─────────────────────────────────────────────────

  describe('CreateMaterialRequisitionDto', () => {
    const errorsFor = async (payload: object, options = {}) =>
      (await validate(plainToInstance(CreateMaterialRequisitionDto, payload), options)).map((e) => e.property);

    it('validates with only a project', async () => {
      expect(await errorsFor({ projectId: PROJECT_ID })).toEqual([]);
    });

    it('requires a project and rejects a malformed date', async () => {
      expect(await errorsFor({})).toContain('projectId');
      expect(await errorsFor({ projectId: PROJECT_ID, requiredOnSiteDate: '15/10/2026' })).toContain('requiredOnSiteDate');
    });

    it('has no code field', async () => {
      expect(await errorsFor({ projectId: PROJECT_ID, code: '1' }, { whitelist: true, forbidNonWhitelisted: true }))
        .toContain('code');
    });

    it('validates nested lines and documents', async () => {
      const dto = plainToInstance(CreateMaterialRequisitionDto, {
        projectId: PROJECT_ID,
        items: [{ materialId: 'nope', requestedQty: -1 }],
        documents: [{ documentType: 'COVERING_DOCUMENT', documentName: 'x', documentUrl: 'not a url' }],
      });
      const errors = await validate(dto);
      const lineProps = errors.find((e) => e.property === 'items')!.children![0].children!.map((c) => c.property);
      const docProps = errors.find((e) => e.property === 'documents')!.children![0].children!.map((c) => c.property);

      expect(lineProps).toEqual(expect.arrayContaining(['materialId', 'requestedQty']));
      expect(docProps).toContain('documentUrl');
    });

    it('accepts a decimal quantity up to three places only', async () => {
      const ok = plainToInstance(CreateMaterialRequisitionDto, {
        projectId: PROJECT_ID, items: [{ materialId: MAT_1, requestedQty: 2.5 }],
      });
      expect(await validate(ok)).toHaveLength(0);

      const bad = plainToInstance(CreateMaterialRequisitionDto, {
        projectId: PROJECT_ID, items: [{ materialId: MAT_1, requestedQty: 2.12345 }],
      });
      expect(await validate(bad)).not.toHaveLength(0);
    });
  });
});
