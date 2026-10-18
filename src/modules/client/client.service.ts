import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MasterCodeService, MasterSequenceKey } from 'src/common/services/master-code.service';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { WorkflowLockService } from '../workflow-tracking/workflow-lock.service';
import { ClientType } from '../client-type/entity/client-type.entity';
import { IndustryCategory } from '../industry-category/entities/industry-category.entity';
import { ProjectType } from '../project-type/entity/project-type.entity';
import { Client } from './entities/client.entity';
import { ClientAddress } from './entities/client-address.entity';
import { ClientContact } from './entities/client-contact.entity';
import { ClientDocument } from './entities/client-document.entity';
import { ClientAuditLog } from './entities/client-audit-log.entity';
import {
  ClientAddressType, ClientAuditAction, ClientStatus,
} from './enums/client.enums';
import {
  ClientAddressDto, ClientContactDto, CreateClientDto,
} from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientQueryDto } from './dto/client-query.dto';
import { AddClientDocumentDto } from './dto/client-document.dto';
import {
  ClientAddressResponseDto, ClientAuditEntryDto, ClientContactResponseDto,
  ClientDocumentResponseDto, ClientListItemDto, ClientListResponseDto,
  ClientOptionDto, ClientResponseDto,
} from './dto/client-response.dto';

// Whitelist of sortBy value → query-builder column. Anything else falls back to
// createdAt, so a caller can never inject a column expression.
const SORT_COLUMNS: Record<string, string> = {
  code:       'c.code',
  clientName:       'c.clientName',
  clientType:       'ct.name',
  industryCategory: 'ic.name',
  countryCode:      'c.countryCode',
  status:           'c.status',
  createdAt:        'c.createdAt',
  updatedAt:        'c.updatedAt',
};

// Text columns: trimmed on the way in, blank stored as null.
const BASIC_TEXT = [
  'displayName', 'website', 'description', 'notes', 'timeZone', 'preferredLanguage',
] as const;

const COMMERCIAL_KEYS = [
  'legalEntityName', 'legalEntityType', 'registrationNumber', 'taxRegistrationNumber',
  'externalBusinessId', 'contractingEntityName', 'defaultCurrencyCode', 'defaultPaymentTerms',
  'contractReferenceFormat', 'purchaseOrderReferenceFormat', 'defaultIncoterms', 'taxRegion',
  'dateFormat',
] as const;

const DEFAULT_KEYS = [
  'defaultProjectTypeId', 'defaultProjectCurrencyCode', 'measurementSystem',
  'documentNumberingScheme', 'defaultWbsTemplate', 'defaultCostCodeScheme',
  'defaultApprovalWorkflow', 'defaultProcurementTerms', 'documentPortalUrl',
  'requiresClientApproval', 'requiresDocumentControl',
] as const;

const BOOLEAN_KEYS = new Set<string>([
  'operationalAddressSameAsRegistered', 'requiresClientApproval', 'requiresDocumentControl',
]);
const UPPERCASE_KEYS = new Set<string>(['countryCode', 'defaultCurrencyCode', 'defaultProjectCurrencyCode']);

// What the audit history compares when a client is updated.
const TRACKED_FIELDS: readonly string[] = [
  'clientName', 'displayName', 'clientTypeId', 'industryCategoryId', 'parentClientId',
  'website', 'countryCode', 'description', 'notes', 'operationalAddressSameAsRegistered',
  'timeZone', 'preferredLanguage', ...COMMERCIAL_KEYS, ...DEFAULT_KEYS,
];

const ADDRESS_AUDIT_FIELDS = [
  'addressType', 'label', 'addressLine1', 'addressLine2', 'city', 'state',
  'postalCode', 'countryCode', 'isActive',
] as const;

const CONTACT_AUDIT_FIELDS = [
  'contactName', 'jobTitle', 'department', 'contactRole', 'email', 'phone', 'mobile',
  'preferredContactMethod', 'isPrimary', 'isProjectContact', 'isProcurementContact',
  'isFinanceContact', 'isActive',
] as const;

