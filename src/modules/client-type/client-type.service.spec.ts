import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { MasterCodeService, MasterSequenceKey } from 'src/common/services/master-code.service';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { CustomLoggerService } from '../logger/custom-logger.service';

import { ClientTypeService } from './client-type.service';
import { ClientType } from './entity/client-type.entity';
import { CreateClientTypeDto } from './dto/create-client-type.dto';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';
const VT_ID = '33333333-3333-4333-8333-333333333333';
const USER = 'admin@example.com';

function makeRepo(overrides: Record<string, any> = {}) {
  return {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    findAndCount: jest.fn(async () => [[], 0]),
    count: jest.fn(async () => 1),
    save: jest.fn(async (e: any) => e),
    create: jest.fn((e: any) => e),
    ...overrides,
  };
}

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
      count:   jest.fn(async () => 0),
    },
  };
  return { saved, counter, queryRunner, dataSource: { createQueryRunner: jest.fn(() => queryRunner) } };
}

function existingClientType(overrides: Partial<ClientType> = {}): ClientType {
  return {
    id: VT_ID, dguid: 'ct-dguid', organizationId: ORG_A,
    code: '0001', name: 'Owner', shortName: 'OWN',
    description: 'Produces the goods it supplies',
    displayOrder: 1, isActive: true, remarks: null,
    isDeleted: false, deletedAt: null, deletedBy: null,
    createdBy: USER, updatedBy: USER,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  } as ClientType;
}

