import { UnprocessableEntityException, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { MaterialImportService } from './material-import.service';

const ORG = 'org-1';
const CAT = { id: 'cat-1', name: 'Raw Material', isActive: true };
const GRP = { id: 'grp-1', name: 'Raw Material Group', materialCategoryId: 'cat-1', isActive: true };
const UOM = { id: 'uom-1', code: 'NOS', name: 'Numbers', symbol: 'Nos', shortName: null, isActive: true };

function file(name: string, content: string | Buffer): Express.Multer.File {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return { originalname: name, buffer, size: buffer.length } as Express.Multer.File;
}

describe('MaterialImportService', () => {
  let service: MaterialImportService;
  let existing: any[];
  let saved: any[];
  let qr: any;

  beforeEach(() => {
    existing = [];
    saved = [];
    qr = {
      connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(), release: jest.fn(),
      manager: {
        create: jest.fn((_e: any, v: any) => v),
        save: jest.fn(async (_e: any, v: any) => { saved.push(v); return v; }),
      },
    };
    const repo = (rows: any[]) => ({ find: jest.fn(async () => rows) });
    const materialRepo = { find: jest.fn(async () => existing) };
    service = new MaterialImportService(
      materialRepo as any, repo([CAT]) as any, repo([GRP]) as any, repo([UOM]) as any,
      { createQueryRunner: () => qr } as any,
      { deriveCategoryPrefix: () => 'RAW', generateCode: jest.fn(async () => 'RAW000001') } as any,
      { generateCode: jest.fn(async () => '0001') } as any,
    );
  });

  const csv = 'Code,Short Description,Long Description,UOM,Material Category,Material Group\n' +
    '1,HDMI Cable,HDMI Cable to VGA,Nos,Raw Material,Raw Material Group\n' +
    '2,VGA Cable,VGA Cable,nos,RAW MATERIAL,raw material group\n';

  it('imports a CSV, matching category/group/uom case-insensitively and generating codes', async () => {
    const result = await service.import(file('m.csv', csv), ORG, 'a@b.c');
    expect(result).toMatchObject({ total: 2, created: 2, updated: 0 });
    expect(saved[0]).toMatchObject({
      shortDescription: 'HDMI Cable', materialCategoryId: 'cat-1', materialGroupId: 'grp-1',
      unitOfMeasurementId: 'uom-1', code: 'RAW000001',
    });
    expect(qr.commitTransaction).toHaveBeenCalled();
  });

  it('matches category/group/uom regardless of case and singular/plural, in either direction', async () => {
    // DB is singular ("Raw Material" / "Raw Material Group"); file sends plural + mixed case.
    const pluralCsv = 'Short Description,UOM,Material Category,Material Group\n' +
      'Keyboard,NUMBERS,Raw Materials,Raw Material Groups\n';
    await expect(service.import(file('m.csv', pluralCsv), ORG, 'u')).resolves.toMatchObject({ created: 1 });

    // DB is plural this time; file sends the singular form.
    const pluralCat = { id: 'cat-2', name: 'Categories', isActive: true };
    const pluralGrp = { id: 'grp-2', name: 'Boxes', materialCategoryId: 'cat-2', isActive: true };
    const repo = (rows: any[]) => ({ find: jest.fn(async () => rows) });
    const svc2 = new MaterialImportService(
      { find: jest.fn(async () => existing) } as any,
      repo([pluralCat]) as any, repo([pluralGrp]) as any, repo([UOM]) as any,
      { createQueryRunner: () => qr } as any,
      { deriveCategoryPrefix: () => 'CAT', generateCode: jest.fn(async () => 'CAT000001') } as any,
      { generateCode: jest.fn(async () => '0001') } as any,
    );
    const singularCsv = 'Short Description,UOM,Material Category,Material Group\n' +
      'Monitor,Nos,category,box\n';
    await expect(svc2.import(file('m.csv', singularCsv), ORG, 'u')).resolves.toMatchObject({ created: 1 });
  });

  it('imports JSON (array and wrapped)', async () => {
    const rows = [{ 'Short Description': 'HDMI Cable', UOM: 'Nos', 'Material Category': 'Raw Material', 'Material Group': 'Raw Material Group' }];
    await expect(service.import(file('m.json', JSON.stringify(rows)), ORG, 'u')).resolves.toMatchObject({ created: 1 });
    await expect(service.import(file('m.json', JSON.stringify({ materials: rows })), ORG, 'u')).resolves.toMatchObject({ created: 1 });
  });

  it('imports an .xlsx workbook', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Materials');
    ws.addRow(['Code', 'Short Description', 'Long Description', 'UOM', 'Material Category', 'Material Group']);
    ws.addRow([1, 'HDMI Cable', 'HDMI Cable to VGA', 'Nos', 'Raw Material', 'Raw Material Group']);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    await expect(service.import(file('m.xlsx', buf), ORG, 'u')).resolves.toMatchObject({ created: 1 });
  });

  it('updates a material whose name already exists (case-insensitive) instead of adding one', async () => {
    existing = [{ id: 'm1', code: 'RAW000009', shortDescription: 'hdmi cable', isPurchaseOrderIssued: false }];
    const result = await service.import(file('m.csv', csv), ORG, 'u');
    expect(result).toMatchObject({ created: 1, updated: 1 });
    expect(saved.find((s) => s.id === 'm1')).toMatchObject({
      longDescription: 'HDMI Cable to VGA', code: 'RAW000009', updatedBy: 'u',
    });
  });

  it('keeps the long description of a purchase-order-locked material', async () => {
    existing = [{ id: 'm1', code: 'RAW000009', shortDescription: 'HDMI Cable', longDescription: 'Priced spec', isPurchaseOrderIssued: true }];
    await service.import(file('m.csv', csv), ORG, 'u');
    expect(saved.find((s) => s.id === 'm1').longDescription).toBe('Priced spec');
  });

  it('rejects the whole file, writing nothing, when any row is invalid', async () => {
    const bad = csv + '3,Mouse,,Nos,Unknown Category,Raw Material Group\n4,,,,,\n';
    await expect(service.import(file('m.csv', bad), ORG, 'u')).rejects.toThrow(UnprocessableEntityException);
    expect(qr.startTransaction).not.toHaveBeenCalled();
    expect(saved).toHaveLength(0);
  });

  it('rolls back everything when a write fails part-way', async () => {
    let n = 0;
    qr.manager.save.mockImplementation(async (_e: any, v: any) => {
      if (++n === 2) throw new Error('db down');
      saved.push(v);
      return v;
    });
    await expect(service.import(file('m.csv', csv), ORG, 'u')).rejects.toThrow(/rolled back/);
    expect(qr.rollbackTransaction).toHaveBeenCalled();
    expect(qr.commitTransaction).not.toHaveBeenCalled();
  });

  it('flags duplicate names inside the file', async () => {
    const dup = csv + '3,hdmi cable,,Nos,Raw Material,Raw Material Group\n';
    await expect(service.import(file('m.csv', dup), ORG, 'u')).rejects.toThrow(/Nothing was imported/);
  });

  it('rejects unsupported types and oversized files', async () => {
    await expect(service.import(file('m.txt', 'x'), ORG, 'u')).rejects.toThrow(BadRequestException);
    const big = { originalname: 'm.csv', buffer: Buffer.alloc(10), size: 6 * 1024 * 1024 } as Express.Multer.File;
    await expect(service.import(big, ORG, 'u')).rejects.toThrow(/5 MB/);
  });

  describe('auto-creating missing Category / Group / UOM', () => {
    it('creates a Category, then a Group under its new id, then a UOM, and uses all three ids on the material', async () => {
      const masterCodeService = { generateCode: jest.fn(async () => '0001') };
      const svc = new MaterialImportService(
        { find: jest.fn(async () => existing) } as any,
        { find: jest.fn(async () => []) } as any,
        { find: jest.fn(async () => []) } as any,
        { find: jest.fn(async () => []) } as any,
        { createQueryRunner: () => qr } as any,
        { deriveCategoryPrefix: () => 'ELE', generateCode: jest.fn(async () => 'ELE000001') } as any,
        masterCodeService as any,
      );
      const newCsv = 'Short Description,UOM,Material Category,Material Group\n' +
        'Circuit Breaker,Each,Electricals,Switchgear\n';

      const result = await svc.import(file('m.csv', newCsv), ORG, 'u');

      expect(result).toMatchObject({ created: 1 });
      const savedCategory = saved.find((s) => s.name === 'Electricals');
      const savedGroup = saved.find((s) => s.name === 'Switchgear');
      const savedUom = saved.find((s) => s.name === 'Each');
      expect(savedCategory).toMatchObject({ organizationId: ORG, isActive: true, createdBy: 'u' });
      expect(savedGroup).toMatchObject({ materialCategoryId: savedCategory.id, isActive: true });
      expect(savedUom).toMatchObject({ organizationId: ORG, isActive: true });

      const savedMaterial = saved.find((s) => s.shortDescription === 'Circuit Breaker');
      expect(savedMaterial).toMatchObject({
        materialCategoryId: savedCategory.id,
        materialGroupId: savedGroup.id,
        unitOfMeasurementId: savedUom.id,
      });
    });

    it('creates only one Category/Group/UOM even when several rows share the same new name', async () => {
      const masterCodeService = { generateCode: jest.fn(async () => '0001') };
      const svc = new MaterialImportService(
        { find: jest.fn(async () => existing) } as any,
        { find: jest.fn(async () => []) } as any,
        { find: jest.fn(async () => []) } as any,
        { find: jest.fn(async () => []) } as any,
        { createQueryRunner: () => qr } as any,
        { deriveCategoryPrefix: () => 'ELE', generateCode: jest.fn(async () => 'ELE000001') } as any,
        masterCodeService as any,
      );
      const newCsv = 'Short Description,UOM,Material Category,Material Group\n' +
        'Circuit Breaker,Each,Electricals,Switchgear\n' +
        'Fuse,each,electricals,switchgear\n';

      const result = await svc.import(file('m.csv', newCsv), ORG, 'u');

      expect(result).toMatchObject({ created: 2 });
      expect(saved.filter((s) => s.name === 'Electricals')).toHaveLength(1);
      expect(saved.filter((s) => s.name === 'Switchgear')).toHaveLength(1);
      expect(saved.filter((s) => s.name === 'Each')).toHaveLength(1);
    });

    it('still rejects an existing but inactive Category/Group/UOM instead of reusing it', async () => {
      const inactiveCat = { id: 'cat-x', name: 'Raw Material', isActive: false };
      const svc = new MaterialImportService(
        { find: jest.fn(async () => existing) } as any,
        { find: jest.fn(async () => [inactiveCat]) } as any,
        { find: jest.fn(async () => []) } as any,
        { find: jest.fn(async () => [UOM]) } as any,
        { createQueryRunner: () => qr } as any,
        { deriveCategoryPrefix: () => 'RAW', generateCode: jest.fn(async () => 'RAW000001') } as any,
        { generateCode: jest.fn(async () => '0001') } as any,
      );
      await expect(svc.import(file('m.csv', csv), ORG, 'u'))
        .rejects.toMatchObject({
          response: { errors: expect.arrayContaining([
            expect.objectContaining({ message: expect.stringContaining('is inactive') }),
          ]) },
        });
    });
  });
});