const MAX_PARENT_DEPTH = 20;
const AUDIT_VALUE_MAX = 120;

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)           private readonly clientRepo: Repository<Client>,
    @InjectRepository(ClientAddress)    private readonly addressRepo: Repository<ClientAddress>,
    @InjectRepository(ClientContact)    private readonly contactRepo: Repository<ClientContact>,
    @InjectRepository(ClientDocument)   private readonly documentRepo: Repository<ClientDocument>,
    @InjectRepository(ClientAuditLog)   private readonly auditRepo: Repository<ClientAuditLog>,
    @InjectRepository(ClientType)       private readonly typeRepo: Repository<ClientType>,
    @InjectRepository(IndustryCategory) private readonly industryRepo: Repository<IndustryCategory>,
    @InjectRepository(ProjectType)      private readonly projectTypeRepo: Repository<ProjectType>,
    private readonly masterCodeService: MasterCodeService,
    private readonly cloudStorageService: CloudStorageService,
    private readonly dataSource: DataSource,
    private readonly logger: CustomLoggerService,
    private readonly workflowLock: WorkflowLockService,
  ) {}

  // ── Create ───────────────────────────────────────────────────────

  async create(
    organizationId: string,
    dto: CreateClientDto,
    createdBy: string,
  ): Promise<ClientResponseDto> {
    this.assertName(dto.clientName);
    this.assertChildRules(dto.addresses, dto.contacts, dto.operationalAddressSameAsRegistered ?? true);
    await this.assertReferences(organizationId, dto);
    if (dto.parentClientId) await this.assertParent(organizationId, null, dto.parentClientId);

    // code is server-generated: a per-organization sequence starting at 0001.
    // Generation and insert share one transaction, under a row lock on the
    // counter, so concurrent creates cannot be handed the same number.
    let saved: Client;
    try {
      saved = await this.masterCodeService.withGeneratedCode(
        organizationId,
        MasterSequenceKey.CLIENT,
        (code, queryRunner) => this.insertClient(queryRunner.manager, organizationId, code, dto, createdBy),
      );
    } catch (err) {
      this.logger.error(
        `Failed to create client "${dto.clientName}" in organization ${organizationId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
      if ((err as { code?: string })?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('A client with this code already exists in your organization');
      }
      throw err;
    }

    return this.findOne(organizationId, saved.id);
  }

  private async insertClient(
    manager: EntityManager,
    organizationId: string,
    code: string,
    dto: CreateClientDto,
    createdBy: string,
  ): Promise<Client> {
    const status = dto.status ?? ClientStatus.ACTIVE;

    const row = manager.create(Client, {
      operationalAddressSameAsRegistered: true,
      requiresClientApproval: false,
      requiresDocumentControl: false,
      ...this.toColumns(dto),
      dguid: uuidv4(),
      organizationId,
      code,
      clientName: dto.clientName.trim(),
      clientTypeId: dto.clientTypeId,
      status,
      isActive: status === ClientStatus.ACTIVE,
      version: 1,
      createdBy,
    });
    const saved = await manager.save(Client, row);

    if (dto.addresses) await this.syncAddresses(manager, saved, dto.addresses, createdBy);
    if (dto.contacts)  await this.syncContacts(manager, saved, dto.contacts, createdBy);

    await manager.save(ClientAuditLog, manager.create(ClientAuditLog, {
      organizationId,
      clientId: saved.id,
      action: ClientAuditAction.CREATED,
      summary: `Client ${saved.code} created`,
      performedBy: createdBy,
      version: 1,
    }));
    return saved;
  }

  // ── Read ─────────────────────────────────────────────────────────

  async findAll(organizationId: string, query: ClientQueryDto): Promise<ClientListResponseDto> {
    const {
      search, clientTypeId, industryCategoryId, countryCode, status, parentClientId,
      page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC',
    } = query;

    const qb = this.clientRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.clientType', 'ct')
      .leftJoinAndSelect('c.industryCategory', 'ic')
      .leftJoinAndSelect('c.parentClient', 'pc')
      .leftJoinAndMapOne(
        'c.primaryContact',
        ClientContact,
        'pcon',
        'pcon.clientId = c.id AND pcon.isPrimary = :primary AND pcon.isActive = :contactActive AND pcon.isDeleted = :contactDeleted',
        { primary: true, contactActive: true, contactDeleted: false },
      )
      .where('c.organizationId = :organizationId', { organizationId })
      .andWhere('c.isDeleted = :isDeleted', { isDeleted: false });

    if (clientTypeId)       qb.andWhere('c.clientTypeId = :clientTypeId', { clientTypeId });
    if (industryCategoryId) qb.andWhere('c.industryCategoryId = :industryCategoryId', { industryCategoryId });
    if (countryCode)        qb.andWhere('c.countryCode = :countryCode', { countryCode: countryCode.toUpperCase() });
    if (status)             qb.andWhere('c.status = :status', { status });
    if (parentClientId)     qb.andWhere('c.parentClientId = :parentClientId', { parentClientId });

    const term = search?.trim();
    if (term) {
      // Escape LIKE wildcards so a search for "50%" matches literally.
      const like = `%${term.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere(
        '(LOWER(c.code) LIKE :like OR LOWER(c.clientName) LIKE :like ' +
        'OR LOWER(c.displayName) LIKE :like OR LOWER(c.legalEntityName) LIKE :like)',
        { like },
      );
    }

    const sortColumn = SORT_COLUMNS[sortBy] ?? SORT_COLUMNS.createdAt;
    const direction: 'ASC' | 'DESC' = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortColumn, direction);
    // Stable paging when the primary sort column has ties.
    if (sortColumn !== SORT_COLUMNS.code) qb.addOrderBy(SORT_COLUMNS.code, 'ASC');

    const [items, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();

    return {
      items: items.map((c) => this.toListItem(c)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(organizationId: string, id: string): Promise<ClientResponseDto> {
    const client = await this.findEntityOrThrow(organizationId, id, true);
    const [addresses, contacts, documents] = await Promise.all([
      this.addressRepo.find({ where: { clientId: id, isDeleted: false }, order: { addressType: 'ASC', createdAt: 'ASC' } }),
      this.contactRepo.find({ where: { clientId: id, isDeleted: false }, order: { isPrimary: 'DESC', createdAt: 'ASC' } }),
      this.documentRepo.find({ where: { clientId: id, isDeleted: false }, order: { createdAt: 'DESC' } }),
    ]);
    return this.toResponse(client, addresses, contacts, documents);
  }

  /** Active clients for dropdowns (parent client picker, Project Master). */
  async findActive(organizationId: string): Promise<ClientOptionDto[]> {
    const rows = await this.clientRepo.find({
      where: { organizationId, isActive: true, isDeleted: false },
      order: { clientName: 'ASC' },
    });
    return rows.map((c) => ({
      id: c.id,
      code: c.code,
      clientName: c.clientName,
      displayName: c.displayName ?? null,
      clientTypeId: c.clientTypeId,
      countryCode: c.countryCode ?? null,
      defaultCurrencyCode: c.defaultCurrencyCode ?? null,
      defaultProjectCurrencyCode: c.defaultProjectCurrencyCode ?? null,
      defaultProjectTypeId: c.defaultProjectTypeId ?? null,
      measurementSystem: c.measurementSystem ?? null,
      timeZone: c.timeZone ?? null,
    }));
  }

  // ── Update ───────────────────────────────────────────────────────

  async update(
    organizationId: string,
    id: string,
    dto: UpdateClientDto,
    updatedBy: string,
  ): Promise<ClientResponseDto> {
    // Frozen once a purchase order is raised against a requisition for this client.
    await this.workflowLock.assertClientEditable(organizationId, id);
    // code is server-generated and immutable — the DTO has no such field, but
    // guard in case a caller bypasses validation.
    if ((dto as { code?: unknown }).code !== undefined) {
      throw new ConflictException('Client code cannot be changed');
    }
    if ((dto as { status?: unknown }).status !== undefined) {
      throw new ConflictException('Use the activate / deactivate endpoints to change the status');
    }

    const client = await this.findEntityOrThrow(organizationId, id, false);

    if (dto.version !== undefined && dto.version !== client.version) {
      throw new ConflictException(
        'This client was changed by someone else since you opened it. Reload it and try again.',
      );
    }

    if (dto.clientName !== undefined) this.assertName(dto.clientName);

    const sameAs = dto.operationalAddressSameAsRegistered ?? client.operationalAddressSameAsRegistered;
    this.assertChildRules(dto.addresses, dto.contacts, sameAs);

    await this.assertReferences(organizationId, dto, client);
    if (dto.parentClientId && dto.parentClientId !== client.parentClientId) {
      await this.assertParent(organizationId, client.id, dto.parentClientId);
    }

    const [addressesBefore, contactsBefore] = await Promise.all([
      this.addressRepo.find({ where: { clientId: id, isDeleted: false } }),
      this.contactRepo.find({ where: { clientId: id, isDeleted: false } }),
    ]);
    const before = this.snapshot(client);

    Object.assign(client, this.toColumns(dto));
    if (dto.clientName !== undefined) client.clientName = dto.clientName.trim();
    if (dto.clientTypeId !== undefined) client.clientTypeId = dto.clientTypeId;
    client.updatedBy = updatedBy;
    client.version = client.version + 1;

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(Client, client);
        if (dto.addresses) await this.syncAddresses(manager, client, dto.addresses, updatedBy);
        if (dto.contacts)  await this.syncContacts(manager, client, dto.contacts, updatedBy);
      });
    } catch (err) {
      this.logger.error(
        `Failed to update client ${id} in organization ${organizationId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }

    const changes = this.diff(before, this.snapshot(client));
    if (dto.addresses) {
      const after = await this.addressRepo.find({ where: { clientId: id, isDeleted: false } });
      this.pushChildChange(changes, 'addresses', addressesBefore, after, ADDRESS_AUDIT_FIELDS);
    }
    if (dto.contacts) {
      const after = await this.contactRepo.find({ where: { clientId: id, isDeleted: false } });
      this.pushChildChange(changes, 'contacts', contactsBefore, after, CONTACT_AUDIT_FIELDS);
    }
    if (changes.length > 0) {
      await this.audit(organizationId, id, ClientAuditAction.UPDATED, updatedBy, client.version,
        `Updated ${changes.length} field${changes.length === 1 ? '' : 's'}`, changes);
    }

    return this.findOne(organizationId, id);
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  async activate(organizationId: string, id: string, userEmail: string): Promise<ClientResponseDto> {
    const client = await this.findEntityOrThrow(organizationId, id, false);
    if (client.status === ClientStatus.ACTIVE) throw new BadRequestException('The client is already active');

    client.status = ClientStatus.ACTIVE;
    client.isActive = true;
    client.deactivatedBy = null;
    client.deactivatedAt = null;
    client.deactivationReason = null;
    client.updatedBy = userEmail;
    client.version += 1;
    await this.clientRepo.save(client);

    await this.audit(organizationId, id, ClientAuditAction.ACTIVATED, userEmail, client.version, 'Client activated');
    return this.findOne(organizationId, id);
  }

  /**
   * Deactivation is a soft state change: the client and everything that
   * references it stay intact, so historical records keep the original identity.
   */
  async deactivate(
    organizationId: string,
    id: string,
    userEmail: string,
    reason?: string,
  ): Promise<ClientResponseDto> {
    const client = await this.findEntityOrThrow(organizationId, id, false);
    if (client.status === ClientStatus.INACTIVE) throw new BadRequestException('The client is already inactive');

    const trimmed = reason?.trim() || null;
    client.status = ClientStatus.INACTIVE;
    client.isActive = false;
    client.deactivatedBy = userEmail;
    client.deactivatedAt = new Date();
    client.deactivationReason = trimmed;
    client.updatedBy = userEmail;
    client.version += 1;
    await this.clientRepo.save(client);

    await this.audit(
      organizationId, id, ClientAuditAction.DEACTIVATED, userEmail, client.version,
      trimmed ? `Client deactivated: ${trimmed}` : 'Client deactivated',
    );
    return this.findOne(organizationId, id);
  }

  async remove(organizationId: string, id: string, deletedBy: string): Promise<void> {
    // Frozen once a purchase order is raised against a requisition for this client.
    await this.workflowLock.assertClientEditable(organizationId, id);
    const client = await this.findEntityOrThrow(organizationId, id, false);

    const subsidiaries = await this.clientRepo.count({
      where: { organizationId, parentClientId: id, isDeleted: false },
    });
    if (subsidiaries > 0) {
      throw new ConflictException(
        `This client is the parent of ${subsidiaries} other client${subsidiaries === 1 ? '' : 's'} and cannot be deleted. ` +
        'Deactivate it instead, or re-parent its subsidiaries first.',
      );
    }

    client.isDeleted = true;
    client.deletedAt = new Date();
    client.deletedBy = deletedBy;
    client.isActive = false;
    client.version += 1;
    await this.clientRepo.save(client);

    await this.audit(organizationId, id, ClientAuditAction.DELETED, deletedBy, client.version, 'Client deleted');
  }

  // ── Documents ────────────────────────────────────────────────────

  async uploadDocument(
    organizationId: string,
    file: Express.Multer.File,
  ): Promise<{ message: string; url: string }> {
    try {
      await this.cloudStorageService.isFileValid(file);
      const url = await this.cloudStorageService.uploadFile(file, `pm/client/${organizationId}`);
      return { message: 'Client document uploaded successfully', url };
    } catch (err) {
      this.logger.error(
        `Client document upload failed for organization ${organizationId} (file: ${file?.originalname ?? 'unknown'}): ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  async listDocuments(organizationId: string, clientId: string): Promise<ClientDocumentResponseDto[]> {
    await this.findEntityOrThrow(organizationId, clientId, false);
    const rows = await this.documentRepo.find({
      where: { clientId, organizationId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
    return rows.map((d) => this.toDocumentResponse(d));
  }

  async addDocument(
    organizationId: string,
    clientId: string,
    dto: AddClientDocumentDto,
    userEmail: string,
  ): Promise<ClientDocumentResponseDto> {
    const client = await this.findEntityOrThrow(organizationId, clientId, false);

    const issue = dto.issueDate ?? null;
    const expiry = dto.expiryDate ?? null;
    if (issue && expiry && expiry < issue) {
      throw new BadRequestException('The expiry date cannot be earlier than the issue date');
    }

    const row = this.documentRepo.create({
      dguid: uuidv4(),
      organizationId,
      clientId,
      documentType: dto.documentType,
      documentName: dto.documentName.trim(),
      documentNumber: dto.documentNumber?.trim() || null,
      issueDate: issue,
      expiryDate: expiry,
      documentUrl: dto.documentUrl,
      fileName: dto.fileName ?? null,
      mimeType: dto.mimeType ?? null,
      fileSizeBytes: dto.fileSizeBytes ?? null,
      documentVersion: dto.documentVersion?.trim() || null,
      remarks: dto.remarks?.trim() || null,
      isActive: true,
      uploadedBy: userEmail,
      uploadedAt: new Date(),
      createdBy: userEmail,
    });
    const saved = await this.documentRepo.save(row);

    await this.audit(
      organizationId, clientId, ClientAuditAction.DOCUMENT_ADDED, userEmail, client.version,
      `Document added: ${saved.documentName}`,
    );
    return this.toDocumentResponse(saved);
  }

  async removeDocument(
    organizationId: string,
    clientId: string,
    documentId: string,
    userEmail: string,
  ): Promise<void> {
    const client = await this.findEntityOrThrow(organizationId, clientId, false);
    const doc = await this.documentRepo.findOne({
      where: { id: documentId, clientId, organizationId, isDeleted: false },
    });
    if (!doc) throw new NotFoundException('Document not found');

    doc.isDeleted = true;
    doc.isActive = false;
    doc.deletedAt = new Date();
    doc.deletedBy = userEmail;
    await this.documentRepo.save(doc);

    await this.audit(
      organizationId, clientId, ClientAuditAction.DOCUMENT_REMOVED, userEmail, client.version,
      `Document removed: ${doc.documentName}`,
    );
  }

  // ── Audit history ────────────────────────────────────────────────

  async getAuditHistory(organizationId: string, clientId: string): Promise<ClientAuditEntryDto[]> {
    // History stays readable for a deleted client, so no isDeleted filter here —
    // but the organization scope is still enforced through the rows themselves.
    const rows = await this.auditRepo.find({
      where: { organizationId, clientId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      summary: r.summary ?? null,
      changes: r.changes ?? null,
      performedBy: r.performedBy ?? null,
      version: r.version ?? null,
      createdAt: r.createdAt,
    }));
  }

  // ── Helpers: validation ──────────────────────────────────────────

  private assertName(name: string | undefined): void {
    if (!name || !name.trim()) throw new BadRequestException('Client name is required');
  }

  /** Rules that span the address and contact lists. */
  private assertChildRules(
    addresses: ClientAddressDto[] | undefined,
    contacts: ClientContactDto[] | undefined,
    sameAsRegistered: boolean,
  ): void {
    if (addresses) {
      const registered = addresses.filter((a) => a.addressType === ClientAddressType.REGISTERED);
      if (registered.length > 1) {
        throw new BadRequestException('A client can have only one registered address');
      }
      const operational = addresses.filter((a) => a.addressType === ClientAddressType.OPERATIONAL);
      if (sameAsRegistered && operational.length > 0) {
        throw new BadRequestException(
          'Operational addresses cannot be supplied while the operational address is the same as the registered address',
        );
      }
    }

    if (contacts) {
      const blank = contacts.findIndex((c) => !c.contactName?.trim());
      if (blank !== -1) throw new BadRequestException(`Contact ${blank + 1} needs a name`);

      const primaries = contacts.filter((c) => c.isPrimary && c.isActive !== false);
      if (primaries.length > 1) {
        throw new BadRequestException('Only one active contact can be the primary contact');
      }
    }
  }

  /** The lookups a client points at must exist in this organization (and be usable). */
  private async assertReferences(
    organizationId: string,
    dto: Partial<CreateClientDto> & { commercial?: unknown; projectDefaults?: CreateClientDto['projectDefaults'] },
    current?: Client,
  ): Promise<void> {
    if (dto.clientTypeId && dto.clientTypeId !== current?.clientTypeId) {
      const type = await this.typeRepo.findOne({
        where: { id: dto.clientTypeId, organizationId, isDeleted: false },
      });
      if (!type) throw new BadRequestException('Selected client type was not found');
      if (!type.isActive) throw new BadRequestException('Selected client type is inactive');
    }

    if (dto.industryCategoryId && dto.industryCategoryId !== current?.industryCategoryId) {
      const category = await this.industryRepo.findOne({
        where: { id: dto.industryCategoryId, organizationId, isDeleted: false },
      });
      if (!category) throw new BadRequestException('Selected industry category was not found');
      if (!category.isActive) throw new BadRequestException('Selected industry category is inactive');
    }

    const projectTypeId = dto.projectDefaults?.defaultProjectTypeId;
    if (projectTypeId && projectTypeId !== current?.defaultProjectTypeId) {
      const projectType = await this.projectTypeRepo.findOne({
        where: { id: projectTypeId, organizationId, isDeleted: false },
      });
      if (!projectType) throw new BadRequestException('Selected default project type was not found');
      if (!projectType.isActive) throw new BadRequestException('Selected default project type is inactive');
    }
  }

  /** The parent must exist in this organization and must not be the client or one of its subsidiaries. */
  private async assertParent(
    organizationId: string,
    clientId: string | null,
    parentClientId: string,
  ): Promise<void> {
    if (clientId && parentClientId === clientId) {
      throw new BadRequestException('A client cannot be its own parent');
    }

    let cursor: string | null = parentClientId;
    for (let depth = 0; cursor && depth < MAX_PARENT_DEPTH; depth++) {
      const node = await this.clientRepo.findOne({
        where: { id: cursor, organizationId, isDeleted: false },
      });
      if (!node) {
        throw new BadRequestException(
          depth === 0 ? 'Selected parent client was not found' : 'The parent hierarchy is broken',
        );
      }
      if (clientId && node.parentClientId === clientId) {
        throw new BadRequestException('A subsidiary cannot be set as the parent of its own parent');
      }
      cursor = node.parentClientId ?? null;
    }
  }

  private async findEntityOrThrow(
    organizationId: string,
    id: string,
    withRelations: boolean,
  ): Promise<Client> {
    const client = await this.clientRepo.findOne({
      where: { id, organizationId, isDeleted: false },
      relations: withRelations
        ? { clientType: true, industryCategory: true, parentClient: true, defaultProjectType: true }
        : undefined,
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  // ── Helpers: persistence ─────────────────────────────────────────

  /**
   * Flattens the request into client columns. Only keys the caller actually sent
   * are returned, so an update never wipes a value by omission; a string is
   * trimmed and a blank one becomes null.
   */
  private toColumns(dto: Partial<CreateClientDto>): Partial<Client> {
    const out: Record<string, unknown> = {};

    const take = (source: Record<string, unknown> | undefined, key: string): void => {
      if (!source || source[key] === undefined) return;
      let value = source[key];
      if (typeof value === 'string' && !BOOLEAN_KEYS.has(key)) {
        value = value.trim() || null;
        if (value && UPPERCASE_KEYS.has(key)) value = (value as string).toUpperCase();
      }
      out[key] = value;
    };

    const root = dto as Record<string, unknown>;
    for (const key of BASIC_TEXT) take(root, key);
    for (const key of [
      'clientTypeId', 'industryCategoryId', 'parentClientId', 'countryCode',
      'operationalAddressSameAsRegistered',
    ]) take(root, key);
    for (const key of COMMERCIAL_KEYS) take(dto.commercial as Record<string, unknown> | undefined, key);
    for (const key of DEFAULT_KEYS) take(dto.projectDefaults as Record<string, unknown> | undefined, key);

    // A foreign key sent as an empty string means "none".
    for (const key of ['industryCategoryId', 'parentClientId', 'defaultProjectTypeId']) {
      if (out[key] === '') out[key] = null;
    }
    return out as Partial<Client>;
  }

  private async syncAddresses(
    manager: EntityManager,
    client: Client,
    incoming: ClientAddressDto[],
    userEmail: string,
  ): Promise<void> {
    const existing = await manager.find(ClientAddress, { where: { clientId: client.id, isDeleted: false } });
    const byId = new Map(existing.map((a) => [a.id, a]));
    const kept = new Set<string>();

    for (const dto of incoming) {
      const values = {
        addressType: dto.addressType,
        label: dto.label?.trim() || null,
        addressLine1: dto.addressLine1?.trim() || null,
        addressLine2: dto.addressLine2?.trim() || null,
        city: dto.city?.trim() || null,
        state: dto.state?.trim() || null,
        postalCode: dto.postalCode?.trim() || null,
        countryCode: dto.countryCode?.trim().toUpperCase() || null,
        isActive: dto.isActive ?? true,
      };

      if (dto.id) {
        const row = byId.get(dto.id);
        if (!row) throw new BadRequestException(`Address ${dto.id} does not belong to this client`);
        Object.assign(row, values, { updatedBy: userEmail });
        await manager.save(ClientAddress, row);
        kept.add(row.id);
      } else {
        const created = manager.create(ClientAddress, {
          ...values,
          dguid: uuidv4(),
          organizationId: client.organizationId,
          clientId: client.id,
          createdBy: userEmail,
        });
        const saved = await manager.save(ClientAddress, created);
        kept.add(saved.id);
      }
    }

    for (const row of existing) {
      if (kept.has(row.id)) continue;
      row.isDeleted = true;
      row.isActive = false;
      row.deletedAt = new Date();
      row.deletedBy = userEmail;
      await manager.save(ClientAddress, row);
    }
  }

  private async syncContacts(
    manager: EntityManager,
    client: Client,
    incoming: ClientContactDto[],
    userEmail: string,
  ): Promise<void> {
    const existing = await manager.find(ClientContact, { where: { clientId: client.id, isDeleted: false } });
    const byId = new Map(existing.map((c) => [c.id, c]));
    const kept = new Set<string>();

    for (const dto of incoming) {
      const values = {
        contactName: dto.contactName.trim(),
        jobTitle: dto.jobTitle?.trim() || null,
        department: dto.department?.trim() || null,
        contactRole: dto.contactRole ?? null,
        email: dto.email?.trim().toLowerCase() || null,
        phone: dto.phone?.trim() || null,
        mobile: dto.mobile?.trim() || null,
        preferredContactMethod: dto.preferredContactMethod ?? null,
        isPrimary: dto.isPrimary ?? false,
        isProjectContact: dto.isProjectContact ?? false,
        isProcurementContact: dto.isProcurementContact ?? false,
        isFinanceContact: dto.isFinanceContact ?? false,
        isActive: dto.isActive ?? true,
      };

      if (dto.id) {
        const row = byId.get(dto.id);
        if (!row) throw new BadRequestException(`Contact ${dto.id} does not belong to this client`);
        Object.assign(row, values, { updatedBy: userEmail });
        await manager.save(ClientContact, row);
        kept.add(row.id);
      } else {
        const created = manager.create(ClientContact, {
          ...values,
          dguid: uuidv4(),
          organizationId: client.organizationId,
          clientId: client.id,
          createdBy: userEmail,
        });
        const saved = await manager.save(ClientContact, created);
        kept.add(saved.id);
      }
    }

    for (const row of existing) {
      if (kept.has(row.id)) continue;
      row.isDeleted = true;
      row.isActive = false;
      row.isPrimary = false;
      row.deletedAt = new Date();
      row.deletedBy = userEmail;
      await manager.save(ClientContact, row);
    }
  }

  // ── Helpers: audit ───────────────────────────────────────────────

  private async audit(
    organizationId: string,
    clientId: string,
    action: ClientAuditAction,
    performedBy: string,
    version: number,
    summary: string,
    changes?: Array<{ field: string; from: string | null; to: string | null }>,
  ): Promise<void> {
    try {
      await this.auditRepo.save(this.auditRepo.create({
        organizationId, clientId, action, summary, performedBy, version,
        changes: changes ?? null,
      }));
    } catch (err) {
      // The change itself has already been committed; a failed history entry
      // must not turn it into an error for the caller.
      this.logger.error(
        `Failed to write the audit entry for client ${clientId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  private snapshot(client: Client): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const field of TRACKED_FIELDS) out[field] = (client as unknown as Record<string, unknown>)[field] ?? null;
    return out;
  }

  private diff(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): Array<{ field: string; from: string | null; to: string | null }> {
    const shown = (value: unknown): string | null => {
      if (value === null || value === undefined || value === '') return null;
      const text = String(value);
      return text.length > AUDIT_VALUE_MAX ? `${text.slice(0, AUDIT_VALUE_MAX)}…` : text;
    };
    const changes: Array<{ field: string; from: string | null; to: string | null }> = [];
    for (const field of TRACKED_FIELDS) {
      if (shown(before[field]) !== shown(after[field])) {
        changes.push({ field, from: shown(before[field]), to: shown(after[field]) });
      }
    }
    return changes;
  }

  /** Records that a child list changed, comparing what is stored before and after. */
  private pushChildChange<T extends { id: string }>(
    changes: Array<{ field: string; from: string | null; to: string | null }>,
    field: 'addresses' | 'contacts',
    before: T[],
    after: T[],
    fields: readonly string[],
  ): void {
    const signature = (rows: T[]) => JSON.stringify(
      rows
        .map((row) => Object.fromEntries(['id', ...fields].map((f) => [f, (row as Record<string, unknown>)[f] ?? null])))
        .sort((a, b) => String(a.id).localeCompare(String(b.id))),
    );
    if (signature(before) === signature(after)) return;

    const noun = field === 'addresses' ? 'address' : 'contact';
    const plural = field === 'addresses' ? 'addresses' : 'contacts';
    const label = (n: number) => `${n} ${n === 1 ? noun : plural}`;
    changes.push({
      field,
      from: label(before.length),
      to: before.length === after.length ? `${label(after.length)} (edited)` : label(after.length),
    });
  }

  // ── Helpers: mapping ─────────────────────────────────────────────

  private toListItem(c: Client & { primaryContact?: ClientContact | null }): ClientListItemDto {
    const primary = c.primaryContact ?? null;
    return {
      id: c.id,
      code: c.code,
      clientName: c.clientName,
      displayName: c.displayName ?? null,
      clientTypeId: c.clientTypeId,
      clientTypeName: c.clientType?.name ?? null,
      industryCategoryId: c.industryCategoryId ?? null,
      industryCategoryName: c.industryCategory?.name ?? null,
      parentClientId: c.parentClientId ?? null,
      parentClientName: c.parentClient?.clientName ?? null,
      countryCode: c.countryCode ?? null,
      website: c.website ?? null,
      status: c.status,
      isActive: c.isActive,
      primaryContactName: primary?.contactName ?? null,
      primaryContactEmail: primary?.email ?? null,
      primaryContactPhone: primary?.mobile ?? primary?.phone ?? null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private toResponse(
    c: Client,
    addresses: ClientAddress[],
    contacts: ClientContact[],
    documents: ClientDocument[],
  ): ClientResponseDto {
    const primary = contacts.find((x) => x.isPrimary && x.isActive) ?? null;
    return {
      ...this.toListItem({ ...c, primaryContact: primary } as Client & { primaryContact: ClientContact | null }),
      dguid: c.dguid,
      organizationId: c.organizationId,
      description: c.description ?? null,
      notes: c.notes ?? null,
      version: c.version,
      operationalAddressSameAsRegistered: c.operationalAddressSameAsRegistered,
      timeZone: c.timeZone ?? null,
      preferredLanguage: c.preferredLanguage ?? null,
      addresses: addresses.map((a) => this.toAddressResponse(a)),
      contacts: contacts.map((x) => this.toContactResponse(x)),
      documents: documents.map((d) => this.toDocumentResponse(d)),
      commercial: {
        legalEntityName: c.legalEntityName ?? null,
        legalEntityType: c.legalEntityType ?? null,
        registrationNumber: c.registrationNumber ?? null,
        taxRegistrationNumber: c.taxRegistrationNumber ?? null,
        externalBusinessId: c.externalBusinessId ?? null,
        contractingEntityName: c.contractingEntityName ?? null,
        defaultCurrencyCode: c.defaultCurrencyCode ?? null,
        defaultPaymentTerms: c.defaultPaymentTerms ?? null,
        contractReferenceFormat: c.contractReferenceFormat ?? null,
        purchaseOrderReferenceFormat: c.purchaseOrderReferenceFormat ?? null,
        defaultIncoterms: c.defaultIncoterms ?? null,
        taxRegion: c.taxRegion ?? null,
        dateFormat: c.dateFormat ?? null,
      },
      projectDefaults: {
        defaultProjectTypeId: c.defaultProjectTypeId ?? null,
        defaultProjectTypeName: c.defaultProjectType?.name ?? null,
        defaultProjectCurrencyCode: c.defaultProjectCurrencyCode ?? null,
        measurementSystem: c.measurementSystem ?? null,
        documentNumberingScheme: c.documentNumberingScheme ?? null,
        defaultWbsTemplate: c.defaultWbsTemplate ?? null,
        defaultCostCodeScheme: c.defaultCostCodeScheme ?? null,
        defaultApprovalWorkflow: c.defaultApprovalWorkflow ?? null,
        defaultProcurementTerms: c.defaultProcurementTerms ?? null,
        documentPortalUrl: c.documentPortalUrl ?? null,
        requiresClientApproval: c.requiresClientApproval,
        requiresDocumentControl: c.requiresDocumentControl,
      },
      deactivatedBy: c.deactivatedBy ?? null,
      deactivatedAt: c.deactivatedAt ?? null,
      deactivationReason: c.deactivationReason ?? null,
      createdBy: c.createdBy ?? null,
      updatedBy: c.updatedBy ?? null,
    };
  }

  private toAddressResponse(a: ClientAddress): ClientAddressResponseDto {
    return {
      id: a.id,
      addressType: a.addressType,
      label: a.label ?? null,
      addressLine1: a.addressLine1 ?? null,
      addressLine2: a.addressLine2 ?? null,
      city: a.city ?? null,
      state: a.state ?? null,
      postalCode: a.postalCode ?? null,
      countryCode: a.countryCode ?? null,
      isActive: a.isActive,
    };
  }

  private toContactResponse(c: ClientContact): ClientContactResponseDto {
    return {
      id: c.id,
      contactName: c.contactName,
      jobTitle: c.jobTitle ?? null,
      department: c.department ?? null,
      contactRole: c.contactRole ?? null,
      email: c.email ?? null,
      phone: c.phone ?? null,
      mobile: c.mobile ?? null,
      preferredContactMethod: c.preferredContactMethod ?? null,
      isPrimary: c.isPrimary,
      isProjectContact: c.isProjectContact,
      isProcurementContact: c.isProcurementContact,
      isFinanceContact: c.isFinanceContact,
      isActive: c.isActive,
    };
  }

  private toDocumentResponse(d: ClientDocument): ClientDocumentResponseDto {
    const today = new Date().toISOString().slice(0, 10);
    const expiry = d.expiryDate ? String(d.expiryDate).slice(0, 10) : null;
    return {
      id: d.id,
      documentType: d.documentType,
      documentName: d.documentName,
      documentNumber: d.documentNumber ?? null,
      issueDate: d.issueDate ? String(d.issueDate).slice(0, 10) : null,
      expiryDate: expiry,
      documentUrl: d.documentUrl,
      fileName: d.fileName ?? null,
      mimeType: d.mimeType ?? null,
      fileSizeBytes: d.fileSizeBytes != null ? Number(d.fileSizeBytes) : null,
      documentVersion: d.documentVersion ?? null,
      remarks: d.remarks ?? null,
      uploadedBy: d.uploadedBy ?? null,
      uploadedAt: d.uploadedAt ?? null,
      isExpired: !!expiry && expiry < today,
    };
  }
}
