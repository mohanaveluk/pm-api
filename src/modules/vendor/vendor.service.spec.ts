import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ConflictException, ForbiddenException, NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { VendorService } from './vendor.service';
import { VendorCodeService } from './vendor-code.service';
import { VendorUsageValidationService } from './vendor-usage-validation.service';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';

import { Vendor }              from './entities/vendor.entity';
import { VendorCodeCounter }   from './entities/vendor-code-counter.entity';
import { VendorContact }       from './entities/vendor-contact.entity';
import { VendorAddress }       from './entities/vendor-address.entity';
import { VendorBankAccount }   from './entities/vendor-bank-account.entity';
import { VendorCertification } from './entities/vendor-certification.entity';
import { VendorDocument }      from './entities/vendor-document.entity';
import { VendorMaterial }      from './entities/vendor-material.entity';
import { VendorTurnover }      from './entities/vendor-turnover.entity';
import { VendorEvaluation }    from './entities/vendor-evaluation.entity';
import { VendorPerformance }   from './entities/vendor-performance.entity';
import { IndustryCategory }    from '../industry-category/entities/industry-category.entity';
import { MaterialCategory }    from '../material-category/entities/material-category.entity';
import { Material }            from '../material/entities/material.entity';
import { User }                from '../user/entity/user.entity';

import { CreateVendorDto } from './dto/create-vendor.dto';
import { VendorType }   from './enums/vendor-type.enum';
import { VendorStatus } from './enums/vendor-status.enum';
import { PendingStatusChange }       from './enums/pending-status-change.enum';
import { StatusChangeRequestType }   from './enums/status-change-request-type.enum';
import { StatusChangeRequestStatus } from './enums/status-change-request-status.enum';
import { VendorStatusChangeRequest } from './entities/vendor-status-change-request.entity';
import { EmailService } from 'src/shared/email/email.service';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';
const CATEGORY_ID = '33333333-3333-4333-8333-333333333333';
const VENDOR_ID = '44444444-4444-4444-8444-444444444444';
const USER = 'buyer@example.com';

// Chainable query-builder double. Terminal methods are overridable per test.
function makeQb(overrides: Record<string, any> = {}) {
  const qb: any = {
    leftJoinAndSelect: jest.fn(() => qb),
    where:             jest.fn(() => qb),
    andWhere:          jest.fn(() => qb),
    addSelect:         jest.fn(() => qb),
    orderBy:           jest.fn(() => qb),
    skip:              jest.fn(() => qb),
    take:              jest.fn(() => qb),
    getExists:         jest.fn(async () => false),
    getMany:           jest.fn(async () => []),
    getManyAndCount:   jest.fn(async () => [[], 0]),
    getOne:            jest.fn(async () => null),
  };
  Object.assign(qb, overrides);
  return qb;
}

function makeRepo(overrides: Record<string, any> = {}) {
  return {
    find:              jest.fn(async () => []),
    findOne:           jest.fn(async () => null),
    count:             jest.fn(async () => 0),
    save:              jest.fn(async (e: any) => e),
    create:            jest.fn((e: any) => e),
    update:            jest.fn(async () => ({ affected: 1 })),
    createQueryBuilder: jest.fn(() => makeQb()),
    ...overrides,
  };
}

function activeCategory(overrides: Partial<IndustryCategory> = {}) {
  return {
    id: CATEGORY_ID, organizationId: ORG_A, name: 'Civil', code: 'CIV',
    isActive: true, isDeleted: false, ...overrides,
  } as IndustryCategory;
}

function existingVendor(overrides: Partial<Vendor> = {}) {
  return {
    id: VENDOR_ID, organizationId: ORG_A, code: 'CIV000001',
    vendorName: 'ABC Engineering LLC', vendorType: VendorType.MANUFACTURER,
    industryCategoryId: CATEGORY_ID, vendorStatus: VendorStatus.ACTIVE,
    isActive: true, isDeleted: false, parentCompanyId: null,
    ...overrides,
  } as Vendor;
}