describe('ClientTypeService', () => {
  let service: ClientTypeService;
  let repo: any;
  let harness: ReturnType<typeof buildHarness>;

  const build = async (lastSequence = 0) => {
    harness = buildHarness(lastSequence);
    repo = makeRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientTypeService, MasterCodeService,
        { provide: getRepositoryToken(ClientType),        useValue: repo },
        { provide: getRepositoryToken(MasterCodeCounter), useValue: makeRepo() },
        { provide: DataSource, useValue: harness.dataSource },
        { provide: CustomLoggerService, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), verbose: jest.fn() } },
      ],
    }).compile();
    service = module.get(ClientTypeService);
  };

  beforeEach(() => build(0));

  // ── Create ───────────────────────────────────────────────────────

  describe('create', () => {
    it('generates 0001 for the first client type in an organization', async () => {
      await service.create(ORG_A, { name: 'Owner' } as CreateClientTypeDto, USER);
      expect(harness.saved[0].code).toBe('0001');
    });

    it('continues the organization sequence', async () => {
      await build(7);
      await service.create(ORG_A, { name: 'Contractor' } as CreateClientTypeDto, USER);
      expect(harness.saved[0].code).toBe('0008');
    });

    it('uses the CLIENT_TYPE sequence key', async () => {
      await service.create(ORG_A, { name: 'Owner' } as CreateClientTypeDto, USER);
      expect(harness.queryRunner.manager.findOne).toHaveBeenCalledWith(
        MasterCodeCounter,
        expect.objectContaining({
          where: expect.objectContaining({ sequenceKey: MasterSequenceKey.CLIENT_TYPE }),
        }),
      );
    });

    it('ignores a code supplied in the payload', async () => {
      await service.create(ORG_A, { name: 'Owner', code: 'OWN' } as any, USER);
      expect(harness.saved[0].code).toBe('0001');
    });

    it('stamps organization, audit and defaults', async () => {
      await service.create(ORG_A, { name: 'Operator' } as CreateClientTypeDto, USER);
      const row = harness.saved[0];

      expect(row.organizationId).toBe(ORG_A);
      expect(row.createdBy).toBe(USER);
      expect(row.dguid).toBeDefined();
      expect(row.isActive).toBe(true);
      expect(row.displayOrder).toBe(0);
    });

    it('honours explicit isActive and displayOrder', async () => {
      await service.create(
        ORG_A, { name: 'Consultant', isActive: false, displayOrder: 5 } as CreateClientTypeDto, USER,
      );
      const row = harness.saved[0];

      expect(row.isActive).toBe(false);
      expect(row.displayOrder).toBe(5);
    });

    it('rolls back without consuming a number when the insert fails', async () => {
      harness.queryRunner.manager.save.mockRejectedValue(new Error('db down'));

      await expect(
        service.create(ORG_A, { name: 'Owner' } as CreateClientTypeDto, USER),
      ).rejects.toThrow('db down');
      expect(harness.queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(harness.queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(harness.queryRunner.release).toHaveBeenCalled();
    });

    it('surfaces a code collision as 409', async () => {
      const err: any = new Error('dup'); err.code = 'ER_DUP_ENTRY';
      harness.queryRunner.manager.save.mockRejectedValue(err);

      await expect(
        service.create(ORG_A, { name: 'Owner' } as CreateClientTypeDto, USER),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── Read ─────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('scopes to the organization and excludes deleted rows', async () => {
      await service.findAll(ORG_A, {} as any);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [{ organizationId: ORG_A, isDeleted: false }],
        }),
      );
    });

    it('returns the items/total/page/limit/totalPages envelope', async () => {
      repo.findAndCount.mockResolvedValue([[existingClientType()], 1]);

      const result = await service.findAll(ORG_A, { page: 1, limit: 20 } as any);

      expect(result).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 });
      expect(result.items[0].code).toBe('0001');
    });

    it('searches name, code and shortName', async () => {
      await service.findAll(ORG_A, { search: 'manu' } as any);

      const { where } = repo.findAndCount.mock.calls[0][0];
      expect(where).toHaveLength(3);
      expect(Object.keys(where[0])).toContain('name');
      expect(Object.keys(where[1])).toContain('code');
      expect(Object.keys(where[2])).toContain('shortName');
    });

    it('applies the isActive filter across every search branch', async () => {
      await service.findAll(ORG_A, { search: 'manu', isActive: true } as any);

      const { where } = repo.findAndCount.mock.calls[0][0];
      expect(where.every((w: any) => w.isActive === true)).toBe(true);
    });

    it('ignores an unknown sortBy instead of interpolating it', async () => {
      await service.findAll(ORG_A, { sortBy: 'name; DROP TABLE client_types' } as any);

      const { order } = repo.findAndCount.mock.calls[0][0];
      expect(order).toEqual({ displayOrder: 'ASC' });
    });
  });

  describe('findOne', () => {
    it('returns the client type', async () => {
      repo.findOne.mockResolvedValue(existingClientType());

      const result = await service.findOne(ORG_A, VT_ID);

      expect(result.id).toBe(VT_ID);
      expect(result.name).toBe('Owner');
    });

    it('404s for another organization', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne(ORG_B, VT_ID)).rejects.toThrow(NotFoundException);
      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: ORG_B }) }),
      );
    });

    it('does not throw when the organization relation is not loaded', async () => {
      repo.findOne.mockResolvedValue(existingClientType({ organization: undefined } as any));

      const result = await service.findOne(ORG_A, VT_ID);

      expect(result.organizationName).toBe('');
    });
  });

  describe('findActive', () => {
    it('returns only active, non-deleted rows ordered for dropdowns', async () => {
      await service.findActive(ORG_A);

      expect(repo.find).toHaveBeenCalledWith({
        where: { organizationId: ORG_A, isActive: true, isDeleted: false },
        order: { displayOrder: 'ASC', name: 'ASC' },
      });
    });
  });

  // ── Update ───────────────────────────────────────────────────────

  describe('update', () => {
    it('applies changes and stamps updatedBy', async () => {
      const ct = existingClientType();
      repo.findOne.mockResolvedValue(ct);

      await service.update(ORG_A, VT_ID, { name: 'Fabricator' } as any, USER);

      expect(ct.name).toBe('Fabricator');
      expect(ct.updatedBy).toBe(USER);
    });

    it('rejects an attempt to change the server-generated code', async () => {
      repo.findOne.mockResolvedValue(existingClientType());

      await expect(
        service.update(ORG_A, VT_ID, { code: 'HACKED' } as any, USER),
      ).rejects.toThrow(ConflictException);
    });

    it('404s for an unknown client type', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update(ORG_A, VT_ID, {} as any, USER)).rejects.toThrow(NotFoundException);
    });

    it('refuses a cross-organization update', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update(ORG_B, VT_ID, { name: 'x' } as any, USER))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── Default seeding ──────────────────────────────────────────────

  describe('ensureDefaults', () => {
    it('does nothing once the organization has any client types', async () => {
      repo.count.mockResolvedValue(3);

      await service.ensureDefaults(ORG_A);

      expect(harness.saved).toHaveLength(0);
    });

    it('seeds the six default types, numbered in order, on first use', async () => {
      repo.count.mockResolvedValue(0);

      await service.ensureDefaults(ORG_A);

      expect(harness.saved.map((r: any) => r.name)).toEqual([
        'Owner', 'Operator', 'EPC Contractor', 'Consultant', 'Government', 'Other',
      ]);
      expect(harness.saved.map((r: any) => r.code)).toEqual(['0001', '0002', '0003', '0004', '0005', '0006']);
      expect(harness.saved.every((r: any) => r.organizationId === ORG_A && r.isActive === true)).toBe(true);
    });

    it('does not seed twice when a concurrent request already did', async () => {
      repo.count.mockResolvedValue(0);
      harness.queryRunner.manager.count.mockResolvedValue(6);

      await service.ensureDefaults(ORG_A);

      expect(harness.saved).toHaveLength(0);
    });

    it('never fails the read that triggered seeding', async () => {
      repo.count.mockResolvedValue(0);
      harness.queryRunner.manager.save.mockRejectedValue(new Error('db down'));

      await expect(service.ensureDefaults(ORG_A)).resolves.toBeUndefined();
    });

    it('is triggered by listing and by the dropdown endpoint', async () => {
      repo.count.mockResolvedValue(0);

      await service.findActive(ORG_A);
      expect(harness.saved).toHaveLength(6);

      harness.saved.length = 0;
      await service.findAll(ORG_A, {} as any);
      expect(harness.saved).toHaveLength(6);
    });
  });

  // ── Delete ───────────────────────────────────────────────────────

  describe('remove', () => {
    it('soft-deletes and deactivates', async () => {
      const ct = existingClientType();
      repo.findOne.mockResolvedValue(ct);

      await service.remove(ORG_A, VT_ID, USER);

      expect(ct.isDeleted).toBe(true);
      expect(ct.isActive).toBe(false);
      expect(ct.deletedBy).toBe(USER);
      expect(ct.deletedAt).toBeInstanceOf(Date);
    });

    it('404s for an already-deleted row', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(ORG_A, VT_ID, USER)).rejects.toThrow(NotFoundException);
    });

    it('refuses a cross-organization delete', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(ORG_B, VT_ID, USER)).rejects.toThrow(NotFoundException);
    });
  });

  // ── DTO contract ─────────────────────────────────────────────────

  describe('CreateClientTypeDto', () => {
    it('validates without a code in the body', async () => {
      const dto = plainToInstance(CreateClientTypeDto, { name: 'Owner' });
      const errors = await validate(dto, { whitelist: true });
      expect(errors).toHaveLength(0);
    });

    it('requires a name', async () => {
      const dto = plainToInstance(CreateClientTypeDto, {});
      const errors = await validate(dto);
      expect(errors.map(e => e.property)).toContain('name');
    });

    it('rejects a supplied code as non-whitelisted', async () => {
      const dto = plainToInstance(CreateClientTypeDto, { name: 'Owner', code: 'OWN' });
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      expect(errors.map(e => e.property)).toContain('code');
    });

    it('rejects a negative displayOrder', async () => {
      const dto = plainToInstance(CreateClientTypeDto, { name: 'Owner', displayOrder: -1 });
      const errors = await validate(dto);
      expect(errors.map(e => e.property)).toContain('displayOrder');
    });
  });
});
