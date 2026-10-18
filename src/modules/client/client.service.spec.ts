import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  BadRequestException, ConflictException, NotFoundException,
} from '@nestjs/common';

import { MasterCodeService, MasterSequenceKey } from 'src/common/services/master-code.service';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { WorkflowLockService } from '../workflow-tracking/workflow-lock.service';
import { ClientType } from '../client-type/entity/client-type.entity';
import { IndustryCategory } from '../industry-category/entities/industry-category.entity';
import { ProjectType } from '../project-type/entity/project-type.entity';

import { ClientService } from './client.service';
import { Client } from './entities/client.entity';
import { ClientAddress } from './entities/client-address.entity';
import { ClientContact } from './entities/client-contact.entity';
import { ClientDocument } from './entities/client-document.entity';
import { ClientAuditLog } from './entities/client-audit-log.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientQueryDto } from './dto/client-query.dto';
import {
  ClientAddressType, ClientAuditAction, ClientDocumentType, ClientStatus,
} from './enums/client.enums';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';
const CLIENT_ID = '33333333-3333-4333-8333-333333333333';
const PARENT_ID = '44444444-4444-4444-8444-444444444444';
const TYPE_ID = '55555555-5555-4555-8555-555555555555';
const IND_ID = '66666666-6666-4666-8666-666666666666';
const PT_ID = '77777777-7777-4777-8777-777777777777';
const USER = 'admin@example.com';

function makeRepo(overrides: Record<string, any> = {}) {
  return {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    count: jest.fn(async () => 0),
    save: jest.fn(async (e: any) => e),
    create: jest.fn((e: any) => ({ ...e })),
    ...overrides,
  };
}

// Chainable stand-in for the query builder used by findAll.
function makeQueryBuilder(result: [any[], number] = [[], 0]) {
  const qb: any = {};
  for (const m of [
    'leftJoinAndSelect', 'leftJoinAndMapOne', 'where', 'andWhere', 'orderBy', 'addOrderBy', 'skip', 'take',
  ]) qb[m] = jest.fn(() => qb);
  qb.getManyAndCount = jest.fn(async () => result);
  return qb;
}

function buildHarness(lastSequence = 0) {
  const saved: Record<string, any[]> = {};
  const counter = { organizationId: ORG_A, lastSequence };
  const existingCodes = new Set<string>();
  const existingChildren: Record<string, any[]> = {};

  const manager: any = {
    create: jest.fn((entity: any, v: any) => {
      const name = typeof entity === 'function' ? entity.name : String(entity);
      return { id: name === 'Client' ? CLIENT_ID : `${name}-${(saved[name]?.length ?? 0) + 1}`, ...v };
    }),
    save: jest.fn(async (entity: any, v: any) => {
      if (entity === MasterCodeCounter) { counter.lastSequence = v.lastSequence; return v; }
      const name = typeof entity === 'function' ? entity.name : String(entity);
      (saved[name] ??= []).push(v);
      return v;
    }),
    findOne: jest.fn(async () => counter),
    find: jest.fn(async (entity: any) => existingChildren[entity.name] ?? []),
    count: jest.fn(async (_entity: any, opts: any) =>
      existingCodes.has(opts?.where?.code) ? 1 : 0),
  };
  const queryRunner = {
    connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(), release: jest.fn(), manager,
  };
  const dataSource = {
    createQueryRunner: jest.fn(() => queryRunner),
    transaction: jest.fn(async (cb: any) => cb(manager)),
  };
  return { saved, counter, existingCodes, existingChildren, manager, queryRunner, dataSource };
}

function existingClient(overrides: Partial<Client> = {}): Client {
  return {
    id: CLIENT_ID, dguid: 'c-dguid', organizationId: ORG_A,
    code: '0001', clientName: 'Gulf Petrochemical Holdings', displayName: 'GPH',
    clientTypeId: TYPE_ID, clientType: { id: TYPE_ID, name: 'Owner' } as ClientType,
    industryCategoryId: IND_ID, industryCategory: { id: IND_ID, name: 'Oil & Gas' } as IndustryCategory,
    parentClientId: null, parentClient: null,
    website: 'www.gph.example', countryCode: 'AE', description: null, notes: null,
    status: ClientStatus.ACTIVE, isActive: true,
    deactivatedBy: null, deactivatedAt: null, deactivationReason: null, version: 3,
    operationalAddressSameAsRegistered: true, timeZone: null, preferredLanguage: null,
    legalEntityName: null, legalEntityType: null, registrationNumber: null,
    taxRegistrationNumber: null, externalBusinessId: null, contractingEntityName: null,
    defaultCurrencyCode: 'USD', defaultPaymentTerms: null, contractReferenceFormat: null,
    purchaseOrderReferenceFormat: null, defaultIncoterms: null, taxRegion: null, dateFormat: null,
    defaultProjectTypeId: null, defaultProjectType: null, defaultProjectCurrencyCode: null,
    measurementSystem: null, documentNumberingScheme: null, defaultWbsTemplate: null,
    defaultCostCodeScheme: null, defaultApprovalWorkflow: null, defaultProcurementTerms: null,
    documentPortalUrl: null, requiresClientApproval: false, requiresDocumentControl: false,
    isDeleted: false, deletedAt: null, deletedBy: null,
    createdBy: USER, updatedBy: USER,
    createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  } as Client;
}