describe('VendorService', () => {
  let service: VendorService;
  let vendorRepo: any;
  let categoryRepo: any;
  let materialRepo: any;
  let bankRepo: any;
  let statusRequestRepo: any;
  let userRepo: any;
  let emailService: any;
  let usageValidation: VendorUsageValidationService;
  let dataSource: any;
  let queryRunner: any;

  const validDto = (): CreateVendorDto => ({
    vendorName: 'ABC Engineering LLC',
    vendorType: VendorType.MANUFACTURER,
    industryCategoryId: CATEGORY_ID,
  } as CreateVendorDto);

  beforeEach(async () => {
    queryRunner = {
      connect:              jest.fn(),
      startTransaction:     jest.fn(),
      commitTransaction:    jest.fn(),
      rollbackTransaction:  jest.fn(),
      release:              jest.fn(),
      manager: {
        create: jest.fn((_e: any, v: any) => v),
        save:   jest.fn(async (_e: any, v: any) => v),
        findOne: jest.fn(async () => null),
      },
    };

    dataSource = {
      createQueryRunner: jest.fn(() => queryRunner),
      transaction: jest.fn(async (cb: any) => cb({
        create: jest.fn((_e: any, v: any) => v),
        save:   jest.fn(async (_e: any, v: any) => v),
        update: jest.fn(async () => ({ affected: 1 })),
      })),
    };

    vendorRepo   = makeRepo();
    categoryRepo = makeRepo();
    materialRepo = makeRepo();
    bankRepo     = makeRepo();
    statusRequestRepo = makeRepo();
    userRepo     = makeRepo();
    emailService = { sendEmail: jest.fn(async () => true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorService,
        VendorCodeService,
        VendorUsageValidationService,
        { provide: getRepositoryToken(Vendor),              useValue: vendorRepo },
        { provide: getRepositoryToken(VendorCodeCounter),   useValue: makeRepo() },
        { provide: getRepositoryToken(VendorContact),       useValue: makeRepo() },
        { provide: getRepositoryToken(VendorAddress),       useValue: makeRepo() },
        { provide: getRepositoryToken(VendorBankAccount),   useValue: bankRepo },
        { provide: getRepositoryToken(VendorCertification), useValue: makeRepo() },
        { provide: getRepositoryToken(VendorDocument),      useValue: makeRepo() },
        { provide: getRepositoryToken(VendorMaterial),      useValue: makeRepo() },
        { provide: getRepositoryToken(VendorTurnover),      useValue: makeRepo() },
        { provide: getRepositoryToken(VendorEvaluation),    useValue: makeRepo() },
        { provide: getRepositoryToken(VendorPerformance),   useValue: makeRepo() },
        { provide: getRepositoryToken(VendorStatusChangeRequest), useValue: statusRequestRepo },
        { provide: getRepositoryToken(IndustryCategory),    useValue: categoryRepo },
        { provide: getRepositoryToken(MaterialCategory),    useValue: makeRepo() },
        { provide: getRepositoryToken(Material),            useValue: materialRepo },
        { provide: getRepositoryToken(User),                useValue: userRepo },
        { provide: DataSource,          useValue: dataSource },
        { provide: CloudStorageService, useValue: { isFileValid: jest.fn(), uploadFile: jest.fn() } },
        { provide: EmailService,        useValue: emailService },
      ],
    }).compile();

    service        = module.get(VendorService);
    usageValidation = module.get(VendorUsageValidationService);
  });

  // ══ Creation ═══════════════════════════════════════════════════════════

  describe('create', () => {
    it('creates a vendor with a generated code and returns it UNDER_EVALUATION', async () => {
      categoryRepo.findOne.mockResolvedValue(activeCategory());
      queryRunner.manager.findOne.mockResolvedValue({
        id: 'counter', organizationId: ORG_A, categoryPrefix: 'CIV', lastSequence: 0,
      });

      const saved: any[] = [];
      queryRunner.manager.save.mockImplementation(async (_e: any, v: any) => { saved.push(v); return v; });

      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue({ code: 'CIV000001' } as any);

      await service.create(validDto(), ORG_A, USER);

      const vendorRow = saved.find(s => s.vendorName === 'ABC Engineering LLC');
      expect(vendorRow.code).toBe('CIV000001');
      expect(vendorRow.organizationId).toBe(ORG_A);
      expect(vendorRow.createdBy).toBe(USER);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      findOneSpy.mockRestore();
    });

    it('does NOT auto-approve a new vendor: status UNDER_EVALUATION, isActive false', async () => {
      categoryRepo.findOne.mockResolvedValue(activeCategory());
      queryRunner.manager.findOne.mockResolvedValue({ categoryPrefix: 'CIV', lastSequence: 5 });

      const saved: any[] = [];
      queryRunner.manager.save.mockImplementation(async (_e: any, v: any) => { saved.push(v); return v; });
      jest.spyOn(service, 'findOne').mockResolvedValue({} as any);

      await service.create(validDto(), ORG_A, USER);

      const vendorRow = saved.find(s => s.vendorName === 'ABC Engineering LLC');
      expect(vendorRow.vendorStatus).toBe(VendorStatus.UNDER_EVALUATION);
      expect(vendorRow.isActive).toBe(false);
    });

    it('rejects a missing Industry Category with 404', async () => {
      categoryRepo.findOne.mockResolvedValue(null);
      await expect(service.create(validDto(), ORG_A, USER)).rejects.toThrow(NotFoundException);
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('rejects an inactive Industry Category with 409', async () => {
      categoryRepo.findOne.mockResolvedValue(activeCategory({ isActive: false }));
      await expect(service.create(validDto(), ORG_A, USER)).rejects.toThrow(ConflictException);
    });

    it('rejects an Industry Category owned by another organization', async () => {
      // The repository filters on organizationId, so a foreign category resolves to null.
      categoryRepo.findOne.mockResolvedValue(null);
      await expect(service.create(validDto(), ORG_B, USER)).rejects.toThrow(NotFoundException);
      expect(categoryRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: ORG_B }) }),
      );
    });

    it('rejects a duplicate vendor name in the same organization with 409', async () => {
      categoryRepo.findOne.mockResolvedValue(activeCategory());
      vendorRepo.createQueryBuilder.mockReturnValue(makeQb({ getExists: jest.fn(async () => true) }));

      await expect(service.create(validDto(), ORG_A, USER)).rejects.toThrow(ConflictException);
    });

    it('rejects a material that does not exist in the organization', async () => {
      categoryRepo.findOne.mockResolvedValue(activeCategory());
      materialRepo.find.mockResolvedValue([]);

      const dto = { ...validDto(), materials: [{ materialId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }] } as CreateVendorDto;
      await expect(service.create(dto, ORG_A, USER)).rejects.toThrow(NotFoundException);
    });

    it('rejects more than one primary contact', async () => {
      categoryRepo.findOne.mockResolvedValue(activeCategory());
      const dto = {
        ...validDto(),
        contacts: [
          { contactPerson: 'A', isPrimary: true },
          { contactPerson: 'B', isPrimary: true },
        ],
      } as CreateVendorDto;

      await expect(service.create(dto, ORG_A, USER)).rejects.toThrow(UnprocessableEntityException);
    });

    it('rolls the transaction back when persistence fails', async () => {
      categoryRepo.findOne.mockResolvedValue(activeCategory());
      queryRunner.manager.findOne.mockResolvedValue({ categoryPrefix: 'CIV', lastSequence: 0 });
      queryRunner.manager.save.mockRejectedValue(new Error('db down'));

      await expect(service.create(validDto(), ORG_A, USER)).rejects.toThrow('db down');
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  // ══ Parent company ═════════════════════════════════════════════════════

  describe('parent company validation', () => {
    it('rejects a vendor being its own parent', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      await expect(
        service.update(VENDOR_ID, { parentCompanyId: VENDOR_ID } as any, ORG_A, USER, 'SuperAdmin'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects a circular parent-child relationship', async () => {
      // A(VENDOR_ID) → proposed parent B, but B's parent chain already reaches A.
      const B_ID = '55555555-5555-4555-8555-555555555555';
      vendorRepo.findOne.mockImplementation(async ({ where }: any) => {
        if (where.id === VENDOR_ID) return existingVendor();
        if (where.id === B_ID)      return existingVendor({ id: B_ID, parentCompanyId: VENDOR_ID });
        return null;
      });

      await expect(
        service.update(VENDOR_ID, { parentCompanyId: B_ID } as any, ORG_A, USER, 'SuperAdmin'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects a parent from another organization', async () => {
      const FOREIGN = '66666666-6666-4666-8666-666666666666';
      vendorRepo.findOne.mockImplementation(async ({ where }: any) =>
        where.id === VENDOR_ID ? existingVendor() : null,
      );

      await expect(
        service.update(VENDOR_ID, { parentCompanyId: FOREIGN } as any, ORG_A, USER, 'SuperAdmin'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ══ Update ═════════════════════════════════════════════════════════════

  describe('update', () => {
    it('updates an existing vendor and stamps updatedBy', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      jest.spyOn(service, 'findOne').mockResolvedValue({} as any);

      await service.update(VENDOR_ID, { tradeName: 'ABC Fab' } as any, ORG_A, USER, 'Manager');

      // update() persists through the transaction's manager, since it also
      // replaces child collections in the same unit of work.
      expect(queryRunner.manager.save).toHaveBeenCalledWith(
        Vendor,
        expect.objectContaining({ tradeName: 'ABC Fab', updatedBy: USER }),
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('returns 404 for an unknown vendor', async () => {
      vendorRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update(VENDOR_ID, {} as any, ORG_A, USER, 'Manager'),
      ).rejects.toThrow(NotFoundException);
    });

    it('refuses a cross-organization update (foreign vendor looks absent)', async () => {
      vendorRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update(VENDOR_ID, { tradeName: 'x' } as any, ORG_B, USER, 'SuperAdmin'),
      ).rejects.toThrow(NotFoundException);
      expect(vendorRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: ORG_B }) }),
      );
    });

    it('rejects an attempt to change the server-generated code', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      await expect(
        service.update(VENDOR_ID, { code: 'HACK01' } as any, ORG_A, USER, 'SuperAdmin'),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects an attempt to re-point the Industry Category', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      await expect(
        service.update(VENDOR_ID, { industryCategoryId: CATEGORY_ID } as any, ORG_A, USER, 'SuperAdmin'),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a status change smuggled through the update body', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      await expect(
        service.update(VENDOR_ID, { vendorStatus: VendorStatus.ACTIVE } as any, ORG_A, USER, 'SuperAdmin'),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a duplicate vendor name on rename', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      vendorRepo.createQueryBuilder.mockReturnValue(makeQb({ getExists: jest.fn(async () => true) }));

      await expect(
        service.update(VENDOR_ID, { vendorName: 'Taken Name' } as any, ORG_A, USER, 'SuperAdmin'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ══ Enable / disable / blacklist ═══════════════════════════════════════

  describe('lifecycle transitions', () => {
    beforeEach(() => jest.spyOn(service, 'findOne').mockResolvedValue({} as any));

    it('enables an inactive vendor', async () => {
      vendorRepo.findOne.mockResolvedValue(
        existingVendor({ isActive: false, vendorStatus: VendorStatus.UNDER_EVALUATION }),
      );

      await service.enable(VENDOR_ID, ORG_A, USER, 'SuperAdmin');

      expect(vendorRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true, vendorStatus: VendorStatus.ACTIVE, updatedBy: USER }),
      );
    });

    it('refuses to enable an already-active vendor', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      await expect(service.enable(VENDOR_ID, ORG_A, USER, 'SuperAdmin')).rejects.toThrow(ConflictException);
    });

    it('refuses to enable a blacklisted vendor', async () => {
      vendorRepo.findOne.mockResolvedValue(
        existingVendor({ vendorStatus: VendorStatus.BLACKLISTED, isActive: false }),
      );
      await expect(service.enable(VENDOR_ID, ORG_A, USER, 'SuperAdmin')).rejects.toThrow(ConflictException);
    });

    it('disables a vendor even when transactional history exists', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      jest.spyOn(usageValidation, 'hasTransactionalDependency').mockResolvedValue(true);

      await service.disable(VENDOR_ID, ORG_A, USER, 'SuperAdmin');

      expect(vendorRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false, vendorStatus: VendorStatus.INACTIVE }),
      );
    });

    it('refuses to disable an already-inactive vendor', async () => {
      vendorRepo.findOne.mockResolvedValue(
        existingVendor({ isActive: false, vendorStatus: VendorStatus.INACTIVE }),
      );
      await expect(service.disable(VENDOR_ID, ORG_A, USER, 'SuperAdmin')).rejects.toThrow(ConflictException);
    });

    it('refuses to enable a vendor with a pending status change', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor({
        isActive: false,
        vendorStatus: VendorStatus.INACTIVE,
        pendingStatusChange: PendingStatusChange.PENDING_BLACKLIST,
      }));
      await expect(service.enable(VENDOR_ID, ORG_A, USER, 'SuperAdmin'))
        .rejects.toThrow(/awaiting manager approval/);
    });

    it('refuses cross-organization enable', async () => {
      vendorRepo.findOne.mockResolvedValue(null);
      await expect(service.enable(VENDOR_ID, ORG_B, USER, 'SuperAdmin')).rejects.toThrow(NotFoundException);
    });
  });

  // ══ Clone ══════════════════════════════════════════════════════════════

  describe('clone', () => {
    const CLONE_USER = 'planner@example.com';

    // A fully-populated source spanning every section, so the copy test proves
    // the whole row rides along rather than a handful of columns.
    const fullSource = (overrides: Partial<Vendor> = {}) => existingVendor({
      dguid: 'source-dguid',
      code: 'CIV000007',
      tradeName: 'ABC Fabricators',
      vendorDescription: 'Piping spools and structural steel',
      countryOfRegistration: 'AE',
      businessRegistrationNumber: 'CN-1234567',
      taxRegistrationNumber: '100123456700003',
      email: 'contact@vendor.example',
      website: 'https://vendor.example.ae',
      paymentTerms: 'NET_45',
      creditLimitRequested: 500000,
      currency: 'USD',
      productCategories: ['Piping', 'Structural Steel'],
      standardLeadTimeDays: 30,
      vendorEvaluationScore: 82.5,
      remarks: 'Introduced by the projects team',
      createdBy: 'someone.else@example.com',
      updatedBy: 'someone.else@example.com',
      createdAt: new Date('2020-01-01T00:00:00Z'),
      updatedAt: new Date('2021-06-01T00:00:00Z'),
      ...overrides,
    } as Partial<Vendor>);

    // Child rows returned by the transaction manager's reads.
    const childRows: Record<string, any[]> = {};
    let txManager: any;
    let savedByEntity: Array<{ entity: any; rows: any }>;

    beforeEach(() => {
      savedByEntity = [];
      Object.keys(childRows).forEach(k => delete childRows[k]);

      jest.spyOn(service, 'findOne').mockResolvedValue({} as any);
      categoryRepo.findOne.mockResolvedValue(activeCategory());
      // Counter sits at 7, so the clone takes CIV000008.
      queryRunner.manager.findOne.mockResolvedValue({ categoryPrefix: 'CIV', lastSequence: 7 });

      txManager = queryRunner.manager;
      txManager.create = jest.fn((_e: any, v: any) => v);
      txManager.save = jest.fn(async (entity: any, rows: any) => {
        savedByEntity.push({ entity, rows });
        return rows;
      });
      txManager.find = jest.fn(async (entity: any) => childRows[entity.name] ?? []);
      txManager.createQueryBuilder = jest.fn(() =>
        makeQb({ getMany: jest.fn(async () => childRows['VendorBankAccount'] ?? []) }),
      );
    });

    const savedVendor = () =>
      savedByEntity.find(s => s.entity === Vendor)?.rows;
    const savedChildren = (entity: any) =>
      savedByEntity.find(s => s.entity === entity)?.rows ?? [];

    it('issues the next sequential code in the same industry category', async () => {
      vendorRepo.findOne.mockResolvedValue(fullSource());

      await service.clone(VENDOR_ID, ORG_A, CLONE_USER);

      expect(savedVendor().code).toBe('CIV000008');
    });

    it('mints a new id and dguid', async () => {
      const source = fullSource();
      vendorRepo.findOne.mockResolvedValue(source);

      await service.clone(VENDOR_ID, ORG_A, CLONE_USER);
      const clone = savedVendor();

      expect(clone.id).toBeDefined();
      expect(clone.dguid).toBeDefined();
      expect(clone.id).not.toBe(source.id);
      expect(clone.dguid).not.toBe(source.dguid);
    });

    it('copies every other column verbatim', async () => {
      const source = fullSource();
      vendorRepo.findOne.mockResolvedValue(source);

      await service.clone(VENDOR_ID, ORG_A, CLONE_USER);
      const clone = savedVendor();

      const reassigned = new Set([
        'id', 'dguid', 'code', 'vendorName',
        'businessRegistrationNumber', 'taxRegistrationNumber',
        'pendingStatusChange', 'pendingStatusChangeRequestId',
        'createdBy', 'updatedBy', 'createdAt', 'updatedAt',
        'deletedAt', 'deletedBy',
      ]);
      for (const [key, value] of Object.entries(source)) {
        if (reassigned.has(key)) continue;
        expect({ [key]: clone[key] }).toEqual({ [key]: value });
      }
    });

    it('suffixes the vendor name so the org-unique rule still holds', async () => {
      vendorRepo.findOne.mockResolvedValue(fullSource());

      await service.clone(VENDOR_ID, ORG_A, CLONE_USER);

      expect(savedVendor().vendorName).toBe('ABC Engineering LLC (Copy)');
    });

    it('escalates the suffix when earlier copies already exist', async () => {
      vendorRepo.findOne.mockResolvedValue(fullSource());
      // "(Copy)" and "(Copy 2)" taken, "(Copy 3)" free.
      let call = 0;
      vendorRepo.createQueryBuilder.mockImplementation(() =>
        makeQb({ getExists: jest.fn(async () => ++call <= 2) }),
      );

      await service.clone(VENDOR_ID, ORG_A, CLONE_USER);

      expect(savedVendor().vendorName).toBe('ABC Engineering LLC (Copy 3)');
    });

    it('honours an explicit vendorName override', async () => {
      vendorRepo.findOne.mockResolvedValue(fullSource());

      await service.clone(VENDOR_ID, ORG_A, CLONE_USER, { vendorName: 'ABC Engineering Qatar' });

      expect(savedVendor().vendorName).toBe('ABC Engineering Qatar');
    });

    it('clears statutory registration numbers unless supplied', async () => {
      vendorRepo.findOne.mockResolvedValue(fullSource());

      await service.clone(VENDOR_ID, ORG_A, CLONE_USER);
      const clone = savedVendor();

      expect(clone.businessRegistrationNumber).toBeNull();
      expect(clone.taxRegistrationNumber).toBeNull();
    });

    it('carries over supplied registration numbers', async () => {
      vendorRepo.findOne.mockResolvedValue(fullSource());

      await service.clone(VENDOR_ID, ORG_A, CLONE_USER, {
        businessRegistrationNumber: 'CN-7654321',
        taxRegistrationNumber: '100987654300003',
      });
      const clone = savedVendor();

      expect(clone.businessRegistrationNumber).toBe('CN-7654321');
      expect(clone.taxRegistrationNumber).toBe('100987654300003');
    });

    it('never carries the source pending-request pointer onto the clone', async () => {
      vendorRepo.findOne.mockResolvedValue(fullSource({
        pendingStatusChange: PendingStatusChange.PENDING_BLACKLIST,
        pendingStatusChangeRequestId: 'req-of-the-source',
      } as Partial<Vendor>));

      await service.clone(VENDOR_ID, ORG_A, CLONE_USER);
      const clone = savedVendor();

      expect(clone.pendingStatusChange).toBeNull();
      expect(clone.pendingStatusChangeRequestId).toBeNull();
    });

    it('stamps audit fields with the calling user, not the source author', async () => {
      vendorRepo.findOne.mockResolvedValue(fullSource());

      await service.clone(VENDOR_ID, ORG_A, CLONE_USER);
      const clone = savedVendor();

      expect(clone.createdBy).toBe(CLONE_USER);
      expect(clone.updatedBy).toBe(CLONE_USER);
      expect(clone.isDeleted).toBe(false);
      expect(clone.deletedAt).toBeNull();
    });

    // ── Reference tables ─────────────────────────────────────────────

    it('copies every reference table, re-keyed to the clone', async () => {
      vendorRepo.findOne.mockResolvedValue(fullSource());
      childRows['VendorAddress']       = [{ id: 'a1', dguid: 'ad1', vendorId: VENDOR_ID, city: 'Jubail' }];
      childRows['VendorContact']       = [{ id: 'c1', dguid: 'cd1', vendorId: VENDOR_ID, contactPerson: 'A. Rahman' }];
      childRows['VendorBankAccount']   = [{ id: 'b1', dguid: 'bd1', vendorId: VENDOR_ID, bankName: 'Emirates NBD' }];
      childRows['VendorCertification'] = [{ id: 'x1', dguid: 'xd1', vendorId: VENDOR_ID, certificationName: 'ISO 9001' }];
      childRows['VendorMaterial']      = [{ id: 'm1', dguid: 'md1', vendorId: VENDOR_ID, materialId: 'mat-1' }];
      childRows['VendorTurnover']      = [{ id: 't1', dguid: 'td1', vendorId: VENDOR_ID, financialYear: 2025 }];

      await service.clone(VENDOR_ID, ORG_A, CLONE_USER);
      const cloneId = savedVendor().id;

      for (const entity of [VendorAddress, VendorContact, VendorBankAccount, VendorCertification, VendorMaterial, VendorTurnover]) {
        const rows = savedChildren(entity);
        expect(rows).toHaveLength(1);
        expect(rows[0].vendorId).toBe(cloneId);
        expect(rows[0].id).not.toBe(childRows[entity.name][0].id);
        expect(rows[0].dguid).not.toBe(childRows[entity.name][0].dguid);
        expect(rows[0].createdBy).toBe(CLONE_USER);
      }
      // Payload survives the re-key.
      expect(savedChildren(VendorContact)[0].contactPerson).toBe('A. Rahman');
      expect(savedChildren(VendorMaterial)[0].materialId).toBe('mat-1');
      expect(savedChildren(VendorTurnover)[0].financialYear).toBe(2025);
    });

    it('selects the masked bank columns so account details are not lost', async () => {
      vendorRepo.findOne.mockResolvedValue(fullSource());
      const qb = makeQb({ getMany: jest.fn(async () => []) });
      txManager.createQueryBuilder = jest.fn(() => qb);

      await service.clone(VENDOR_ID, ORG_A, CLONE_USER);

      expect(qb.addSelect).toHaveBeenCalledWith(['b.accountNumber', 'b.iban', 'b.swiftCode']);
    });

    it('restarts cloned document version chains instead of pointing at the source', async () => {
      vendorRepo.findOne.mockResolvedValue(fullSource());
      childRows['VendorDocument'] = [{
        id: 'd1', dguid: 'dd1', vendorId: VENDOR_ID,
        documentUrl: 'https://storage.example.com/tl.pdf',
        version: 4, supersedesId: 'd0',
      }];

      await service.clone(VENDOR_ID, ORG_A, CLONE_USER);
      const [doc] = savedChildren(VendorDocument);

      expect(doc.documentUrl).toBe('https://storage.example.com/tl.pdf');
      expect(doc.version).toBe(1);
      expect(doc.supersedesId).toBeNull();
      expect(doc.uploadedBy).toBe(CLONE_USER);
    });

    it('does not copy evaluation, performance, or blacklist history', async () => {
      vendorRepo.findOne.mockResolvedValue(fullSource());

      await service.clone(VENDOR_ID, ORG_A, CLONE_USER);

      const touched = savedByEntity.map(s => s.entity);
      expect(touched).not.toContain(VendorEvaluation);
      expect(touched).not.toContain(VendorPerformance);
      expect(touched).not.toContain(VendorStatusChangeRequest);
    });

    it('copies nothing extra when the vendor has no child rows', async () => {
      vendorRepo.findOne.mockResolvedValue(fullSource());

      await service.clone(VENDOR_ID, ORG_A, CLONE_USER);

      // Only the vendor row and the code counter are written.
      const childWrites = savedByEntity
        .filter(s => s.entity !== Vendor && s.entity !== VendorCodeCounter);
      expect(childWrites).toHaveLength(0);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    // ── Failure paths ────────────────────────────────────────────────

    it('returns 404 for an unknown vendor', async () => {
      vendorRepo.findOne.mockResolvedValue(null);
      await expect(service.clone(VENDOR_ID, ORG_A, CLONE_USER)).rejects.toThrow(NotFoundException);
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('refuses to clone another organization\'s vendor', async () => {
      vendorRepo.findOne.mockResolvedValue(null);

      await expect(service.clone(VENDOR_ID, ORG_B, CLONE_USER)).rejects.toThrow(NotFoundException);
      expect(vendorRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: ORG_B }) }),
      );
    });

    it('refuses when the Industry Category has since been deactivated', async () => {
      vendorRepo.findOne.mockResolvedValue(fullSource());
      categoryRepo.findOne.mockResolvedValue(activeCategory({ isActive: false }));

      await expect(service.clone(VENDOR_ID, ORG_A, CLONE_USER)).rejects.toThrow(ConflictException);
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('refuses an explicit name that is already taken', async () => {
      vendorRepo.findOne.mockResolvedValue(fullSource());
      vendorRepo.createQueryBuilder.mockReturnValue(makeQb({ getExists: jest.fn(async () => true) }));

      await expect(
        service.clone(VENDOR_ID, ORG_A, CLONE_USER, { vendorName: 'Taken Name' }),
      ).rejects.toThrow(ConflictException);
    });

    it('rolls back and releases the connection when a child insert fails', async () => {
      vendorRepo.findOne.mockResolvedValue(fullSource());
      childRows['VendorContact'] = [{ id: 'c1', dguid: 'cd1', vendorId: VENDOR_ID, contactPerson: 'A' }];
      txManager.save = jest.fn(async (entity: any) => {
        if (entity === VendorContact) throw new Error('db down');
        return [];
      });

      await expect(service.clone(VENDOR_ID, ORG_A, CLONE_USER)).rejects.toThrow('db down');
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('issues distinct codes when the same vendor is cloned repeatedly', async () => {
      vendorRepo.findOne.mockResolvedValue(fullSource());
      const counter = { categoryPrefix: 'CIV', lastSequence: 7 };
      queryRunner.manager.findOne.mockResolvedValue(counter);
      const codes: string[] = [];
      txManager.save = jest.fn(async (entity: any, rows: any) => {
        if (rows?.lastSequence !== undefined) counter.lastSequence = rows.lastSequence;
        if (entity === Vendor) codes.push(rows.code);
        return rows;
      });

      await service.clone(VENDOR_ID, ORG_A, CLONE_USER);
      await service.clone(VENDOR_ID, ORG_A, CLONE_USER);
      await service.clone(VENDOR_ID, ORG_A, CLONE_USER);

      expect(codes).toEqual(['CIV000008', 'CIV000009', 'CIV000010']);
    });
  });

  // ══ Blacklist maker–checker ════════════════════════════════════════════

  describe('blacklist / un-blacklist approval workflow', () => {
    const MANAGER = 'manager@example.com';
    const REQUEST_ID = '77777777-7777-4777-8777-777777777777';

    const managers = [
      { id: 'mgr-1', email: MANAGER, first_name: 'Meera', last_name: 'Nair' },
      { id: 'mgr-2', email: 'ops.manager@example.com', first_name: 'Sam', last_name: 'Okafor' },
    ];

    const withManagers = () =>
      userRepo.createQueryBuilder.mockReturnValue(makeQb({ getMany: jest.fn(async () => managers) }));

    const pendingRequest = (overrides: Record<string, any> = {}) => ({
      id: REQUEST_ID,
      organizationId: ORG_A,
      vendorId: VENDOR_ID,
      requestType: StatusChangeRequestType.BLACKLIST,
      status: StatusChangeRequestStatus.PENDING,
      reason: 'Quality non-conformance',
      requestedBy: USER,
      requestedAt: new Date(),
      approvalToken: 'a'.repeat(64),
      tokenExpiresAt: new Date(Date.now() + 86_400_000),
      ...overrides,
    });

    beforeEach(() => {
      jest.spyOn(service, 'findOne').mockResolvedValue({} as any);
      withManagers();
    });

    // ── Raising a request ────────────────────────────────────────────

    it('marks the vendor PENDING_BLACKLIST without changing its settled status', async () => {
      const vendor = existingVendor();
      vendorRepo.findOne.mockResolvedValue(vendor);

      await service.requestBlacklist(VENDOR_ID, ORG_A, { reason: 'Quality non-conformance' }, USER);

      expect(vendor.pendingStatusChange).toBe(PendingStatusChange.PENDING_BLACKLIST);
      // Settled status is untouched until a manager approves.
      expect(vendor.vendorStatus).toBe(VendorStatus.ACTIVE);
      expect(vendor.isActive).toBe(true);
    });

    it('marks the vendor PENDING_UNBLACKLIST and leaves it blacklisted', async () => {
      const vendor = existingVendor({ vendorStatus: VendorStatus.BLACKLISTED, isActive: false });
      vendorRepo.findOne.mockResolvedValue(vendor);

      await service.requestRemoveBlacklist(VENDOR_ID, ORG_A, { reason: 'Corrective actions verified' }, USER);

      expect(vendor.pendingStatusChange).toBe(PendingStatusChange.PENDING_UNBLACKLIST);
      expect(vendor.vendorStatus).toBe(VendorStatus.BLACKLISTED);
    });

    it('emails every manager an approval link carrying the token', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());

      const result = await service.requestBlacklist(
        VENDOR_ID, ORG_A, { reason: 'Quality non-conformance' }, USER,
      );

      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
      const mail = emailService.sendEmail.mock.calls[0][0];
      expect(mail.to).toEqual([MANAGER, 'ops.manager@example.com']);
      expect(mail.subject).toContain('CIV000001');
      expect(mail.html).toContain('/vendors/status-approval');
      expect(mail.html).toContain('requestId=');
      expect(mail.html).toContain('token=');
      expect(result.approversNotified).toBe(2);
      expect(result.notificationSent).toBe(true);
    });

    it('never returns the approval token in the API response', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());

      const result = await service.requestBlacklist(VENDOR_ID, ORG_A, { reason: 'Quality issue' }, USER);

      expect(JSON.stringify(result)).not.toContain('approvalToken');
      expect((result.request as any).approvalToken).toBeUndefined();
    });

    it('keeps the request when the approval email fails to send', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      emailService.sendEmail.mockRejectedValue(new Error('SMTP unreachable'));

      const result = await service.requestBlacklist(VENDOR_ID, ORG_A, { reason: 'Quality issue' }, USER);

      expect(result.notificationSent).toBe(false);
      expect(result.request.status).toBe(StatusChangeRequestStatus.PENDING);
    });

    it('refuses a second request while one is already pending', async () => {
      vendorRepo.findOne.mockResolvedValue(
        existingVendor({ pendingStatusChange: PendingStatusChange.PENDING_BLACKLIST }),
      );
      await expect(
        service.requestBlacklist(VENDOR_ID, ORG_A, { reason: 'Again' }, USER),
      ).rejects.toThrow(/already awaiting approval/);
    });

    it('refuses to blacklist an already-blacklisted vendor', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor({ vendorStatus: VendorStatus.BLACKLISTED }));
      await expect(
        service.requestBlacklist(VENDOR_ID, ORG_A, { reason: 'x' }, USER),
      ).rejects.toThrow(ConflictException);
    });

    it('refuses to un-blacklist a vendor that is not blacklisted', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      await expect(
        service.requestRemoveBlacklist(VENDOR_ID, ORG_A, { reason: 'x' }, USER),
      ).rejects.toThrow(ConflictException);
    });

    it('requires a reason', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      await expect(
        service.requestBlacklist(VENDOR_ID, ORG_A, { reason: '   ' }, USER),
      ).rejects.toThrow(/reason is required/i);
    });

    it('refuses when the organization has no eligible approver', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      userRepo.createQueryBuilder.mockReturnValue(makeQb({ getMany: jest.fn(async () => []) }));

      await expect(
        service.requestBlacklist(VENDOR_ID, ORG_A, { reason: 'Quality issue' }, USER),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('rejects a nominated approver who is not an approver in this organization', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      userRepo.createQueryBuilder.mockReturnValue(makeQb({ getMany: jest.fn(async () => []) }));

      await expect(
        service.requestBlacklist(
          VENDOR_ID, ORG_A, { reason: 'x', approverUserId: 'mgr-9' }, USER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    // ── Approving ────────────────────────────────────────────────────

    it('applies the blacklisting only on approval', async () => {
      const vendor = existingVendor({ pendingStatusChange: PendingStatusChange.PENDING_BLACKLIST });
      const req = pendingRequest();
      statusRequestRepo.createQueryBuilder.mockReturnValue(makeQb({ getOne: jest.fn(async () => req) }));
      vendorRepo.findOne.mockResolvedValue(vendor);

      await service.approveStatusChange(
        REQUEST_ID, ORG_A, { token: req.approvalToken }, MANAGER, 'Manager',
      );

      expect(vendor.vendorStatus).toBe(VendorStatus.BLACKLISTED);
      expect(vendor.isActive).toBe(false);
      expect(vendor.blacklistReason).toBe('Quality non-conformance');
      expect(vendor.pendingStatusChange).toBeNull();
    });

    it('returns the vendor to UNDER_EVALUATION when an un-blacklist is approved', async () => {
      const vendor = existingVendor({
        vendorStatus: VendorStatus.BLACKLISTED,
        isActive: false,
        pendingStatusChange: PendingStatusChange.PENDING_UNBLACKLIST,
      });
      const req = pendingRequest({ requestType: StatusChangeRequestType.UNBLACKLIST });
      statusRequestRepo.createQueryBuilder.mockReturnValue(makeQb({ getOne: jest.fn(async () => req) }));
      vendorRepo.findOne.mockResolvedValue(vendor);

      await service.approveStatusChange(
        REQUEST_ID, ORG_A, { token: req.approvalToken }, MANAGER, 'Manager',
      );

      expect(vendor.vendorStatus).toBe(VendorStatus.UNDER_EVALUATION);
      expect(vendor.isActive).toBe(false);
      expect(vendor.pendingStatusChange).toBeNull();
    });

    it('refuses an invalid token', async () => {
      statusRequestRepo.createQueryBuilder.mockReturnValue(
        makeQb({ getOne: jest.fn(async () => pendingRequest()) }),
      );
      await expect(
        service.approveStatusChange(REQUEST_ID, ORG_A, { token: 'b'.repeat(64) }, MANAGER, 'Manager'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses a token of the wrong length without leaking timing', async () => {
      statusRequestRepo.createQueryBuilder.mockReturnValue(
        makeQb({ getOne: jest.fn(async () => pendingRequest()) }),
      );
      await expect(
        service.approveStatusChange(REQUEST_ID, ORG_A, { token: 'short' }, MANAGER, 'Manager'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses an expired approval link', async () => {
      statusRequestRepo.createQueryBuilder.mockReturnValue(
        makeQb({
          getOne: jest.fn(async () => pendingRequest({ tokenExpiresAt: new Date(Date.now() - 1000) })),
        }),
      );
      await expect(
        service.approveStatusChange(REQUEST_ID, ORG_A, { token: 'a'.repeat(64) }, MANAGER, 'Manager'),
      ).rejects.toThrow(/expired/i);
    });

    it('refuses a request that was already decided', async () => {
      statusRequestRepo.createQueryBuilder.mockReturnValue(
        makeQb({ getOne: jest.fn(async () => pendingRequest({ status: StatusChangeRequestStatus.APPROVED })) }),
      );
      await expect(
        service.approveStatusChange(REQUEST_ID, ORG_A, { token: 'a'.repeat(64) }, MANAGER, 'Manager'),
      ).rejects.toThrow(/already been approved/i);
    });

    it('stops the requester from approving their own request', async () => {
      const req = pendingRequest();
      statusRequestRepo.createQueryBuilder.mockReturnValue(makeQb({ getOne: jest.fn(async () => req) }));
      vendorRepo.findOne.mockResolvedValue(existingVendor());

      await expect(
        service.approveStatusChange(REQUEST_ID, ORG_A, { token: req.approvalToken }, USER, 'Manager'),
      ).rejects.toThrow(/cannot approve it/);
    });

    it('refuses a request belonging to another organization', async () => {
      statusRequestRepo.createQueryBuilder.mockReturnValue(makeQb({ getOne: jest.fn(async () => null) }));
      await expect(
        service.approveStatusChange(REQUEST_ID, ORG_B, { token: 'a'.repeat(64) }, MANAGER, 'Manager'),
      ).rejects.toThrow(NotFoundException);
    });

    // ── Rejecting ────────────────────────────────────────────────────

    it('leaves the vendor untouched when a request is rejected', async () => {
      const vendor = existingVendor({ pendingStatusChange: PendingStatusChange.PENDING_BLACKLIST });
      const req = pendingRequest();
      statusRequestRepo.createQueryBuilder.mockReturnValue(makeQb({ getOne: jest.fn(async () => req) }));
      vendorRepo.findOne.mockResolvedValue(vendor);

      await service.rejectStatusChange(
        REQUEST_ID, ORG_A, { token: req.approvalToken, comments: 'Insufficient evidence' }, MANAGER, 'Manager',
      );

      expect(vendor.vendorStatus).toBe(VendorStatus.ACTIVE);
      expect(vendor.isActive).toBe(true);
      expect(vendor.pendingStatusChange).toBeNull();
    });

    // ── Cancelling ───────────────────────────────────────────────────

    it('lets the requester withdraw their own request', async () => {
      const vendor = existingVendor({ pendingStatusChange: PendingStatusChange.PENDING_BLACKLIST });
      statusRequestRepo.findOne.mockResolvedValue(pendingRequest());
      vendorRepo.findOne.mockResolvedValue(vendor);

      await service.cancelStatusChange(REQUEST_ID, ORG_A, USER, 'Manager');

      expect(vendor.pendingStatusChange).toBeNull();
    });

    it('stops a different user from cancelling someone else\'s request', async () => {
      statusRequestRepo.findOne.mockResolvedValue(pendingRequest());
      await expect(
        service.cancelStatusChange(REQUEST_ID, ORG_A, MANAGER, 'Manager'),
      ).rejects.toThrow(ForbiddenException);
    });

    // ── Expiry sweep ─────────────────────────────────────────────────

    it('expires stale requests and releases their vendors', async () => {
      statusRequestRepo.find.mockResolvedValue([pendingRequest(), pendingRequest({ id: 'req-2' })]);

      const count = await service.expireStaleStatusChangeRequests();

      expect(count).toBe(2);
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('is a no-op when nothing has expired', async () => {
      statusRequestRepo.find.mockResolvedValue([]);
      expect(await service.expireStaleStatusChangeRequests()).toBe(0);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  // ══ Delete ═════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('soft-deletes a vendor with no dependencies', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      vendorRepo.count.mockResolvedValue(0);

      await service.remove(VENDOR_ID, ORG_A, USER);

      expect(dataSource.transaction).toHaveBeenCalled();
      const vendor = vendorRepo.findOne.mock.results[0].value;
      await expect(vendor).resolves.toMatchObject({ isDeleted: true, deletedBy: USER, isActive: false });
    });

    it('refuses deletion when a transactional record references the vendor', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      jest.spyOn(usageValidation, 'describeDependencies').mockResolvedValue(['Purchase Order']);

      await expect(service.remove(VENDOR_ID, ORG_A, USER)).rejects.toThrow(
        /referenced by existing Purchase Order/,
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('refuses deletion when subsidiary vendors reference it as parent', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      vendorRepo.count.mockResolvedValue(2);

      await expect(service.remove(VENDOR_ID, ORG_A, USER)).rejects.toThrow(/subsidiary vendor/);
    });

    it('treats an already-deleted vendor as not found', async () => {
      // findVendorOrThrow filters isDeleted:false, so a deleted row resolves to null.
      vendorRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(VENDOR_ID, ORG_A, USER)).rejects.toThrow(NotFoundException);
    });

    it('refuses cross-organization deletion', async () => {
      vendorRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(VENDOR_ID, ORG_B, USER)).rejects.toThrow(NotFoundException);
    });
  });

  // ══ Sensitive data ═════════════════════════════════════════════════════

  describe('banking data protection', () => {
    const account = {
      id: 'bank-1', vendorId: VENDOR_ID, organizationId: ORG_A,
      bankName: 'Emirates NBD', accountNumber: '1012345678901234',
      iban: 'AE070331234567890123456', swiftCode: 'EBILAEAD',
      accountNumberLast4: '1234', isPrimary: true, isActive: true, isDeleted: false,
    };

    it('masks the account number for an unprivileged caller', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      bankRepo.createQueryBuilder.mockReturnValue(
        makeQb({ getMany: jest.fn(async () => [{ ...account, accountNumber: undefined, iban: undefined }]) }),
      );

      const [row] = await service.findBankAccounts(VENDOR_ID, ORG_A, 'Manager', false);

      expect(row.isMasked).toBe(true);
      expect(row.accountNumber).not.toContain('1012345678901234');
      expect(row.accountNumber.endsWith('1234')).toBe(true);
      expect(row.iban).toBeUndefined();
      expect(row.swiftCode).toBeUndefined();
    });

    it('refuses reveal=true for an unprivileged caller with 403', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      await expect(
        service.findBankAccounts(VENDOR_ID, ORG_A, 'Manager', true),
      ).rejects.toThrow(ForbiddenException);
    });

    it('reveals full details for a privileged caller', async () => {
      vendorRepo.findOne.mockResolvedValue(existingVendor());
      bankRepo.createQueryBuilder.mockReturnValue(makeQb({ getMany: jest.fn(async () => [account]) }));

      const [row] = await service.findBankAccounts(VENDOR_ID, ORG_A, 'FinanceAdmin', true);

      expect(row.isMasked).toBe(false);
      expect(row.accountNumber).toBe('1012345678901234');
      expect(row.iban).toBe('AE070331234567890123456');
    });

    it('recognises exactly the privileged roles', () => {
      expect(service.canViewSensitive('SuperAdmin')).toBe(true);
      expect(service.canViewSensitive('OrganizationAdmin')).toBe(true);
      expect(service.canViewSensitive('FinanceAdmin')).toBe(true);
      expect(service.canViewSensitive('Manager')).toBe(false);
      expect(service.canViewSensitive('user')).toBe(false);
      expect(service.canViewSensitive('')).toBe(false);
    });
  });

  // ══ Listing / organization isolation ═══════════════════════════════════

  describe('findAll', () => {
    it('always scopes the query to the caller organization and excludes deleted rows', async () => {
      const qb = makeQb();
      vendorRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({} as any, ORG_A);

      expect(qb.where).toHaveBeenCalledWith('v.organizationId = :organizationId', { organizationId: ORG_A });
      expect(qb.andWhere).toHaveBeenCalledWith('v.isDeleted = false');
    });

    it('hides blacklisted vendors by default', async () => {
      const qb = makeQb();
      vendorRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({} as any, ORG_A);

      const clauses = qb.andWhere.mock.calls.map((c: any[]) => c[0]).join(' | ');
      expect(clauses).toContain('v.vendorStatus != :blacklisted');
    });

    it('includes blacklisted vendors when explicitly requested', async () => {
      const qb = makeQb();
      vendorRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ includeBlacklisted: true } as any, ORG_A);

      const clauses = qb.andWhere.mock.calls.map((c: any[]) => c[0]).join(' | ');
      expect(clauses).not.toContain('v.vendorStatus != :blacklisted');
    });

    it('ignores an unknown sortBy instead of interpolating it into SQL', async () => {
      const qb = makeQb();
      vendorRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ sortBy: 'vendorName; DROP TABLE vendors' } as any, ORG_A);

      expect(qb.orderBy).toHaveBeenCalledWith('v.createdAt', 'DESC');
    });

    it('returns the items/total/page/limit/totalPages envelope', async () => {
      vendorRepo.createQueryBuilder.mockReturnValue(
        makeQb({ getManyAndCount: jest.fn(async () => [[existingVendor()], 1]) }),
      );

      const result = await service.findAll({ page: 1, limit: 20 } as any, ORG_A);

      expect(result).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 });
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('findActive', () => {
    it('returns only ACTIVE, isActive, non-deleted vendors', async () => {
      const qb = makeQb();
      vendorRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findActive(ORG_A);

      const clauses = qb.andWhere.mock.calls.map((c: any[]) => c[0]).join(' | ');
      expect(clauses).toContain('v.isDeleted = false');
      expect(clauses).toContain('v.isActive = true');
      expect(clauses).toContain('v.vendorStatus = :status');
    });
  });
});

// ══ Vendor code generation ═══════════════════════════════════════════════

describe('VendorCodeService', () => {
  let codeService: VendorCodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorCodeService,
        { provide: getRepositoryToken(VendorCodeCounter), useValue: makeRepo() },
      ],
    }).compile();
    codeService = module.get(VendorCodeService);
  });

  describe('deriveCategoryPrefix', () => {
    it('derives a 3-char prefix from the category name', () => {
      expect(codeService.deriveCategoryPrefix('Civil')).toBe('CIV');
      expect(codeService.deriveCategoryPrefix('Mechanical')).toBe('MEC');
      expect(codeService.deriveCategoryPrefix('Electrical')).toBe('ELE');
      expect(codeService.deriveCategoryPrefix('Instrumentation')).toBe('INS');
    });

    it('strips non-alphabetic characters', () => {
      expect(codeService.deriveCategoryPrefix('E&I Works')).toBe('EIW');
      expect(codeService.deriveCategoryPrefix('civil-works_2')).toBe('CIV');
    });

    it('pads short names to three characters', () => {
      expect(codeService.deriveCategoryPrefix('IT')).toBe('ITX');
      expect(codeService.deriveCategoryPrefix('E')).toBe('EXX');
    });
  });

  describe('generateCode', () => {
    it('produces a zero-padded sequential code', async () => {
      const counter = { organizationId: ORG_A, categoryPrefix: 'CIV', lastSequence: 0 };
      const qr: any = {
        manager: {
          findOne: jest.fn(async () => counter),
          save:    jest.fn(async (_e: any, v: any) => v),
          create:  jest.fn((_e: any, v: any) => v),
        },
      };

      expect(await codeService.generateCode(qr, ORG_A, 'CIV')).toBe('CIV000001');
      expect(await codeService.generateCode(qr, ORG_A, 'CIV')).toBe('CIV000002');
      expect(await codeService.generateCode(qr, ORG_A, 'CIV')).toBe('CIV000003');
    });

    it('takes a pessimistic write lock on the counter row', async () => {
      const qr: any = {
        manager: {
          findOne: jest.fn(async () => ({ categoryPrefix: 'CIV', lastSequence: 0 })),
          save:    jest.fn(async (_e: any, v: any) => v),
          create:  jest.fn((_e: any, v: any) => v),
        },
      };

      await codeService.generateCode(qr, ORG_A, 'CIV');

      expect(qr.manager.findOne).toHaveBeenCalledWith(
        VendorCodeCounter,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
    });

    it('issues no duplicate codes across serialised concurrent callers', async () => {
      // The row lock serialises transactions, so model the counter as a single
      // shared row that each caller reads and writes under mutual exclusion.
      const counter = { organizationId: ORG_A, categoryPrefix: 'CIV', lastSequence: 0 };
      let locked = Promise.resolve();

      const runLocked = async <T>(fn: () => Promise<T>): Promise<T> => {
        const previous = locked;
        let release: () => void;
        locked = new Promise<void>(r => (release = r));
        await previous;
        try { return await fn(); } finally { release(); }
      };

      const qr: any = {
        manager: {
          findOne: jest.fn(async () => counter),
          save:    jest.fn(async (_e: any, v: any) => { counter.lastSequence = v.lastSequence; return v; }),
          create:  jest.fn((_e: any, v: any) => v),
        },
      };

      const codes = await Promise.all(
        Array.from({ length: 50 }, () => runLocked(() => codeService.generateCode(qr, ORG_A, 'CIV'))),
      );

      expect(new Set(codes).size).toBe(50);
      expect(codes).toContain('CIV000001');
      expect(codes).toContain('CIV000050');
    });

    it('recovers from a losing race on first-time counter insert', async () => {
      const winner = { organizationId: ORG_A, categoryPrefix: 'MEC', lastSequence: 7 };
      let findOneCalls = 0;

      const qr: any = {
        manager: {
          findOne: jest.fn(async () => (++findOneCalls === 1 ? null : winner)),
          create:  jest.fn((_e: any, v: any) => v),
          save:    jest.fn(async (_e: any, v: any) => {
            if (findOneCalls === 1 && v.lastSequence === 0) {
              const err: any = new Error('duplicate'); err.code = 'ER_DUP_ENTRY'; throw err;
            }
            return v;
          }),
        },
      };

      // Re-reads the winning row rather than throwing, and continues its sequence.
      expect(await codeService.generateCode(qr, ORG_A, 'MEC')).toBe('MEC000008');
    });
  });
});

// ══ DTO validation ═══════════════════════════════════════════════════════

describe('CreateVendorDto validation', () => {
  const base = {
    vendorName: 'ABC Engineering LLC',
    vendorType: VendorType.MANUFACTURER,
    industryCategoryId: CATEGORY_ID,
  };

  const errorsFor = async (payload: Record<string, any>) => {
    const dto = plainToInstance(CreateVendorDto, { ...base, ...payload });
    const errors = await validate(dto, { whitelist: true });
    return errors.map(e => e.property);
  };

  it('accepts a minimal valid payload', async () => {
    expect(await errorsFor({})).toHaveLength(0);
  });

  it('requires vendorName, vendorType and industryCategoryId', async () => {
    const dto = plainToInstance(CreateVendorDto, {});
    const props = (await validate(dto)).map(e => e.property);
    expect(props).toEqual(expect.arrayContaining(['vendorName', 'vendorType', 'industryCategoryId']));
  });

  it('rejects an arbitrary vendorType string', async () => {
    expect(await errorsFor({ vendorType: 'FABRICATOR' })).toContain('vendorType');
  });

  it('rejects a malformed email', async () => {
    expect(await errorsFor({ email: 'not-an-email' })).toContain('email');
    expect(await errorsFor({ email: 'a@b' })).toContain('email');
    expect(await errorsFor({ email: 'buyer@vendor.example' })).not.toContain('email');
  });

  it('accepts country-specific website TLDs', async () => {
    for (const url of [
      'https://example.com',
      'https://example.ae',
      'https://example.co.in',
      'https://example.co.uk',
      'http://sub.domain.com.sg/path',
    ]) {
      expect(await errorsFor({ website: url })).not.toContain('website');
    }
  });

  it('rejects a malformed website', async () => {
    expect(await errorsFor({ website: 'example' })).toContain('website');
    expect(await errorsFor({ website: 'ftp://example.com' })).toContain('website');
  });

  it('accepts international phone formats and rejects junk', async () => {
    for (const phone of ['+971 50 123 4567', '+44 (0)20 7946 0958', '+1-415-555-0132', '05012345678']) {
      expect(await errorsFor({ mobileNumber: phone })).not.toContain('mobileNumber');
    }
    expect(await errorsFor({ mobileNumber: 'call-me' })).toContain('mobileNumber');
  });

  it('rejects a non-ISO country code', async () => {
    expect(await errorsFor({ countryOfRegistration: 'UAE' })).toContain('countryOfRegistration');
    expect(await errorsFor({ countryOfRegistration: 'AE' })).not.toContain('countryOfRegistration');
  });

  it('rejects a non-UUID industryCategoryId', async () => {
    expect(await errorsFor({ industryCategoryId: 'CIV' })).toContain('industryCategoryId');
  });

  it('trims and uppercases where declared', async () => {
    const dto = plainToInstance(CreateVendorDto, {
      ...base,
      vendorName: '  ABC Engineering LLC  ',
      countryOfRegistration: ' ae ',
    });
    expect(dto.vendorName).toBe('ABC Engineering LLC');
    expect(dto.countryOfRegistration).toBe('AE');
  });

  it('has no code property — the code is server-generated', () => {
    const dto = plainToInstance(CreateVendorDto, { ...base, code: 'CIV000001' } as any);
    expect((dto as any).code).toBe('CIV000001'); // present on the instance…
    // …but stripped by the global ValidationPipe's whitelist, and rejected by
    // the service guard. See the 'rejects an attempt to change the
    // server-generated code' test above.
  });

  it('rejects a negative turnover and accepts a decimal one', async () => {
    expect(await errorsFor({ turnovers: [{ financialYear: 2025, turnover: -1, currency: 'USD' }] }))
      .toContain('turnovers');
    expect(await errorsFor({ turnovers: [{ financialYear: 2025, turnover: 15000000.5, currency: 'USD' }] }))
      .not.toContain('turnovers');
  });

  it('rejects an out-of-range evaluation score', async () => {
    expect(await errorsFor({ evaluation: { vendorEvaluationScore: 120 } })).toContain('evaluation');
    expect(await errorsFor({ evaluation: { vendorEvaluationScore: 82.5 } })).not.toContain('evaluation');
  });
});
