import { UnprocessableEntityException, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { VendorImportService } from './vendor-import.service';
import { MasterSequenceKey } from 'src/common/services/master-code.service';

const ORG = 'org-1';
const CAT = { id: 'cat-1', name: 'Raw Material', isActive: true };
const SUPPLIER_TYPE = { id: 'vt-1', name: 'Supplier', isActive: true };
const CONSULTANT_TYPE = { id: 'vt-2', name: 'Consultant', isActive: true };

function file(name: string, content: string | Buffer): Express.Multer.File {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return { originalname: name, buffer, size: buffer.length } as Express.Multer.File;
}

describe('VendorImportService', () => {
  let service: VendorImportService;
  let vendorTypes: any[];
  let existing: any[];
  let saved: any[];
  let masterCodeCalls: string[];
  let qr: any;

  beforeEach(() => {
    vendorTypes = [SUPPLIER_TYPE, CONSULTANT_TYPE];
    existing = [];
    saved = [];
    masterCodeCalls = [];
    qr = {
      connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(), release: jest.fn(),
      manager: {
        create: jest.fn((_e: any, v: any) => v),
        save: jest.fn(async (_e: any, v: any) => { saved.push(v); return v; }),
        find: jest.fn(async () => existing),
        findOne: jest.fn(async () => null), // no default industry category unless overridden
      },
    };
    const repo = (rows: any[]) => ({ find: jest.fn(async () => rows) });
    service = new VendorImportService(
      { find: jest.fn(async () => existing) } as any,
      { find: jest.fn(async () => vendorTypes) } as any,
      repo([CAT]) as any,
      repo([]) as any,
      { createQueryRunner: () => qr } as any,
      { deriveCategoryPrefix: (n: string) => n.slice(0, 3).toUpperCase(), generateCode: jest.fn(async () => 'SUP000001') } as any,
      {
        generateCode: jest.fn(async (_qr: any, _org: string, key: MasterSequenceKey) => {
          masterCodeCalls.push(key);
          return '0001';
        }),
      } as any,
    );
  });

  const csv = 'Vendor Code,Vendor Name,Vendor Type,Material Category,Contact details\n' +
    '0005,ABC Consultant,Consultant,Raw Material,Atul Sharma\n' +
    '0006,Siera Service,,raw material,Jane Doe\n'; // blank type -> default Supplier

  it('imports a CSV, resolving vendor type and category case-insensitively, defaulting a blank type to Supplier', async () => {
    const result = await service.import(file('v.csv', csv), ORG, 'a@b.c');
    expect(result).toMatchObject({ total: 2, created: 2, updated: 0, vendorTypesCreated: [] });

    const abc = saved.find((s) => s.vendorName === 'ABC Consultant');
    expect(abc).toMatchObject({ vendorTypeId: 'vt-2', productCategories: ['cat-1'], primaryContactPerson: 'Atul Sharma' });

    const siera = saved.find((s) => s.vendorName === 'Siera Service');
    expect(siera).toMatchObject({ vendorTypeId: 'vt-1', productCategories: ['cat-1'] });
    expect(qr.commitTransaction).toHaveBeenCalled();
  });

  it('matches Material Category and Vendor Type regardless of case and plural form', async () => {
    const pluralCsv = 'Vendor Name,Vendor Type,Material Category\nWidgetCo,Consultants,Raw Materials\n';
    const result = await service.import(file('v.csv', pluralCsv), ORG, 'u');
    expect(result.created).toBe(1);
    expect(saved[0]).toMatchObject({ vendorTypeId: 'vt-2', productCategories: ['cat-1'] });
  });

  it('creates a new Vendor Type inside the same transaction when it does not exist', async () => {
    const csvNewType = 'Vendor Name,Vendor Type,Material Category\nNewCo,Distributor,Raw Material\n';
    const result = await service.import(file('v.csv', csvNewType), ORG, 'u');
    expect(result.vendorTypesCreated).toEqual(['Distributor']);
    expect(masterCodeCalls).toContain(MasterSequenceKey.VENDOR_TYPE);
    const createdType = saved.find((s) => s.name === 'Distributor');
    expect(createdType).toMatchObject({ code: '0001', isActive: true });
    const vendor = saved.find((s) => s.vendorName === 'NewCo');
    expect(vendor.vendorTypeId).toBe(createdType.id);
  });

  it('creates only one Vendor Type even when several rows need the same new type', async () => {
    const csvNewType = 'Vendor Name,Vendor Type,Material Category\n' +
      'A Co,Distributor,Raw Material\nB Co,distributors,Raw Material\n';
    const result = await service.import(file('v.csv', csvNewType), ORG, 'u');
    expect(result.vendorTypesCreated).toEqual(['Distributor']);
    expect(saved.filter((s) => s.name === 'Distributor')).toHaveLength(1);
  });

  it('imports JSON (array and wrapped)', async () => {
    const rows = [{ 'Vendor Name': 'ABC Consultant', 'Vendor Type': 'Consultant', 'Material Category': 'Raw Material' }];
    await expect(service.import(file('v.json', JSON.stringify(rows)), ORG, 'u')).resolves.toMatchObject({ created: 1 });
    await expect(service.import(file('v.json', JSON.stringify({ vendors: rows })), ORG, 'u')).resolves.toMatchObject({ created: 1 });
  });

  it('imports an .xlsx workbook', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Vendors');
    ws.addRow(['Vendor Code', 'Vendor Name', 'Vendor Type', 'Material Category', 'Contact details']);
    ws.addRow(['0005', 'ABC Consultant', 'Consultant', 'Raw Material', 'Atul Sharma']);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    await expect(service.import(file('v.xlsx', buf), ORG, 'u')).resolves.toMatchObject({ created: 1 });
  });

  it('replaces (updates) a vendor whose name + type + category combination already exists', async () => {
    existing = [{
      id: 'v1', code: 'CON000009', vendorName: 'abc consultant', vendorTypeId: 'vt-2',
      productCategories: ['cat-1'], primaryContactPerson: 'Old Contact',
    }];
    const result = await service.import(file('v.csv', csv), ORG, 'u');
    expect(result).toMatchObject({ created: 1, updated: 1 });
    const updated = saved.find((s) => s.id === 'v1');
    expect(updated).toMatchObject({ primaryContactPerson: 'Atul Sharma', updatedBy: 'u' });
  });

  it('does not match an existing vendor with the same name under a different type/category', async () => {
    existing = [{
      id: 'v1', code: 'SUP000001', vendorName: 'ABC Consultant', vendorTypeId: 'vt-1', // Supplier, not Consultant
      productCategories: ['cat-1'],
    }];
    const result = await service.import(file('v.csv', csv), ORG, 'u');
    expect(result.created).toBe(2);
    expect(result.updated).toBe(0);
  });

  it('rejects the whole file, writing nothing, when any row is invalid', async () => {
    const bad = csv + '0007,NoCategory,Supplier,Unknown Category,X\n0008,,,,\n';
    await expect(service.import(file('v.csv', bad), ORG, 'u')).rejects.toThrow(UnprocessableEntityException);
    expect(qr.startTransaction).not.toHaveBeenCalled();
    expect(saved).toHaveLength(0);
  });

  it('flags a duplicate Vendor Name + Vendor Type + Material Category combination within the file', async () => {
    const dup = csv + '0007,abc consultant,consultant,raw material,X\n';
    await expect(service.import(file('v.csv', dup), ORG, 'u')).rejects.toThrow(/Nothing was imported/);
  });

  it('rolls back everything, including a newly created Vendor Type, when a write fails part-way', async () => {
    const csvNewType = 'Vendor Name,Vendor Type,Material Category\nNewCo,Distributor,Raw Material\n';
    qr.manager.save.mockImplementation(async () => { throw new Error('db down'); });
    await expect(service.import(file('v.csv', csvNewType), ORG, 'u')).rejects.toThrow(/rolled back/);
    expect(qr.rollbackTransaction).toHaveBeenCalled();
    expect(qr.commitTransaction).not.toHaveBeenCalled();
  });

  it('rejects unsupported types and oversized files', async () => {
    await expect(service.import(file('v.txt', 'x'), ORG, 'u')).rejects.toThrow(BadRequestException);
    const big = { originalname: 'v.csv', buffer: Buffer.alloc(10), size: 6 * 1024 * 1024 } as Express.Multer.File;
    await expect(service.import(big, ORG, 'u')).rejects.toThrow(/5 MB/);
  });
});