describe('ClientService', () => {
  let service: ClientService;
  let clientRepo: any;
  let addressRepo: any;
  let contactRepo: any;
  let documentRepo: any;
  let auditRepo: any;
  let typeRepo: any;
  let industryRepo: any;
  let projectTypeRepo: any;
  let cloud: { isFileValid: jest.Mock; uploadFile: jest.Mock };
  let harness: ReturnType<typeof buildHarness>;

  const build = async (lastSequence = 0) => {
    harness = buildHarness(lastSequence);
    clientRepo = makeRepo({ findOne: jest.fn(async () => existingClient()) });
    addressRepo = makeRepo();
    contactRepo = makeRepo();
    documentRepo = makeRepo();
    auditRepo = makeRepo();
    typeRepo = makeRepo({ findOne: jest.fn(async () => ({ id: TYPE_ID, isActive: true })) });
    industryRepo = makeRepo({ findOne: jest.fn(async () => ({ id: IND_ID, isActive: true })) });
    projectTypeRepo = makeRepo({ findOne: jest.fn(async () => ({ id: PT_ID, isActive: true })) });
    cloud = {
      isFileValid: jest.fn(async () => true),
      uploadFile: jest.fn(async () => 'https://files.example.com/pm/client/doc.pdf'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientService, MasterCodeService,
        { provide: getRepositoryToken(Client),           useValue: clientRepo },
        { provide: getRepositoryToken(ClientAddress),    useValue: addressRepo },
        { provide: getRepositoryToken(ClientContact),    useValue: contactRepo },
        { provide: getRepositoryToken(ClientDocument),   useValue: documentRepo },
        { provide: getRepositoryToken(ClientAuditLog),   useValue: auditRepo },
        { provide: getRepositoryToken(ClientType),       useValue: typeRepo },
        { provide: getRepositoryToken(IndustryCategory), useValue: industryRepo },
        { provide: getRepositoryToken(ProjectType),      useValue: projectTypeRepo },
        { provide: getRepositoryToken(MasterCodeCounter), useValue: makeRepo() },
        { provide: CloudStorageService, useValue: cloud },
        { provide: DataSource, useValue: harness.dataSource },
        { provide: CustomLoggerService, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), verbose: jest.fn() } },
        {
          provide: WorkflowLockService,
          useValue: { assertProjectEditable: jest.fn(), assertClientEditable: jest.fn(), assertWbsEditable: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(ClientService);
  };

  beforeEach(() => build(0));

  const base = (extra: Partial<CreateClientDto> = {}): CreateClientDto =>
    ({ clientName: 'Gulf Petrochemical Holdings', clientTypeId: TYPE_ID, ...extra } as CreateClientDto);

  // ── Create ───────────────────────────────────────────────────────

  describe('create', () => {
    it('generates 0001 for the first client in an organization', async () => {
      await service.create(ORG_A, base(), USER);
      expect(harness.saved['Client'][0].code).toBe('0001');
    });

    it('continues the organization sequence and uses the CLIENT key', async () => {
      await build(11);
      await service.create(ORG_A, base(), USER);

      expect(harness.saved['Client'][0].code).toBe('0012');
      expect(harness.manager.findOne).toHaveBeenCalledWith(
        MasterCodeCounter,
        expect.objectContaining({ where: expect.objectContaining({ sequenceKey: MasterSequenceKey.CLIENT }) }),
      );
    });

    it('ignores a code supplied in the payload', async () => {
      await service.create(ORG_A, base({ code: 'ACME-01' } as any), USER);
      expect(harness.saved['Client'][0].code).toBe('0001');
    });

    it('stamps organization, audit, status and the starting version', async () => {
      await service.create(ORG_A, base(), USER);
      const row = harness.saved['Client'][0];

      expect(row.organizationId).toBe(ORG_A);
      expect(row.createdBy).toBe(USER);
      expect(row.dguid).toBeDefined();
      expect(row.status).toBe(ClientStatus.ACTIVE);
      expect(row.isActive).toBe(true);
      expect(row.version).toBe(1);
    });

    it('flattens the commercial and project-default sections onto the row', async () => {
      await service.create(ORG_A, base({
        commercial: { legalEntityName: ' Gulf Petrochemical LLC ', defaultCurrencyCode: 'usd', taxRegistrationNumber: '100234567' },
        projectDefaults: { defaultProjectTypeId: PT_ID, requiresClientApproval: true },
      }), USER);
      const row = harness.saved['Client'][0];

      expect(row.legalEntityName).toBe('Gulf Petrochemical LLC');
      expect(row.defaultCurrencyCode).toBe('USD');
      expect(row.taxRegistrationNumber).toBe('100234567');
      expect(row.defaultProjectTypeId).toBe(PT_ID);
      expect(row.requiresClientApproval).toBe(true);
    });

    it('stores blank optional text as null and upper-cases the country', async () => {
      await service.create(ORG_A, base({ website: '   ', countryCode: 'ae' }), USER);
      const row = harness.saved['Client'][0];

      expect(row.website).toBeNull();
      expect(row.countryCode).toBe('AE');
    });

    it('creates the supplied addresses and contacts with the client', async () => {
      await service.create(ORG_A, base({
        addresses: [{ addressType: ClientAddressType.REGISTERED, addressLine1: '1 Sheikh Zayed Rd', countryCode: 'AE' }],
        contacts: [{ contactName: 'Priya Raman', email: 'Priya@Example.com', isPrimary: true }],
      }), USER);

      expect(harness.saved['ClientAddress']).toHaveLength(1);
      expect(harness.saved['ClientAddress'][0]).toMatchObject({ clientId: CLIENT_ID, addressType: 'REGISTERED' });
      expect(harness.saved['ClientContact'][0]).toMatchObject({
        clientId: CLIENT_ID, contactName: 'Priya Raman', email: 'priya@example.com', isPrimary: true,
      });
    });

    it('writes a CREATED audit entry', async () => {
      await service.create(ORG_A, base(), USER);

      expect(harness.saved['ClientAuditLog'][0]).toMatchObject({
        action: ClientAuditAction.CREATED, performedBy: USER, clientId: CLIENT_ID,
      });
    });

    describe('references', () => {
      it('rejects an unknown or foreign client type', async () => {
        typeRepo.findOne.mockResolvedValue(null);
        await expect(service.create(ORG_A, base(), USER)).rejects.toThrow(BadRequestException);
        expect(typeRepo.findOne).toHaveBeenCalledWith({
          where: { id: TYPE_ID, organizationId: ORG_A, isDeleted: false },
        });
      });

      it('rejects an inactive client type', async () => {
        typeRepo.findOne.mockResolvedValue({ id: TYPE_ID, isActive: false });
        await expect(service.create(ORG_A, base(), USER)).rejects.toThrow('inactive');
      });

      it('rejects an unknown industry category', async () => {
        industryRepo.findOne.mockResolvedValue(null);
        await expect(service.create(ORG_A, base({ industryCategoryId: IND_ID }), USER))
          .rejects.toThrow(BadRequestException);
      });

      it('rejects an unknown default project type', async () => {
        projectTypeRepo.findOne.mockResolvedValue(null);
        await expect(service.create(
          ORG_A, base({ projectDefaults: { defaultProjectTypeId: PT_ID } }), USER,
        )).rejects.toThrow(BadRequestException);
      });

      it('rejects a parent that does not exist in the organization', async () => {
        clientRepo.findOne.mockResolvedValue(null);
        await expect(service.create(ORG_A, base({ parentClientId: PARENT_ID }), USER))
          .rejects.toThrow('parent client was not found');
      });
    });

    describe('address and contact rules', () => {
      it('allows only one registered address', async () => {
        await expect(service.create(ORG_A, base({
          addresses: [
            { addressType: ClientAddressType.REGISTERED },
            { addressType: ClientAddressType.REGISTERED },
          ],
        }), USER)).rejects.toThrow('only one registered address');
      });

      it('rejects operational addresses while the operational address is the registered one', async () => {
        await expect(service.create(ORG_A, base({
          operationalAddressSameAsRegistered: true,
          addresses: [{ addressType: ClientAddressType.OPERATIONAL, label: 'Dubai office' }],
        }), USER)).rejects.toThrow(BadRequestException);
      });

      it('accepts several operational offices when the flag is off', async () => {
        await service.create(ORG_A, base({
          operationalAddressSameAsRegistered: false,
          addresses: [
            { addressType: ClientAddressType.OPERATIONAL, label: 'Dubai' },
            { addressType: ClientAddressType.OPERATIONAL, label: 'Abu Dhabi' },
          ],
        }), USER);

        expect(harness.saved['ClientAddress']).toHaveLength(2);
      });

      it('allows only one active primary contact', async () => {
        await expect(service.create(ORG_A, base({
          contacts: [
            { contactName: 'A', isPrimary: true },
            { contactName: 'B', isPrimary: true },
          ],
        }), USER)).rejects.toThrow('Only one active contact');
      });

      it('lets an inactive contact keep the primary flag alongside an active primary', async () => {
        await expect(service.create(ORG_A, base({
          contacts: [
            { contactName: 'A', isPrimary: true },
            { contactName: 'B', isPrimary: true, isActive: false },
          ],
        }), USER)).resolves.toBeDefined();
      });

      it('requires every contact to have a name', async () => {
        await expect(service.create(ORG_A, base({
          contacts: [{ contactName: '   ' }],
        }), USER)).rejects.toThrow('Contact 1 needs a name');
      });
    });

    it('rolls back without consuming a number when the insert fails', async () => {
      harness.manager.save.mockRejectedValue(new Error('db down'));

      await expect(service.create(ORG_A, base(), USER)).rejects.toThrow('db down');
      expect(harness.queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(harness.queryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('surfaces a code collision as 409', async () => {
      const err: any = new Error('dup'); err.code = 'ER_DUP_ENTRY';
      harness.manager.save.mockRejectedValue(err);

      await expect(service.create(ORG_A, base(), USER)).rejects.toThrow(ConflictException);
    });
  });

  // ── Read ─────────────────────────────────────────────────────────

  describe('findAll', () => {
    const useQb = (result: [any[], number] = [[], 0]) => {
      const qb = makeQueryBuilder(result);
      clientRepo.createQueryBuilder = jest.fn(() => qb);
      return qb;
    };

    it('scopes to the organization and excludes deleted rows', async () => {
      const qb = useQb();
      await service.findAll(ORG_A, {} as ClientQueryDto);

      expect(qb.where).toHaveBeenCalledWith('c.organizationId = :organizationId', { organizationId: ORG_A });
      expect(qb.andWhere).toHaveBeenCalledWith('c.isDeleted = :isDeleted', { isDeleted: false });
    });

    it('applies every filter', async () => {
      const qb = useQb();
      await service.findAll(ORG_A, {
        clientTypeId: TYPE_ID, industryCategoryId: IND_ID, countryCode: 'ae',
        status: ClientStatus.INACTIVE, parentClientId: PARENT_ID,
      } as ClientQueryDto);

      expect(qb.andWhere).toHaveBeenCalledWith('c.clientTypeId = :clientTypeId', { clientTypeId: TYPE_ID });
      expect(qb.andWhere).toHaveBeenCalledWith('c.industryCategoryId = :industryCategoryId', { industryCategoryId: IND_ID });
      expect(qb.andWhere).toHaveBeenCalledWith('c.countryCode = :countryCode', { countryCode: 'AE' });
      expect(qb.andWhere).toHaveBeenCalledWith('c.status = :status', { status: ClientStatus.INACTIVE });
      expect(qb.andWhere).toHaveBeenCalledWith('c.parentClientId = :parentClientId', { parentClientId: PARENT_ID });
    });

    it('searches code, name, display name and legal entity, escaping wildcards', async () => {
      const qb = useQb();
      await service.findAll(ORG_A, { search: ' 50%_X ' } as ClientQueryDto);

      const call = qb.andWhere.mock.calls.find((c: any[]) => typeof c[0] === 'string' && c[0].includes('LIKE'));
      expect(call[0]).toEqual(expect.stringContaining('c.code'));
      expect(call[0]).toEqual(expect.stringContaining('c.clientName'));
      expect(call[0]).toEqual(expect.stringContaining('c.displayName'));
      expect(call[0]).toEqual(expect.stringContaining('c.legalEntityName'));
      expect(call[1]).toEqual({ like: '%50\\%\\_x%' });
    });

    it('sorts by a whitelisted column, tie-broken by code', async () => {
      const qb = useQb();
      await service.findAll(ORG_A, { sortBy: 'clientType', sortOrder: 'ASC' } as ClientQueryDto);

      expect(qb.orderBy).toHaveBeenCalledWith('ct.name', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('c.code', 'ASC');
    });

    it('ignores an unknown sortBy and an unknown direction instead of interpolating them', async () => {
      const qb = useQb();
      await service.findAll(ORG_A, { sortBy: 'name; DROP TABLE clients', sortOrder: 'ASC; --' } as any);

      expect(qb.orderBy).toHaveBeenCalledWith('c.createdAt', 'DESC');
    });

    it('returns the envelope with names resolved and the primary contact flattened', async () => {
      useQb([[{
        ...existingClient(),
        parentClient: { clientName: 'Gulf Group' },
        primaryContact: { contactName: 'Priya Raman', email: 'priya@example.com', mobile: '+971 50 123 4567', phone: null },
      }], 1]);

      const result = await service.findAll(ORG_A, { page: 1, limit: 20 } as ClientQueryDto);

      expect(result).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 });
      expect(result.items[0]).toMatchObject({
        code: '0001', clientTypeName: 'Owner', industryCategoryName: 'Oil & Gas',
        parentClientName: 'Gulf Group', primaryContactName: 'Priya Raman',
        primaryContactEmail: 'priya@example.com', primaryContactPhone: '+971 50 123 4567',
      });
    });
  });

  describe('findOne', () => {
    it('returns the client with its nested sections and children', async () => {
      addressRepo.find.mockResolvedValue([
        { id: 'a1', addressType: 'REGISTERED', addressLine1: '1 Sheikh Zayed Rd', countryCode: 'AE', isActive: true },
      ]);
      contactRepo.find.mockResolvedValue([
        { id: 'k1', contactName: 'Priya Raman', isPrimary: true, isActive: true, email: 'priya@example.com' },
      ]);
      documentRepo.find.mockResolvedValue([
        { id: 'd1', documentType: ClientDocumentType.NDA, documentName: 'NDA', documentUrl: 'https://f/x.pdf', expiryDate: '2020-01-01' },
        { id: 'd2', documentType: ClientDocumentType.NDA, documentName: 'NDA 2', documentUrl: 'https://f/y.pdf', expiryDate: '2999-01-01' },
      ]);

      const result = await service.findOne(ORG_A, CLIENT_ID);

      expect(result.version).toBe(3);
      expect(result.commercial.defaultCurrencyCode).toBe('USD');
      expect(result.addresses).toHaveLength(1);
      expect(result.contacts[0].contactName).toBe('Priya Raman');
      expect(result.primaryContactName).toBe('Priya Raman');
      expect(result.documents.map((d) => d.isExpired)).toEqual([true, false]);
    });

    it('404s for another organization', async () => {
      clientRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(ORG_B, CLIENT_ID)).rejects.toThrow(NotFoundException);
      expect(clientRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: ORG_B, isDeleted: false }) }),
      );
    });
  });

  describe('findActive', () => {
    it('returns only active, non-deleted clients in name order', async () => {
      await service.findActive(ORG_A);

      expect(clientRepo.find).toHaveBeenCalledWith({
        where: { organizationId: ORG_A, isActive: true, isDeleted: false },
        order: { clientName: 'ASC' },
      });
    });
  });

  // ── Update ───────────────────────────────────────────────────────

  describe('update', () => {
    it('applies changes, bumps the version and stamps updatedBy', async () => {
      const client = existingClient();
      clientRepo.findOne.mockResolvedValue(client);

      await service.update(ORG_A, CLIENT_ID, { displayName: ' GPH Group ', website: null } as UpdateClientDto, USER);

      expect(client.displayName).toBe('GPH Group');
      expect(client.website).toBeNull();
      expect(client.version).toBe(4);
      expect(client.updatedBy).toBe(USER);
    });

    it('leaves fields that were not sent untouched', async () => {
      const client = existingClient();
      clientRepo.findOne.mockResolvedValue(client);

      await service.update(ORG_A, CLIENT_ID, { notes: 'Preferred vendor list applies' } as UpdateClientDto, USER);

      expect(client.clientName).toBe('Gulf Petrochemical Holdings');
      expect(client.countryCode).toBe('AE');
      expect(client.defaultCurrencyCode).toBe('USD');
    });

    it('rejects a stale version with 409 and saves nothing', async () => {
      clientRepo.findOne.mockResolvedValue(existingClient({ version: 5 }));

      await expect(service.update(ORG_A, CLIENT_ID, { version: 3, notes: 'x' } as UpdateClientDto, USER))
        .rejects.toThrow(ConflictException);
      expect(harness.dataSource.transaction).not.toHaveBeenCalled();
    });

    it('accepts the current version', async () => {
      clientRepo.findOne.mockResolvedValue(existingClient({ version: 5 }));

      await expect(service.update(ORG_A, CLIENT_ID, { version: 5, notes: 'x' } as UpdateClientDto, USER))
        .resolves.toBeDefined();
    });

    it('rejects an attempt to change the code or the status', async () => {
      await expect(service.update(ORG_A, CLIENT_ID, { code: 'HACKED' } as any, USER))
        .rejects.toThrow(ConflictException);
      await expect(service.update(ORG_A, CLIENT_ID, { status: 'INACTIVE' } as any, USER))
        .rejects.toThrow(ConflictException);
    });

    it('rejects a blank client name', async () => {
      await expect(service.update(ORG_A, CLIENT_ID, { clientName: '  ' } as UpdateClientDto, USER))
        .rejects.toThrow('Client name is required');
    });

    it('does not re-check a client type that did not change', async () => {
      clientRepo.findOne.mockResolvedValue(existingClient());

      await service.update(ORG_A, CLIENT_ID, { clientTypeId: TYPE_ID, notes: 'x' } as UpdateClientDto, USER);

      expect(typeRepo.findOne).not.toHaveBeenCalled();
    });

    it('404s for an unknown client and refuses a cross-organization update', async () => {
      clientRepo.findOne.mockResolvedValue(null);

      await expect(service.update(ORG_B, CLIENT_ID, { notes: 'x' } as UpdateClientDto, USER))
        .rejects.toThrow(NotFoundException);
    });

    describe('parent client', () => {
      it('rejects making a client its own parent', async () => {
        clientRepo.findOne.mockResolvedValue(existingClient());

        await expect(service.update(ORG_A, CLIENT_ID, { parentClientId: CLIENT_ID } as UpdateClientDto, USER))
          .rejects.toThrow('its own parent');
      });

      it('rejects a parent that is one of the client\'s own subsidiaries', async () => {
        clientRepo.findOne.mockImplementation(async ({ where }: any) => {
          if (where.id === CLIENT_ID) return existingClient();
          if (where.id === PARENT_ID) return existingClient({ id: PARENT_ID, parentClientId: CLIENT_ID });
          return null;
        });

        await expect(service.update(ORG_A, CLIENT_ID, { parentClientId: PARENT_ID } as UpdateClientDto, USER))
          .rejects.toThrow(BadRequestException);
      });

      it('accepts a valid parent', async () => {
        clientRepo.findOne.mockImplementation(async ({ where }: any) => {
          if (where.id === CLIENT_ID) return existingClient();
          if (where.id === PARENT_ID) return existingClient({ id: PARENT_ID, parentClientId: null });
          return null;
        });

        await expect(service.update(ORG_A, CLIENT_ID, { parentClientId: PARENT_ID } as UpdateClientDto, USER))
          .resolves.toBeDefined();
      });
    });

    describe('children', () => {
      it('updates addresses by id, creates new ones and removes the rest', async () => {
        clientRepo.findOne.mockResolvedValue(existingClient());
        const kept = { id: 'a1', clientId: CLIENT_ID, isDeleted: false, addressType: 'REGISTERED' };
        const dropped = { id: 'a2', clientId: CLIENT_ID, isDeleted: false, addressType: 'OPERATIONAL' };
        harness.existingChildren['ClientAddress'] = [kept, dropped];
        addressRepo.find.mockResolvedValue([kept, dropped]);

        await service.update(ORG_A, CLIENT_ID, {
          operationalAddressSameAsRegistered: false,
          addresses: [
            { id: 'a1', addressType: ClientAddressType.REGISTERED, city: 'Dubai' },
            { addressType: ClientAddressType.OPERATIONAL, label: 'Abu Dhabi' },
          ],
        } as UpdateClientDto, USER);

        expect(kept).toMatchObject({ city: 'Dubai', updatedBy: USER });
        expect(dropped).toMatchObject({ isDeleted: true, isActive: false, deletedBy: USER });
        expect(harness.saved['ClientAddress'].some((r: any) => r.label === 'Abu Dhabi')).toBe(true);
      });

      it('rejects an address id that belongs to another client', async () => {
        clientRepo.findOne.mockResolvedValue(existingClient());
        harness.existingChildren['ClientAddress'] = [];

        await expect(service.update(ORG_A, CLIENT_ID, {
          operationalAddressSameAsRegistered: false,
          addresses: [{ id: 'foreign', addressType: ClientAddressType.OPERATIONAL }],
        } as UpdateClientDto, USER)).rejects.toThrow('does not belong to this client');
      });

      it('leaves children alone when they are not in the payload', async () => {
        clientRepo.findOne.mockResolvedValue(existingClient());

        await service.update(ORG_A, CLIENT_ID, { notes: 'x' } as UpdateClientDto, USER);

        expect(harness.manager.find).not.toHaveBeenCalled();
      });

      it('uses the stored same-as-registered flag when the payload does not carry it', async () => {
        clientRepo.findOne.mockResolvedValue(existingClient({ operationalAddressSameAsRegistered: true }));

        await expect(service.update(ORG_A, CLIENT_ID, {
          addresses: [{ addressType: ClientAddressType.OPERATIONAL, label: 'Dubai' }],
        } as UpdateClientDto, USER)).rejects.toThrow(BadRequestException);
      });
    });

    describe('audit history', () => {
      it('records which fields changed, with before and after values', async () => {
        clientRepo.findOne.mockResolvedValue(existingClient());

        await service.update(ORG_A, CLIENT_ID, {
          displayName: 'GPH Group',
          commercial: { defaultCurrencyCode: 'AED' },
        } as UpdateClientDto, USER);

        const entry = auditRepo.create.mock.calls.at(-1)[0];
        expect(entry.action).toBe(ClientAuditAction.UPDATED);
        expect(entry.version).toBe(4);
        expect(entry.changes).toEqual(expect.arrayContaining([
          { field: 'displayName', from: 'GPH', to: 'GPH Group' },
          { field: 'defaultCurrencyCode', from: 'USD', to: 'AED' },
        ]));
      });

      it('writes nothing when nothing changed', async () => {
        clientRepo.findOne.mockResolvedValue(existingClient());

        await service.update(ORG_A, CLIENT_ID, { displayName: 'GPH' } as UpdateClientDto, USER);

        expect(auditRepo.save).not.toHaveBeenCalled();
      });

      it('does not fail the update when the history entry cannot be written', async () => {
        clientRepo.findOne.mockResolvedValue(existingClient());
        auditRepo.save.mockRejectedValue(new Error('audit down'));

        await expect(service.update(ORG_A, CLIENT_ID, { notes: 'x' } as UpdateClientDto, USER))
          .resolves.toBeDefined();
      });
    });
  });

  // ── Lifecycle ────────────────────────────────────────────────────

  describe('deactivate', () => {
    it('records who, when and why, and keeps the client', async () => {
      const client = existingClient();
      clientRepo.findOne.mockResolvedValue(client);

      await service.deactivate(ORG_A, CLIENT_ID, USER, '  Contract concluded ');

      expect(client).toMatchObject({
        status: ClientStatus.INACTIVE, isActive: false, deactivatedBy: USER,
        deactivationReason: 'Contract concluded', isDeleted: false, version: 4,
      });
      expect(client.deactivatedAt).toBeInstanceOf(Date);
    });

    it('accepts no reason', async () => {
      const client = existingClient();
      clientRepo.findOne.mockResolvedValue(client);

      await service.deactivate(ORG_A, CLIENT_ID, USER);

      expect(client.deactivationReason).toBeNull();
    });

    it('rejects an already inactive client', async () => {
      clientRepo.findOne.mockResolvedValue(existingClient({ status: ClientStatus.INACTIVE, isActive: false }));

      await expect(service.deactivate(ORG_A, CLIENT_ID, USER)).rejects.toThrow('already inactive');
    });

    it('is recorded in the history', async () => {
      clientRepo.findOne.mockResolvedValue(existingClient());

      await service.deactivate(ORG_A, CLIENT_ID, USER, 'Done');

      expect(auditRepo.create.mock.calls.at(-1)[0]).toMatchObject({
        action: ClientAuditAction.DEACTIVATED, summary: 'Client deactivated: Done',
      });
    });
  });

  describe('activate', () => {
    it('reactivates and clears the deactivation details', async () => {
      const client = existingClient({
        status: ClientStatus.INACTIVE, isActive: false, deactivatedBy: USER,
        deactivatedAt: new Date(), deactivationReason: 'Done',
      });
      clientRepo.findOne.mockResolvedValue(client);

      await service.activate(ORG_A, CLIENT_ID, USER);

      expect(client).toMatchObject({
        status: ClientStatus.ACTIVE, isActive: true, deactivatedBy: null,
        deactivatedAt: null, deactivationReason: null,
      });
    });

    it('rejects an already active client', async () => {
      clientRepo.findOne.mockResolvedValue(existingClient());
      await expect(service.activate(ORG_A, CLIENT_ID, USER)).rejects.toThrow('already active');
    });
  });

  describe('remove', () => {
    it('soft-deletes the client', async () => {
      const client = existingClient();
      clientRepo.findOne.mockResolvedValue(client);

      await service.remove(ORG_A, CLIENT_ID, USER);

      expect(client).toMatchObject({ isDeleted: true, isActive: false, deletedBy: USER });
      expect(client.deletedAt).toBeInstanceOf(Date);
    });

    it('refuses while the client is the parent of other clients', async () => {
      clientRepo.findOne.mockResolvedValue(existingClient());
      clientRepo.count.mockResolvedValue(2);

      await expect(service.remove(ORG_A, CLIENT_ID, USER)).rejects.toThrow(ConflictException);
      expect(clientRepo.save).not.toHaveBeenCalled();
    });

    it('404s for an already-deleted client', async () => {
      clientRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(ORG_A, CLIENT_ID, USER)).rejects.toThrow(NotFoundException);
    });
  });

  // ── Documents ────────────────────────────────────────────────────

  describe('documents', () => {
    const doc = (extra: Record<string, unknown> = {}) => ({
      documentType: ClientDocumentType.NDA,
      documentName: ' Mutual NDA ',
      documentUrl: 'https://files.example.com/pm/client/nda.pdf',
      ...extra,
    } as any);

    it('uploads through cloud storage under the organization folder', async () => {
      const result = await service.uploadDocument(ORG_A, { originalname: 'nda.pdf' } as any);

      expect(cloud.isFileValid).toHaveBeenCalled();
      expect(cloud.uploadFile).toHaveBeenCalledWith(expect.anything(), `pm/client/${ORG_A}`);
      expect(result.url).toBe('https://files.example.com/pm/client/doc.pdf');
    });

    it('registers a document with provenance', async () => {
      const saved = await service.addDocument(ORG_A, CLIENT_ID, doc({ issueDate: '2026-01-01', expiryDate: '2027-01-01' }), USER);

      const row = documentRepo.create.mock.calls[0][0];
      expect(row).toMatchObject({
        clientId: CLIENT_ID, organizationId: ORG_A, documentName: 'Mutual NDA',
        uploadedBy: USER, isActive: true,
      });
      expect(saved.documentName).toBe('Mutual NDA');
    });

    it('rejects an expiry date before the issue date', async () => {
      await expect(service.addDocument(
        ORG_A, CLIENT_ID, doc({ issueDate: '2026-06-01', expiryDate: '2026-01-01' }), USER,
      )).rejects.toThrow('earlier than the issue date');
    });

    it('404s when the client does not exist', async () => {
      clientRepo.findOne.mockResolvedValue(null);
      await expect(service.addDocument(ORG_A, CLIENT_ID, doc(), USER)).rejects.toThrow(NotFoundException);
    });

    it('soft-deletes a document of this client only', async () => {
      const row = { id: 'd1', clientId: CLIENT_ID, documentName: 'NDA', isDeleted: false, isActive: true };
      documentRepo.findOne.mockResolvedValue(row);

      await service.removeDocument(ORG_A, CLIENT_ID, 'd1', USER);

      expect(documentRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'd1', clientId: CLIENT_ID, organizationId: ORG_A, isDeleted: false },
      });
      expect(row).toMatchObject({ isDeleted: true, isActive: false, deletedBy: USER });
    });

    it('404s for a document that is not there', async () => {
      documentRepo.findOne.mockResolvedValue(null);
      await expect(service.removeDocument(ORG_A, CLIENT_ID, 'nope', USER)).rejects.toThrow(NotFoundException);
    });
  });

  // ── Audit history ────────────────────────────────────────────────

  describe('getAuditHistory', () => {
    it('returns the newest entries first, scoped to the organization', async () => {
      auditRepo.find.mockResolvedValue([
        { id: 'l1', action: 'UPDATED', summary: 'Updated 1 field', changes: [{ field: 'notes', from: null, to: 'x' }], performedBy: USER, version: 2, createdAt: new Date() },
      ]);

      const result = await service.getAuditHistory(ORG_A, CLIENT_ID);

      expect(auditRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { organizationId: ORG_A, clientId: CLIENT_ID },
        order: { createdAt: 'DESC' },
      }));
      expect(result[0]).toMatchObject({ action: 'UPDATED', performedBy: USER });
    });
  });

  // ── DTO contract ─────────────────────────────────────────────────

  describe('CreateClientDto', () => {
    const errorsFor = async (payload: object, options = {}) =>
      (await validate(plainToInstance(CreateClientDto, payload), options)).map((e) => e.property);

    it('validates with only a name and a type', async () => {
      expect(await errorsFor({ clientName: 'Acme', clientTypeId: TYPE_ID })).toEqual([]);
    });

    it('requires the name and the client type', async () => {
      const props = await errorsFor({});
      expect(props).toEqual(expect.arrayContaining(['clientName', 'clientTypeId']));
    });

    it('rejects a client type that is not a UUID', async () => {
      expect(await errorsFor({ clientName: 'Acme', clientTypeId: 'owner' })).toContain('clientTypeId');
    });

    it('validates the website and country formats', async () => {
      const props = await errorsFor({
        clientName: 'Acme', clientTypeId: TYPE_ID, website: 'not a url', countryCode: 'UAE',
      });
      expect(props).toEqual(expect.arrayContaining(['website', 'countryCode']));
    });

    it('upper-cases the country code before validating', async () => {
      const dto = plainToInstance(CreateClientDto, {
        clientName: 'Acme', clientTypeId: TYPE_ID, countryCode: 'ae',
      });
      expect(dto.countryCode).toBe('AE');
      expect(await validate(dto)).toHaveLength(0);
    });

    it('has no code field — a supplied one is rejected as non-whitelisted', async () => {
      const dto = plainToInstance(CreateClientDto, { clientName: 'Acme', clientTypeId: TYPE_ID, code: '0001' });
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      expect(errors.map((e) => e.property)).toContain('code');
    });

    it('validates nested contacts', async () => {
      const dto = plainToInstance(CreateClientDto, {
        clientName: 'Acme', clientTypeId: TYPE_ID,
        contacts: [{ contactName: 'A', email: 'nope', mobile: '0501234567' }],
      });
      const errors = await validate(dto);
      const contactErrors = errors.find((e) => e.property === 'contacts')!.children![0].children!.map((c) => c.property);
      expect(contactErrors).toEqual(expect.arrayContaining(['email', 'mobile']));
    });

    it('validates the currency, incoterm and measurement system', async () => {
      const props = await validate(plainToInstance(CreateClientDto, {
        clientName: 'Acme', clientTypeId: TYPE_ID,
        commercial: { defaultCurrencyCode: 'DOLLAR', defaultIncoterms: 'XYZ' },
        projectDefaults: { measurementSystem: 'FURLONGS' },
      }));
      const commercial = props.find((e) => e.property === 'commercial')!.children!.map((c) => c.property);
      const defaults = props.find((e) => e.property === 'projectDefaults')!.children!.map((c) => c.property);
      expect(commercial).toEqual(expect.arrayContaining(['defaultCurrencyCode', 'defaultIncoterms']));
      expect(defaults).toContain('measurementSystem');
    });

    it('accepts null on optional fields so they can be cleared', async () => {
      expect(await errorsFor({
        clientName: 'Acme', clientTypeId: TYPE_ID, website: null, industryCategoryId: null,
        parentClientId: null, countryCode: null,
      })).toEqual([]);
    });
  });

  describe('UpdateClientDto', () => {
    it('does not accept a code or a status', async () => {
      const dto = plainToInstance(UpdateClientDto, { code: 'X1', status: 'INACTIVE' });
      const props = (await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).map((e) => e.property);
      expect(props).toEqual(expect.arrayContaining(['code', 'status']));
    });

    it('allows any subset including the version', async () => {
      const dto = plainToInstance(UpdateClientDto, { notes: 'x', version: 2 });
      expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);
    });
  });

  describe('ClientQueryDto', () => {
    it('only accepts ASC or DESC as the sort direction', async () => {
      const dto = plainToInstance(ClientQueryDto, { sortOrder: 'ASC; DROP' });
      expect((await validate(dto)).map((e) => e.property)).toContain('sortOrder');
    });
  });
});
