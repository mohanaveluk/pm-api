import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleInit, Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MasterCodeService, MasterSequenceKey } from 'src/common/services/master-code.service';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { NotificationService } from '../notification/notification.service';
import { WorkflowTrackingService } from '../workflow-tracking/workflow-tracking.service';
import { WorkflowAction, WorkflowEntityType } from '../workflow-tracking/enums/workflow-tracking.enums';
import { UserProjectAccessService } from '../user-project-mapping/user-project-access.service';
import { User } from '../user/entity/user.entity';
import { Project } from '../project/entities/project.entity';
import { Client } from '../client/entities/client.entity';
import { Vendor } from '../vendor/entities/vendor.entity';
import { VendorAddress } from '../vendor/entities/vendor-address.entity';
import { VendorDocument } from '../vendor/entities/vendor-document.entity';
import { VendorStatus } from '../vendor/enums/vendor-status.enum';
import { MaterialRequisition } from '../material-requisition/entities/material-requisition.entity';
import { MaterialRequisitionItem } from '../material-requisition/entities/material-requisition-item.entity';
import { MaterialRequisitionCompliance } from '../material-requisition/entities/material-requisition-compliance.entity';
import { MaterialRequisitionDeviation } from '../material-requisition/entities/material-requisition-deviation.entity';
import { MaterialRequisitionStatus } from '../material-requisition/enums/material-requisition.enums';
import { Rfq } from './entities/rfq.entity';
import { RfqRequisition } from './entities/rfq-requisition.entity';
import { RfqItem } from './entities/rfq-item.entity';
import { RfqDocument } from './entities/rfq-document.entity';
import { RfqOtherCharge } from './entities/rfq-other-charge.entity';
import { RfqChecklistItem } from './entities/rfq-checklist-item.entity';
import { RfqCompliance } from './entities/rfq-compliance.entity';
import { RfqDeviation } from './entities/rfq-deviation.entity';
import { RfqAcknowledgement } from './entities/rfq-acknowledgement.entity';
import {
  BUYER_DOCUMENT_SECTIONS, RFQ_BUYER_ROLES, RFQ_COMPLIANCE_EDITABLE_STATUSES, RFQ_DEFAULT_CHECKLIST,
  RFQ_DEFAULT_CONTENT, RFQ_DEFAULT_INSTRUCTIONS, RFQ_DEFAULT_SUBJECT, RFQ_READER_ROLES, RFQ_RELEASED_STATUSES,
  RFQ_STATUS_TRANSITIONS, RFQ_VENDOR_EDITABLE_STATUSES, RFQ_VENDOR_ROLE, RfqDocumentSection, RfqStatus,
} from './enums/rfq.enums';
import {
  CreateRfqDto, RfqAcknowledgementDto, RfqComplianceDto, RfqDeviationDto, RfqDocumentDto, RfqItemDto, RfqQueryDto,
  RfqRequisitionContentQueryDto, RfqRequisitionOptionsQueryDto, RfqVendorOptionsQueryDto, RfqVendorResponseDto,
  UpdateRfqDto, UpdateRfqStatusDto,
} from './dto/rfq-request.dto';
import {
  RfqAcknowledgementFormDto, RfqAcknowledgementResponseDto, RfqDefaultsDto, RfqDocumentResponseDto, RfqListItemDto, RfqListResponseDto, RfqPermissionsDto, RfqRequisitionContentDto,
  RfqRequisitionOptionDto, RfqResponseDto, RfqVendorDocumentDto, RfqVendorOptionDto, RfqVendorSummaryDto,
} from './dto/rfq-response.dto';
import { RfqNotificationService } from './rfq-notification.service';
import { RfqPdfService } from './rfq-pdf.service';
import { Organization } from '../organization/entity/organization.entity';

/** Who is acting (from the JWT). */
export interface RfqActor {
  userId: string;
  email: string;
  name: string;
  role: string;
  isInternal: boolean;
}

const SORT_COLUMNS: Record<string, string> = {
  rfqNumber: 'rfq.rfqNumber',
  issueDate: 'rfq.issueDate',
  bidClosingDate: 'rfq.bidClosingDate',
  status: 'rfq.status',
  createdAt: 'rfq.createdAt',
  updatedAt: 'rfq.updatedAt',
};

/** The buyer's free-text columns, copied as sent (trimmed; blank → null). */
const TEXT_FIELDS = [
  'subject', 'content', 'instructionsToBidders',
  'scopeDescription', 'scopeQuantityNotes', 'deliveryLocation', 'deliverySchedule',
  'materialGradeStandards', 'designConditions', 'dimensionalRequirements', 'applicableCodes',
  'qualityRequirements', 'regulatoryCompliance', 'inspectionTesting', 'documentationRequirements',
  'pricingFormat', 'incoterms', 'paymentTerms', 'taxesDuties', 'warranty', 'liquidatedDamages',
  'performanceGuarantee', 'insuranceRequirements', 'packingMarking', 'commercialDocumentation',
] as const;

/** Suggestions for the vendor's "other charges" title. */
export const RFQ_OTHER_CHARGE_TYPES = [
  'Testing charges', 'Packing charges', 'Documentation charges', 'FCA charges', 'FOB charges', 'Freight charges',
];

const today = (): string => new Date().toISOString().slice(0, 10);
const blank = (v: string | null | undefined): string | null => (v ?? '').trim() || null;
const round = (v: number, places: number) => Math.round(v * 10 ** places) / 10 ** places;

/**
 * Requests for Quotation: the company buyer writes the package from approved
 * material requisitions and issues it to one vendor (emailed); the vendor
 * answers on the same record. Every step is recorded on the requisition's
 * workflow timeline (the RFQ carries the first requisition's trackingId).
 */
@Injectable()
export class RfqService implements OnModuleInit {
  constructor(
    @InjectRepository(Rfq) private readonly rfqRepo: Repository<Rfq>,
    @InjectRepository(RfqItem) private readonly itemRepo: Repository<RfqItem>,
    @InjectRepository(MaterialRequisition) private readonly mrRepo: Repository<MaterialRequisition>,
    @InjectRepository(MaterialRequisitionItem) private readonly mrItemRepo: Repository<MaterialRequisitionItem>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Client) private readonly clientRepo: Repository<Client>,
    @InjectRepository(Vendor) private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(VendorDocument) private readonly vendorDocRepo: Repository<VendorDocument>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(RfqAcknowledgement) private readonly ackRepo: Repository<RfqAcknowledgement>,
    private readonly dataSource: DataSource,
    private readonly masterCodeService: MasterCodeService,
    private readonly cloudStorageService: CloudStorageService,
    private readonly tracking: WorkflowTrackingService,
    private readonly notifier: RfqNotificationService,
    private readonly pdfService: RfqPdfService,
    private readonly logger: CustomLoggerService,
    @Optional() private readonly notifications?: NotificationService,
    @Optional() private readonly projectAccess?: UserProjectAccessService,
  ) {}

  /** RFQ steps concern the buyer who created it (the actor is excluded by the notifier). */
  onModuleInit(): void {
    this.notifications?.registerWorkflowAudience([WorkflowEntityType.RFQ, WorkflowEntityType.RFQ_APPROVAL], async (event, manager) => {
      const rfq = await manager.findOne(Rfq, { where: { id: event.entityId }, select: { id: true, createdBy: true, organizationId: true } });
      if (!rfq?.createdBy) return [];
      const buyer = await manager.findOne(User, { where: { email: rfq.createdBy, organizationId: rfq.organizationId }, select: { id: true } });
      return buyer ? [buyer.id] : [];
    });
  }

  // ── Editor sources ───────────────────────────────────────────────

  /** Defaults for a new RFQ: the letter's subject / content, the instructions, the buyer as contact. */
  async defaults(actor: RfqActor): Promise<RfqDefaultsDto> {
    const me = await this.userRepo.findOne({ where: { id: actor.userId } });
    return {
      subject: RFQ_DEFAULT_SUBJECT,
      content: RFQ_DEFAULT_CONTENT,
      instructionsToBidders: RFQ_DEFAULT_INSTRUCTIONS,
      contactName: me ? [me.first_name, me.last_name].filter(Boolean).join(' ').trim() || me.email : actor.name,
      contactEmail: me?.email ?? actor.email,
      contactPhone: me?.mobile || null,
      otherChargeTypes: RFQ_OTHER_CHARGE_TYPES,
    };
  }

  /** Approved material requisitions an RFQ can be raised from (projects the user can see). */
  async requisitionOptions(
    organizationId: string,
    query: RfqRequisitionOptionsQueryDto,
    actor: RfqActor,
  ): Promise<RfqRequisitionOptionDto[]> {
    this.assertBuyer(actor);
    const qb = this.mrRepo.createQueryBuilder('mr')
      .innerJoinAndSelect('mr.project', 'prj')
      .leftJoinAndSelect('prj.client', 'cli')
      .loadRelationCountAndMap('mr.itemCount', 'mr.items')
      .loadRelationCountAndMap('mr.documentCount', 'mr.documents')
      .where('mr.organizationId = :organizationId', { organizationId })
      .andWhere('mr.isDeleted = :no', { no: false })
      .andWhere('mr.status = :approved', { approved: MaterialRequisitionStatus.APPROVED })
      .orderBy('mr.approvedAt', 'DESC')
      .take(500);
    if (query.projectId) qb.andWhere('mr.projectId = :projectId', { projectId: query.projectId });
    const term = query.search?.trim();
    if (term) {
      const like = `%${term.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere(new Brackets((w) => w
        .where('LOWER(mr.mrNumber) LIKE :like', { like })
        .orWhere('LOWER(mr.shortDescription) LIKE :like')
        .orWhere('LOWER(prj.code) LIKE :like')
        .orWhere('LOWER(prj.projectName) LIKE :like')
        .orWhere('LOWER(cli.clientName) LIKE :like')));
    }
    this.projectAccess?.scope(qb, 'prj', this.viewerOf(actor));
    const rows = await qb.getMany();
    return rows.map((mr) => ({
      id: mr.id,
      mrNumber: mr.mrNumber,
      shortDescription: mr.shortDescription ?? null,
      projectId: mr.projectId,
      projectCode: mr.project?.code ?? null,
      projectName: mr.project?.projectName ?? null,
      clientName: mr.project?.client?.clientName ?? null,
      itemCount: (mr as unknown as { itemCount: number }).itemCount ?? 0,
      documentCount: (mr as unknown as { documentCount: number }).documentCount ?? 0,
      approvedAt: mr.approvedAt ?? null,
    }));
  }

  /**
   * Everything the editor brings in from the chosen requisitions: their lines
   * (with the quantity still open), compliance items, deviations and documents.
   */
  async requisitionContent(
    organizationId: string,
    query: RfqRequisitionContentQueryDto,
    actor: RfqActor,
  ): Promise<RfqRequisitionContentDto> {
    this.assertBuyer(actor);
    if (!query.ids.length) return { items: [], compliances: [], deviations: [], documents: [] };
    const mrs = await this.mrRepo.find({
      where: { id: In(query.ids), organizationId, isDeleted: false },
      relations: { items: true, compliances: true, deviations: true, documents: true },
    });
    const order = new Map(query.ids.map((id, i) => [id, i]));
    mrs.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    const itemIds = mrs.flatMap((mr) => (mr.items ?? []).map((i) => i.id));
    const used = await this.quotedQuantities(organizationId, itemIds, query.excludeRfqId);

    return {
      items: mrs.flatMap((mr) => (mr.items ?? [])
        .slice().sort((a, b) => a.lineNumber - b.lineNumber)
        .map((i) => {
          const mrQuantity = Number(i.requestedQty);
          const quotedElsewhere = used.get(i.id) ?? 0;
          return {
            requisitionId: mr.id,
            mrNumber: mr.mrNumber,
            requisitionItemId: i.id,
            lineNumber: i.lineNumber,
            materialId: i.materialId,
            itemCode: i.materialCode,
            description: i.materialDescription,
            uom: i.uom ?? null,
            mrQuantity,
            quotedElsewhere,
            balance: Math.max(0, round(mrQuantity - quotedElsewhere, 3)),
          };
        })),
      compliances: mrs.flatMap((mr) => (mr.compliances ?? [])
        .slice().sort((a, b) => a.sequence - b.sequence)
        .map((c) => ({ id: c.id, requisitionId: mr.id, mrNumber: mr.mrNumber, sequence: c.sequence, requirement: c.requirement }))),
      deviations: mrs.flatMap((mr) => (mr.deviations ?? [])
        .slice().sort((a, b) => a.sequence - b.sequence)
        .map((d) => ({
          id: d.id, requisitionId: mr.id, mrNumber: mr.mrNumber, clauseNo: d.clauseNo,
          rfqRequirement: d.rfqRequirement, vendorDeviation: !!d.vendorDeviation, justification: d.justification ?? null,
        }))),
      documents: mrs.flatMap((mr) => (mr.documents ?? []).map((d) => ({
        id: d.id, requisitionId: mr.id, mrNumber: mr.mrNumber, shortDescription: mr.shortDescription ?? null,
        documentType: d.documentType, documentName: d.documentName, documentUrl: d.documentUrl,
        fileName: d.fileName ?? null, mimeType: d.mimeType ?? null,
        fileSizeBytes: d.fileSizeBytes != null ? Number(d.fileSizeBytes) : null,
      }))),
    };
  }

  /** Vendors an RFQ can be addressed to: active, not blacklisted, with their primary address. */
  async vendorOptions(organizationId: string, query: RfqVendorOptionsQueryDto, actor: RfqActor): Promise<RfqVendorOptionDto[]> {
    this.assertBuyer(actor);
    const qb = this.vendorRepo.createQueryBuilder('v')
      .leftJoinAndSelect('v.addresses', 'a', 'a.isDeleted = :no', { no: false })
      .where('v.organizationId = :organizationId', { organizationId })
      .andWhere('v.isDeleted = :no')
      .andWhere('v.vendorStatus = :active', { active: VendorStatus.ACTIVE })
      .orderBy('v.vendorName', 'ASC')
      .take(1000);
    const term = query.search?.trim();
    if (term) {
      const like = `%${term.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere('(LOWER(v.code) LIKE :like OR LOWER(v.vendorName) LIKE :like OR LOWER(v.email) LIKE :like)', { like });
    }
    const vendors = await qb.getMany();
    return vendors.map((v) => ({
      id: v.id, code: v.code, vendorName: v.vendorName, email: v.email ?? null, address: this.addressOf(v.addresses),
    }));
  }

  /** The vendor's Vendor Master documents, to pick qualification documents from. */
  async vendorDocuments(organizationId: string, rfqId: string, actor: RfqActor): Promise<RfqVendorDocumentDto[]> {
    const rfq = await this.loadOrThrow(organizationId, rfqId, { vendor: true });
    this.assertCanRead(rfq, actor);
    return rfq.vendorId ? this.masterDocuments(organizationId, rfq.vendorId) : [];
  }

  /** A vendor's Vendor Master documents, for the buyer's Vendor Qualification tab. */
  async documentsOfVendor(organizationId: string, vendorId: string, actor: RfqActor): Promise<RfqVendorDocumentDto[]> {
    this.assertBuyer(actor);
    await this.assertVendor(organizationId, vendorId, false);
    return this.masterDocuments(organizationId, vendorId);
  }

  private async masterDocuments(organizationId: string, vendorId: string): Promise<RfqVendorDocumentDto[]> {
    const docs = await this.vendorDocRepo.find({
      where: { organizationId, vendorId, isDeleted: false, isActive: true },
      order: { documentType: 'ASC' },
    });
    return docs.map((d) => ({
      id: d.id,
      documentType: d.documentType,
      documentUrl: d.documentUrl,
      fileName: d.fileName ?? null,
      mimeType: d.mimeType ?? null,
      fileSizeBytes: d.fileSizeBytes != null ? Number(d.fileSizeBytes) : null,
      expiryDate: d.expiryDate ?? null,
    }));
  }

  async uploadDocument(organizationId: string, file: Express.Multer.File): Promise<{ message: string; url: string }> {
    await this.cloudStorageService.isFileValid(file);
    const url = await this.cloudStorageService.uploadFile(file, `pm/rfq/${organizationId}`);
    return { message: 'Document uploaded successfully', url };
  }

  // ── Reading ──────────────────────────────────────────────────────

  async findAll(organizationId: string, query: RfqQueryDto, actor: RfqActor): Promise<RfqListResponseDto> {
    const { search, status, projectId, vendorId, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = query;
    const qb = this.rfqRepo.createQueryBuilder('rfq')
      .leftJoinAndSelect('rfq.project', 'prj')
      .leftJoinAndSelect('rfq.client', 'cli')
      .leftJoinAndSelect('rfq.vendor', 'ven')
      .leftJoinAndSelect('rfq.requisitions', 'req')
      .loadRelationCountAndMap('rfq.itemCount', 'rfq.items')
      .where('rfq.organizationId = :organizationId', { organizationId })
      .andWhere('rfq.isDeleted = :no', { no: false });

    if (!actor.isInternal || RFQ_VENDOR_ROLE.includes(actor.role)) {
      // A vendor sees only the issued RFQs addressed to its own vendor record.
      qb.andWhere('rfq.status <> :draft', { draft: RfqStatus.DRAFT })
        .andWhere('(LOWER(ven.createdBy) = :me OR LOWER(ven.email) = :me)', { me: actor.email.toLowerCase() });
    } else if (!RFQ_READER_ROLES.includes(actor.role)) {
      qb.andWhere('rfq.createdBy = :me', { me: actor.email });
    }
    if (status) qb.andWhere('rfq.status = :status', { status });
    if (projectId) qb.andWhere('rfq.projectId = :projectId', { projectId });
    if (vendorId) qb.andWhere('rfq.vendorId = :vendorId', { vendorId });
    const term = search?.trim();
    if (term) {
      const like = `%${term.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere(
        '(LOWER(rfq.rfqNumber) LIKE :like OR LOWER(rfq.code) LIKE :like OR LOWER(rfq.subject) LIKE :like ' +
        'OR LOWER(prj.code) LIKE :like OR LOWER(prj.projectName) LIKE :like OR LOWER(cli.clientName) LIKE :like ' +
        'OR LOWER(ven.vendorName) LIKE :like OR LOWER(ven.code) LIKE :like OR LOWER(rfq.trackingId) LIKE :like)',
        { like },
      );
    }
    // Grouped view: one group's RFQs stay together across pages (no vendor yet → last).
    const groupBy = query.groupBy;
    const groupColumn = groupBy === 'vendor' ? 'rfq.vendorId' : groupBy === 'project' ? 'rfq.projectId' : null;
    const groups = groupColumn ? await this.groupTotals(qb, groupColumn) : undefined;
    if (groupBy === 'vendor') {
      qb.addSelect('CASE WHEN rfq.vendorId IS NULL THEN 1 ELSE 0 END', 'rfq_no_vendor')
        .orderBy('rfq_no_vendor', 'ASC').addOrderBy('ven.vendorName', 'ASC').addOrderBy('rfq.vendorId', 'ASC');
    } else if (groupBy === 'project') {
      qb.orderBy('prj.code', 'ASC').addOrderBy('rfq.projectId', 'ASC');
    }
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    if (groupColumn) qb.addOrderBy(SORT_COLUMNS[sortBy] ?? SORT_COLUMNS.createdAt, order);
    else qb.orderBy(SORT_COLUMNS[sortBy] ?? SORT_COLUMNS.createdAt, order);
    qb.addOrderBy('req.sequence', 'ASC');

    const [rows, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    const shortDescriptions = await this.mrShortDescriptions(rows.flatMap((r) => (r.requisitions ?? []).map((q) => q.requisitionId)));
    return {
      items: rows.map((r) => this.toListItem(r, (r as unknown as { itemCount: number }).itemCount ?? 0, shortDescriptions)),
      total, page, limit, totalPages: Math.ceil(total / limit),
      ...(groups ? { groups } : {}),
    };
  }

  /** RFQs per vendor / project for the same filters (so a group's heading counts every page). */
  private async groupTotals(qb: ReturnType<Repository<Rfq>['createQueryBuilder']>, column: string) {
    const open = [RfqStatus.DRAFT, ...RFQ_VENDOR_EDITABLE_STATUSES];
    const rows = await qb.clone()
      .select(column, 'k')
      .addSelect('COUNT(DISTINCT rfq.id)', 'total')
      .addSelect('COUNT(DISTINCT CASE WHEN rfq.status IN (:...openStatuses) THEN rfq.id END)', 'open')
      .setParameter('openStatuses', open)
      .groupBy(column)
      .orderBy()
      .getRawMany<{ k: string | null; total: string; open: string }>();
    return rows.map((r) => ({ key: r.k ?? null, total: Number(r.total), open: Number(r.open) }));
  }

  async findOne(organizationId: string, id: string, actor?: RfqActor): Promise<RfqResponseDto> {
    const rfq = await this.loadOrThrow(organizationId, id, {
      project: true, client: true, vendor: { addresses: true }, requisitions: true, items: true, documents: true,
      otherCharges: true, checklist: true, compliances: true, deviations: true, acknowledgement: true,
    });
    if (actor) this.assertCanRead(rfq, actor);
    const history = await this.tracking.eventsFor(organizationId, [WorkflowEntityType.RFQ, WorkflowEntityType.RFQ_APPROVAL], id);
    return this.toResponse(rfq, history, actor ? this.permissionsFor(rfq, actor) : null);
  }

  /**
   * The RFQ as a PDF — once it has been issued (a draft is not a document yet).
   * Whoever can open the RFQ can download it: the buyer, readers, and the vendor
   * it was issued to.
   */
  async pdf(organizationId: string, id: string, actor: RfqActor): Promise<{ fileName: string; buffer: Buffer }> {
    const rfq = await this.findOne(organizationId, id, actor);
    if (rfq.status === RfqStatus.DRAFT) {
      throw new ConflictException('A draft RFQ cannot be downloaded — issue it first.');
    }
    const org = await this.dataSource.getRepository(Organization).findOne({
      where: { id: organizationId }, select: { id: true, organizationName: true },
    });
    const buffer = await this.pdfService.render(rfq, org?.organizationName ?? null);
    this.logger.log(`RFQ ${rfq.rfqNumber} downloaded as PDF by ${actor.email}`, RfqService.name);
    return { fileName: this.pdfService.fileName(rfq), buffer };
  }

  // ── Buyer: create / update ───────────────────────────────────────

  async create(organizationId: string, dto: CreateRfqDto, actor: RfqActor): Promise<RfqResponseDto> {
    this.assertBuyer(actor);
    const project = await this.assertProject(organizationId, dto.projectId, actor);
    const clientId = dto.clientId !== undefined ? dto.clientId : project.clientId;
    if (clientId) await this.assertClient(organizationId, clientId);
    if (dto.vendorId) await this.assertVendor(organizationId, dto.vendorId);
    this.assertBidClosing(dto.bidClosingDate);

    const requisitions = await this.assertRequisitions(organizationId, dto.requisitionIds ?? [], project.id);
    const items = await this.resolveItems(organizationId, requisitions, dto.items ?? [], null);
    const compliances = this.resolveCompliances(dto.compliances ?? [], requisitions);
    const documents = this.resolveDocuments(dto.documents ?? [], BUYER_DOCUMENT_SECTIONS, requisitions);
    const defaults = await this.defaults(actor);

    const saved = await this.masterCodeService.withGeneratedCode(organizationId, MasterSequenceKey.RFQ, async (code, queryRunner) => {
      const manager = queryRunner.manager;
      const rfqNumber = blank(dto.rfqNumber) ?? code;
      const revisionNo = dto.revisionNo ?? 0;
      await this.assertNumberFree(manager, organizationId, rfqNumber, revisionNo, null);

      // The RFQ joins the workflow of the requisition it was raised from.
      const trackingId = requisitions.find((r) => r.trackingId)?.trackingId
        ?? this.tracking.generateTrackingId(organizationId);

      const rfq = await manager.save(Rfq, manager.create(Rfq, {
        ...this.textColumns(dto),
        subject: blank(dto.subject) ?? defaults.subject,
        content: blank(dto.content) ?? defaults.content,
        instructionsToBidders: dto.instructionsToBidders !== undefined ? blank(dto.instructionsToBidders) : defaults.instructionsToBidders,
        dguid: uuidv4(),
        organizationId,
        code,
        rfqNumber,
        revisionNo,
        issueDate: today(),
        projectId: project.id,
        clientId: clientId ?? null,
        contactName: defaults.contactName,
        contactEmail: defaults.contactEmail,
        contactPhone: defaults.contactPhone,
        bidClosingDate: dto.bidClosingDate ?? null,
        sealedBid: dto.sealedBid === true,
        ndaScope: dto.ndaScope ?? null,
        vendorId: dto.vendorId ?? null,
        status: RfqStatus.DRAFT,
        trackingId,
        createdBy: actor.email,
        updatedBy: actor.email,
      }));

      await this.writeRequisitions(manager, rfq, requisitions);
      await this.writeItems(manager, rfq, items);
      await this.writeCompliances(manager, rfq, compliances, []);
      await this.writeDocuments(manager, rfq, documents, BUYER_DOCUMENT_SECTIONS, actor.email);
      await this.copyRequisitionDeviations(manager, rfq, requisitions);
      for (const [index, c] of RFQ_DEFAULT_CHECKLIST.entries()) {
        await manager.save(RfqChecklistItem, manager.create(RfqChecklistItem, {
          organizationId, rfqId: rfq.id, section: c.section, key: c.key, label: c.label, sequence: index + 1,
          provided: null, reason: null,
        }));
      }
      await this.record(manager, rfq, actor, WorkflowAction.CREATED, null, RfqStatus.DRAFT, {
        requisitions: requisitions.map((r) => r.mrNumber),
      });
      return rfq;
    }).catch((err) => this.rethrow(err, 'create'));

    this.logger.log(`RFQ ${saved.rfqNumber} created by ${actor.email}`, RfqService.name);
    return this.findOne(organizationId, saved.id, actor);
  }

  /**
   * A draft can change entirely. Once issued, only the compliance requirements
   * can still change (until the RFQ is completed or approved); the vendor's
   * answers to the items kept are preserved.
   */
  async update(organizationId: string, id: string, dto: UpdateRfqDto, actor: RfqActor): Promise<RfqResponseDto> {
    this.assertBuyer(actor);
    const rfq = await this.loadOrThrow(organizationId, id, { requisitions: true, compliances: true });
    const draft = rfq.status === RfqStatus.DRAFT;
    if (!draft) {
      const others = Object.keys(dto).filter((k) => k !== 'compliances' && (dto as Record<string, unknown>)[k] !== undefined);
      if (others.length || !RFQ_COMPLIANCE_EDITABLE_STATUSES.includes(rfq.status)) {
        throw new ConflictException(
          RFQ_COMPLIANCE_EDITABLE_STATUSES.includes(rfq.status)
            ? 'This RFQ has been issued — only its compliance requirements can still change.'
            : `This RFQ is ${rfq.status.toLowerCase()} and can no longer change.`,
        );
      }
    }

    const projectId = dto.projectId ?? rfq.projectId;
    const project = await this.assertProject(organizationId, projectId, actor);
    if (dto.clientId) await this.assertClient(organizationId, dto.clientId);
    if (dto.vendorId) await this.assertVendor(organizationId, dto.vendorId);
    if (dto.bidClosingDate !== undefined) this.assertBidClosing(dto.bidClosingDate);

    const requisitionIds = dto.requisitionIds ?? rfq.requisitions.map((r) => r.requisitionId);
    const requisitions = await this.assertRequisitions(organizationId, requisitionIds, project.id);
    const items = dto.items !== undefined || dto.requisitionIds !== undefined
      ? await this.resolveItems(organizationId, requisitions, dto.items ?? [], rfq.id)
      : null;
    const compliances = dto.compliances !== undefined ? this.resolveCompliances(dto.compliances, requisitions) : null;
    const documents = dto.documents !== undefined
      ? this.resolveDocuments(dto.documents, BUYER_DOCUMENT_SECTIONS, requisitions)
      : null;

    await this.dataSource.transaction(async (manager) => {
      if (draft) {
        const rfqNumber = dto.rfqNumber !== undefined ? (blank(dto.rfqNumber) ?? rfq.code) : rfq.rfqNumber;
        const revisionNo = dto.revisionNo ?? rfq.revisionNo;
        if (rfqNumber !== rfq.rfqNumber || revisionNo !== rfq.revisionNo) {
          await this.assertNumberFree(manager, organizationId, rfqNumber, revisionNo, rfq.id);
        }
        Object.assign(rfq, this.textColumns(dto), {
          rfqNumber,
          revisionNo,
          projectId,
          ...(dto.clientId !== undefined ? { clientId: dto.clientId } : {}),
          ...(dto.bidClosingDate !== undefined ? { bidClosingDate: dto.bidClosingDate } : {}),
          ...(dto.sealedBid !== undefined ? { sealedBid: dto.sealedBid } : {}),
          ...(dto.ndaScope !== undefined ? { ndaScope: dto.ndaScope } : {}),
          ...(dto.vendorId !== undefined ? { vendorId: dto.vendorId } : {}),
        });
      }
      rfq.updatedBy = actor.email;
      const { requisitions: _r, compliances: existing, ...columns } = rfq;
      await manager.save(Rfq, columns as Rfq);

      if (dto.requisitionIds !== undefined) {
        await manager.delete(RfqRequisition, { rfqId: rfq.id });
        await this.writeRequisitions(manager, rfq, requisitions);
        // The vendor has not seen a draft: its deviation list restarts from the requisitions.
        await manager.delete(RfqDeviation, { rfqId: rfq.id });
        await this.copyRequisitionDeviations(manager, rfq, requisitions);
      }
      if (items) {
        await manager.delete(RfqItem, { rfqId: rfq.id });
        await this.writeItems(manager, rfq, items);
      }
      if (compliances) {
        await manager.delete(RfqCompliance, { rfqId: rfq.id });
        await this.writeCompliances(manager, rfq, compliances, existing ?? []);
      }
      if (documents) {
        await manager.delete(RfqDocument, { rfqId: rfq.id, section: In(BUYER_DOCUMENT_SECTIONS as RfqDocumentSection[]) });
        await this.writeDocuments(manager, rfq, documents, BUYER_DOCUMENT_SECTIONS, actor.email);
      }
      if (!draft) {
        await this.record(manager, rfq, actor, WorkflowAction.UPDATED, rfq.status, rfq.status, { changed: ['compliances'] });
      }
    }).catch((err) => this.rethrow(err, 'update'));

    return this.findOne(organizationId, id, actor);
  }

  /** DRAFT → ISSUED: the vendor is emailed the RFQ with Acknowledge and View buttons. */
  async issue(organizationId: string, id: string, actor: RfqActor): Promise<RfqResponseDto> {
    this.assertBuyer(actor);
    const rfq = await this.loadOrThrow(organizationId, id, { vendor: true, items: true, requisitions: true, documents: true });
    if (rfq.status !== RfqStatus.DRAFT) throw new ConflictException('Only a draft RFQ can be issued');

    const issues = this.issueBlockers(rfq);
    if (issues.length) throw new BadRequestException(`Before issuing the RFQ, ${issues.join('; ')}.`);

    const fromStatus = rfq.status;
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Rfq, { id: rfq.id }, {
        status: RfqStatus.ISSUED, issueDate: today(), issuedAt: new Date(), issuedBy: actor.email, updatedBy: actor.email,
      });
      rfq.status = RfqStatus.ISSUED;
      await this.record(manager, rfq, actor, WorkflowAction.ISSUED, fromStatus, RfqStatus.ISSUED, {
        vendorId: rfq.vendorId, emailedTo: [rfq.vendor!.email],
      });
    });
    this.logger.log(`RFQ ${rfq.rfqNumber} issued to ${rfq.vendor!.vendorName} by ${actor.email}`, RfqService.name);

    const full = await this.findOne(organizationId, id, actor);
    void this.notifier.issued(full, rfq.organizationId, actor).catch(() => undefined);
    return full;
  }

  /**
   * What must be in place before a draft is issued: the vendor (with an email),
   * the bid closing date, the subject, at least one material requisition and
   * one priced line, and the required documents — terms and conditions, the
   * non-disclosure agreement when one is asked for, and the technical
   * specification (uploaded or selected from the requisitions).
   */
  issueBlockers(rfq: Rfq): string[] {
    const issues: string[] = [];
    const docs = (section: RfqDocumentSection) => (rfq.documents ?? []).some((d) => d.section === section);
    if (!rfq.vendorId || !rfq.vendor) issues.push('choose the vendor');
    else if (!rfq.vendor.email) issues.push(`add an email address to vendor ${rfq.vendor.vendorName}`);
    if (!rfq.bidClosingDate) issues.push('set the bid closing date');
    else if (rfq.bidClosingDate < today()) issues.push('move the bid closing date to today or later');
    if (!blank(rfq.subject)) issues.push('enter the subject');
    if (!rfq.requisitions?.length) issues.push('select at least one material requisition');
    if (!rfq.items?.length) issues.push('add at least one item to the price schedule');
    if (!docs(RfqDocumentSection.TERMS_AND_CONDITIONS)) issues.push('attach the terms and conditions');
    if (rfq.ndaScope && !docs(RfqDocumentSection.NON_DISCLOSURE_AGREEMENT)) issues.push('attach the non-disclosure agreement');
    if (!docs(RfqDocumentSection.TECHNICAL_SPECIFICATION)) issues.push('attach or select the technical specification documents');
    return issues;
  }

  /** Buyer: complete, approve or cancel (RFQ_STATUS_TRANSITIONS). */
  async changeStatus(organizationId: string, id: string, dto: UpdateRfqStatusDto, actor: RfqActor): Promise<RfqResponseDto> {
    this.assertBuyer(actor);
    const rfq = await this.loadOrThrow(organizationId, id);
    if (!RFQ_STATUS_TRANSITIONS[rfq.status].includes(dto.status)) {
      throw new ConflictException(`An RFQ that is ${rfq.status.toLowerCase()} cannot be moved to ${dto.status.toLowerCase()}.`);
    }
    const fromStatus = rfq.status;
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Rfq, { id: rfq.id }, { status: dto.status, updatedBy: actor.email });
      rfq.status = dto.status;
      await this.record(manager, rfq, actor, WorkflowAction.STATUS_CHANGED, fromStatus, dto.status, null);
    });
    return this.findOne(organizationId, id, actor);
  }

  /** Only a draft can be deleted (soft delete). */
  async remove(organizationId: string, id: string, actor: RfqActor): Promise<void> {
    this.assertBuyer(actor);
    const rfq = await this.loadOrThrow(organizationId, id);
    if (rfq.status !== RfqStatus.DRAFT) throw new ConflictException('Only a draft RFQ can be deleted — cancel it instead.');
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Rfq, { id: rfq.id }, { isDeleted: true, deletedAt: new Date(), deletedBy: actor.email });
      await this.record(manager, rfq, actor, WorkflowAction.DELETED, rfq.status, 'DELETED', null);
    });
  }

  // ── Vendor: the quotation ────────────────────────────────────────

  /**
   * The vendor's parts: prices, other charges, checklist, compliance answers,
   * deviations and qualification documents. Editable while the RFQ is issued,
   * acknowledged or quoted (until completed / approved). `submit` marks it
   * QUOTED once everything required is filled.
   */
  async saveVendorResponse(organizationId: string, id: string, dto: RfqVendorResponseDto, actor: RfqActor): Promise<RfqResponseDto> {
    const rfq = await this.loadOrThrow(organizationId, id, {
      vendor: true, items: true, checklist: true, compliances: true, requisitions: true,
    });
    if (!this.isVendorOf(rfq, actor)) throw new ForbiddenException('Only the vendor this RFQ was issued to can answer it');
    if (rfq.status === RfqStatus.ISSUED) {
      throw new ConflictException('Acknowledge this RFQ (RFQ Acknowledgement Form) before preparing your response.');
    }
    if (!RFQ_VENDOR_EDITABLE_STATUSES.includes(rfq.status)) {
      throw new ConflictException(`This RFQ is ${rfq.status.toLowerCase()} — the response can no longer change.`);
    }

    const items = new Map(rfq.items.map((i) => [i.id, i]));
    for (const p of dto.items ?? []) {
      const item = items.get(p.id);
      if (!item) throw new BadRequestException('A priced item does not belong to this RFQ');
      if (p.unitPrice !== undefined) item.unitPrice = p.unitPrice;
      if (p.exchangeRate !== undefined) item.exchangeRate = p.exchangeRate;
      if (p.deliveryDuration !== undefined) item.deliveryDuration = blank(p.deliveryDuration);
      if (p.remarks !== undefined) item.remarks = blank(p.remarks);
      item.totalPrice = item.unitPrice != null ? round(item.unitPrice * item.rfqQuantity, 4) : null;
      item.totalPriceUsd = item.totalPrice != null && item.exchangeRate != null ? round(item.totalPrice * item.exchangeRate, 4) : null;
    }

    const checklist = new Map(rfq.checklist.map((c) => [c.key, c]));
    for (const a of dto.checklist ?? []) {
      const line = checklist.get(a.key);
      if (!line) throw new BadRequestException(`Unknown checklist item ${a.key}`);
      if (a.provided !== undefined) line.provided = a.provided;
      if (a.reason !== undefined) line.reason = blank(a.reason);
      if (line.provided === false && !line.reason) {
        throw new BadRequestException(`Checklist — ${line.label}: give the reason it is not provided`);
      }
    }

    const compliances = new Map(rfq.compliances.map((c) => [c.id, c]));
    for (const a of dto.compliances ?? []) {
      const c = compliances.get(a.id);
      if (!c) throw new BadRequestException('A compliance answer does not belong to this RFQ');
      if (a.vendorResponse !== undefined) c.vendorResponse = blank(a.vendorResponse);
      if (a.compliant !== undefined) c.compliant = a.compliant;
      if (a.remarks !== undefined) c.remarks = blank(a.remarks);
      if (c.compliant === false && !c.remarks) {
        throw new BadRequestException(`Compliance item ${c.sequence}: say why it is not compliant in the remarks`);
      }
    }

    const deviations = dto.deviations !== undefined ? this.resolveDeviations(dto.deviations) : null;
    const qualification = dto.qualificationDocuments !== undefined
      ? this.resolveDocuments(dto.qualificationDocuments, [RfqDocumentSection.VENDOR_QUALIFICATION], [])
      : null;
    if (qualification?.some((d) => d.vendorDocumentId)) {
      const ids = qualification.map((d) => d.vendorDocumentId).filter((v): v is string => !!v);
      const own = await this.vendorDocRepo.count({ where: { id: In(ids), vendorId: rfq.vendorId ?? '', isDeleted: false } });
      if (own !== new Set(ids).size) throw new BadRequestException('A chosen document is not one of your Vendor Master documents');
    }

    const currency = dto.quotedCurrency !== undefined ? (dto.quotedCurrency || null) : rfq.quotedCurrency;
    if (dto.submit) {
      const missing: string[] = [];
      if (!currency) missing.push('the quoted currency');
      const unpriced = rfq.items.filter((i) => i.unitPrice == null).length;
      if (unpriced) missing.push(`the unit price of ${unpriced} item${unpriced === 1 ? '' : 's'}`);
      const unchecked = rfq.checklist.filter((c) => c.provided == null).length;
      if (unchecked) missing.push(`${unchecked} checklist answer${unchecked === 1 ? '' : 's'}`);
      const unanswered = rfq.compliances.filter((c) => c.compliant == null).length;
      if (unanswered) missing.push(`${unanswered} compliance answer${unanswered === 1 ? '' : 's'}`);
      if (missing.length) throw new BadRequestException(`Before submitting the quotation, fill ${missing.join(', ')}.`);
    }

    const fromStatus = rfq.status;
    await this.dataSource.transaction(async (manager) => {
      await manager.save(RfqItem, rfq.items);
      await manager.save(RfqChecklistItem, rfq.checklist);
      await manager.save(RfqCompliance, rfq.compliances);
      if (dto.otherCharges !== undefined) {
        await manager.delete(RfqOtherCharge, { rfqId: rfq.id });
        for (const [index, c] of dto.otherCharges.entries()) {
          await manager.save(RfqOtherCharge, manager.create(RfqOtherCharge, {
            organizationId, rfqId: rfq.id, sequence: index + 1, title: c.title.trim(), amount: c.amount,
          }));
        }
      }
      if (deviations) {
        await manager.delete(RfqDeviation, { rfqId: rfq.id });
        for (const d of deviations) {
          await manager.save(RfqDeviation, manager.create(RfqDeviation, { ...d, organizationId, rfqId: rfq.id }));
        }
      }
      if (qualification) {
        // The buyer's qualification documents stay; the vendor replaces only its own.
        await manager.delete(RfqDocument, { rfqId: rfq.id, section: RfqDocumentSection.VENDOR_QUALIFICATION, uploadedBy: actor.email });
        await this.writeDocuments(manager, rfq, qualification, [RfqDocumentSection.VENDOR_QUALIFICATION], actor.email);
      }
      const submitted = dto.submit === true;
      await manager.update(Rfq, { id: rfq.id }, {
        quotedCurrency: currency,
        updatedBy: actor.email,
        ...(submitted ? { status: RfqStatus.QUOTED, quotedAt: new Date(), quotedBy: actor.email } : {}),
      });
      if (submitted) {
        rfq.status = RfqStatus.QUOTED;
        await this.record(manager, rfq, actor, WorkflowAction.QUOTED, fromStatus, RfqStatus.QUOTED, null);
      }
    }).catch((err) => this.rethrow(err, 'save the quotation of'));

    const saved = await this.findOne(organizationId, id, actor);
    if (dto.submit) {
      this.logger.log(`RFQ ${saved.rfqNumber}: response submitted by ${actor.email}`, RfqService.name);
      const buyers = [rfq.createdBy, rfq.issuedBy].filter((e): e is string => !!e);
      void this.notifier.responseSubmitted(saved, organizationId, buyers, actor, fromStatus === RfqStatus.QUOTED).catch(() => undefined);
    }
    return saved;
  }

  // ── Vendor: RFQ Acknowledgement Form ─────────────────────────────

  /** The form: the RFQ, the vendor's defaults and any acknowledgement already given. */
  async acknowledgementForm(organizationId: string, id: string, actor: RfqActor): Promise<RfqAcknowledgementFormDto> {
    const rfq = await this.loadOrThrow(organizationId, id, {
      vendor: true, project: true, client: true, acknowledgement: true, documents: true,
    });
    this.assertCanRead(rfq, actor);
    const me = await this.userRepo.findOne({ where: { id: actor.userId } });
    const name = me ? [me.first_name, me.last_name].filter(Boolean).join(' ').trim() : actor.name;
    return {
      rfqId: rfq.id,
      rfqNumber: rfq.rfqNumber,
      revisionNo: rfq.revisionNo,
      subject: rfq.subject ?? null,
      status: rfq.status,
      issueDate: rfq.issueDate ? String(rfq.issueDate).slice(0, 10) : null,
      issuedAt: rfq.issuedAt ?? null,
      bidClosingDate: rfq.bidClosingDate ? String(rfq.bidClosingDate).slice(0, 10) : null,
      sealedBid: !!rfq.sealedBid,
      projectCode: rfq.project?.code ?? null,
      projectName: rfq.project?.projectName ?? null,
      clientName: rfq.client?.clientName ?? null,
      buyerName: rfq.contactName ?? null,
      buyerEmail: rfq.contactEmail ?? null,
      buyerPhone: rfq.contactPhone ?? null,
      vendorName: rfq.vendor?.vendorName ?? null,
      canAcknowledge: this.isVendorOf(rfq, actor) && rfq.status === RfqStatus.ISSUED && !rfq.acknowledgement,
      defaults: {
        vendorName: rfq.vendor?.vendorName ?? '',
        contactPerson: name || actor.email,
        email: me?.email ?? actor.email,
        phone: me?.mobile || null,
      },
      acknowledgement: rfq.acknowledgement ? this.toAcknowledgement(rfq.acknowledgement, rfq.documents ?? []) : null,
    };
  }

  /**
   * The vendor submits the Acknowledgement Form (once, while the RFQ is issued).
   * Participating and quoting → ACKNOWLEDGED (the vendor can now respond);
   * otherwise → DECLINED. The buyer is notified through the workflow step.
   */
  async acknowledge(organizationId: string, id: string, dto: RfqAcknowledgementDto, actor: RfqActor): Promise<RfqAcknowledgementFormDto> {
    const rfq = await this.loadOrThrow(organizationId, id, { vendor: true, acknowledgement: true });
    if (!this.isVendorOf(rfq, actor)) throw new ForbiddenException('Only the vendor this RFQ was issued to can acknowledge it');
    if (rfq.acknowledgement) throw new ConflictException('This RFQ has already been acknowledged');
    if (rfq.status !== RfqStatus.ISSUED) {
      throw new ConflictException(`This RFQ is ${rfq.status.toLowerCase()} and can no longer be acknowledged`);
    }
    if (dto.participate && dto.willSubmitQuotation == null) {
      throw new BadRequestException('Say whether you will submit a quotation');
    }
    const documents = this.resolveDocuments(dto.documents ?? [], [RfqDocumentSection.ACKNOWLEDGEMENT], []);
    if (!documents.length) throw new BadRequestException('Upload the acknowledgement document');

    const willQuote = dto.participate && dto.willSubmitQuotation === true;
    const toStatus = willQuote ? RfqStatus.ACKNOWLEDGED : RfqStatus.DECLINED;
    const fromStatus = rfq.status;
    await this.dataSource.transaction(async (manager) => {
      await manager.save(RfqAcknowledgement, manager.create(RfqAcknowledgement, {
        organizationId,
        rfqId: rfq.id,
        participate: dto.participate,
        willSubmitQuotation: willQuote,
        vendorName: dto.vendorName.trim(),
        contactPerson: dto.contactPerson.trim(),
        email: dto.email.trim(),
        phone: blank(dto.phone),
        acknowledgedBy: actor.email,
        acknowledgedAt: new Date(),
      }));
      await this.writeDocuments(manager, rfq, documents, [RfqDocumentSection.ACKNOWLEDGEMENT], actor.email);
      await manager.update(Rfq, { id: rfq.id }, { status: toStatus, updatedBy: actor.email });
      rfq.status = toStatus;
      await this.record(manager, rfq, actor, willQuote ? WorkflowAction.ACKNOWLEDGED : WorkflowAction.DECLINED, fromStatus, toStatus, {
        participate: dto.participate, willSubmitQuotation: willQuote,
      });
    }).catch((err) => this.rethrow(err, 'acknowledge'));
    this.logger.log(`RFQ ${rfq.rfqNumber} ${willQuote ? 'acknowledged' : 'declined'} by ${actor.email}`, RfqService.name);
    return this.acknowledgementForm(organizationId, id, actor);
  }

  /** The signed-in vendor's RFQs by stage (its menu shows once it has acknowledged one). */
  async vendorSummary(organizationId: string, actor: RfqActor): Promise<RfqVendorSummaryDto> {
    const rows = await this.rfqRepo.createQueryBuilder('rfq')
      .innerJoin('rfq.vendor', 'ven')
      .select('rfq.status', 'status')
      .addSelect('COUNT(*)', 'n')
      .where('rfq.organizationId = :organizationId', { organizationId })
      .andWhere('rfq.isDeleted = :no', { no: false })
      .andWhere('rfq.status <> :draft', { draft: RfqStatus.DRAFT })
      .andWhere('(LOWER(ven.createdBy) = :me OR LOWER(ven.email) = :me)', { me: actor.email.toLowerCase() })
      .groupBy('rfq.status')
      .getRawMany<{ status: RfqStatus; n: string }>();
    const count = (...s: RfqStatus[]) => rows.filter((r) => s.includes(r.status)).reduce((t, r) => t + Number(r.n), 0);
    return {
      awaitingAcknowledgement: count(RfqStatus.ISSUED),
      acknowledged: count(RfqStatus.ACKNOWLEDGED),
      responded: count(RfqStatus.QUOTED),
      acknowledgedTotal: count(RfqStatus.ACKNOWLEDGED, RfqStatus.DECLINED, RfqStatus.QUOTED, RfqStatus.COMPLETED, RfqStatus.APPROVED),
      total: rows.reduce((t, r) => t + Number(r.n), 0),
    };
  }

  private toAcknowledgement(a: RfqAcknowledgement, docs: RfqDocument[]): RfqAcknowledgementResponseDto {
    return {
      id: a.id,
      participate: a.participate,
      willSubmitQuotation: a.willSubmitQuotation,
      vendorName: a.vendorName,
      contactPerson: a.contactPerson,
      email: a.email,
      phone: a.phone ?? null,
      acknowledgedBy: a.acknowledgedBy,
      acknowledgedAt: a.acknowledgedAt,
      documents: docs.filter((d) => d.section === RfqDocumentSection.ACKNOWLEDGEMENT).map((d) => this.toDocument(d)),
    };
  }

  private toDocument(d: RfqDocument): RfqDocumentResponseDto {
    return {
      id: d.id, section: d.section, documentName: d.documentName, documentUrl: d.documentUrl, fileName: d.fileName ?? null,
      mimeType: d.mimeType ?? null, fileSizeBytes: d.fileSizeBytes ?? null, sourceRequisitionId: d.sourceRequisitionId ?? null,
      sourceDocumentId: d.sourceDocumentId ?? null, sourceMrNumber: d.sourceMrNumber ?? null,
      vendorDocumentId: d.vendorDocumentId ?? null, uploadedBy: d.uploadedBy ?? null, uploadedAt: d.uploadedAt,
    };
  }

  // ── Access ───────────────────────────────────────────────────────

  isBuyer(actor: RfqActor): boolean {
    return actor.isInternal && RFQ_BUYER_ROLES.includes(actor.role);
  }

  /** The vendor-side account of the vendor the RFQ is addressed to (it created, or owns the email of, the vendor). */
  isVendorOf(rfq: Rfq, actor: RfqActor): boolean {
    // An internal user without a vendor role is never the vendor — even if they created the vendor record.
    if (actor.isInternal && !RFQ_VENDOR_ROLE.includes(actor.role)) return false;
    const me = actor.email.toLowerCase();
    const v = rfq.vendor;
    return !!v && [v.createdBy, v.email].some((e) => (e ?? '').toLowerCase() === me);
  }

  assertCanRead(rfq: Rfq, actor: RfqActor): void {
    if (this.isVendorOf(rfq, actor)) {
      if (rfq.status === RfqStatus.DRAFT) throw new NotFoundException('RFQ not found');
      return;
    }
    if (actor.isInternal && (RFQ_READER_ROLES.includes(actor.role) || rfq.createdBy === actor.email)) return;
    throw new ForbiddenException('You do not have access to this RFQ');
  }

  permissionsFor(rfq: Rfq, actor: RfqActor): RfqPermissionsDto {
    const vendor = this.isVendorOf(rfq, actor);
    const buyer = !vendor && this.isBuyer(actor);
    return {
      viewer: vendor ? 'VENDOR' : buyer ? 'BUYER' : 'READER',
      canEditBuyer: buyer && rfq.status === RfqStatus.DRAFT,
      canEditCompliance: buyer && RFQ_COMPLIANCE_EDITABLE_STATUSES.includes(rfq.status),
      canEditVendor: vendor && RFQ_VENDOR_EDITABLE_STATUSES.includes(rfq.status),
      canIssue: buyer && rfq.status === RfqStatus.DRAFT,
      allowedStatuses: buyer ? [...RFQ_STATUS_TRANSITIONS[rfq.status]] : [],
      canDelete: buyer && rfq.status === RfqStatus.DRAFT,
      viewerEmail: actor.email,
    };
  }

  private assertBuyer(actor: RfqActor): void {
    if (!this.isBuyer(actor)) throw new ForbiddenException('Only a company buyer can do this');
  }

  private viewerOf(actor: RfqActor) {
    return { userId: actor.userId, email: actor.email, role: actor.role };
  }

  // ── Validation ───────────────────────────────────────────────────

  private async assertProject(organizationId: string, projectId: string, actor: RfqActor): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id: projectId, organizationId, isDeleted: false } });
    if (!project) throw new BadRequestException('Selected project was not found');
    if (this.projectAccess && !(await this.projectAccess.canSee(organizationId, project, this.viewerOf(actor)))) {
      throw new BadRequestException('Selected project was not found');
    }
    return project;
  }

  private async assertClient(organizationId: string, clientId: string): Promise<void> {
    const client = await this.clientRepo.findOne({ where: { id: clientId, organizationId, isDeleted: false } });
    if (!client) throw new BadRequestException('Selected client was not found');
  }

  private async assertVendor(organizationId: string, vendorId: string, mustBeActive = true): Promise<Vendor> {
    const vendor = await this.vendorRepo.findOne({ where: { id: vendorId, organizationId, isDeleted: false } });
    if (!vendor) throw new BadRequestException('Selected vendor was not found');
    if (mustBeActive && vendor.vendorStatus !== VendorStatus.ACTIVE) {
      throw new BadRequestException(`Vendor ${vendor.vendorName} is not active and cannot receive an RFQ`);
    }
    return vendor;
  }

  private assertBidClosing(date: string | null | undefined): void {
    if (date && date < today()) throw new BadRequestException('The bid closing date must be today or later');
  }

  private async assertNumberFree(
    manager: EntityManager, organizationId: string, rfqNumber: string, revisionNo: number, exceptId: string | null,
  ): Promise<void> {
    const taken = await manager.count(Rfq, {
      where: { organizationId, rfqNumber, revisionNo, isDeleted: false, ...(exceptId ? { id: Not(exceptId) } : {}) },
    });
    if (taken) throw new ConflictException(`RFQ number ${rfqNumber} revision ${revisionNo} is already in use`);
  }

  /** Approved requisitions of the RFQ's project, in the order given. */
  private async assertRequisitions(organizationId: string, ids: string[], projectId: string): Promise<MaterialRequisition[]> {
    if (!ids.length) return [];
    const rows = await this.mrRepo.find({ where: { id: In(ids), organizationId, isDeleted: false } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered = ids.map((id) => byId.get(id));
    if (ordered.some((r) => !r)) throw new BadRequestException('A selected material requisition was not found');
    for (const mr of ordered as MaterialRequisition[]) {
      if (mr.status !== MaterialRequisitionStatus.APPROVED) {
        throw new BadRequestException(`Material requisition ${mr.mrNumber} is not approved`);
      }
      if (mr.projectId !== projectId) {
        throw new BadRequestException(`Material requisition ${mr.mrNumber} belongs to another project`);
      }
    }
    return ordered as MaterialRequisition[];
  }

  /** Price-schedule lines: requisition lines of the chosen requisitions, each within its open quantity. */
  private async resolveItems(
    organizationId: string, requisitions: MaterialRequisition[], items: RfqItemDto[], rfqId: string | null,
  ): Promise<Array<Omit<RfqItem, 'id' | 'rfqId' | 'rfq' | 'organizationId' | 'createdAt' | 'updatedAt'>>> {
    if (!items.length) return [];
    const ids = items.map((i) => i.requisitionItemId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('A requisition line is listed twice in the price schedule');
    const lines = await this.mrItemRepo.find({ where: { id: In(ids), organizationId } });
    const byId = new Map(lines.map((l) => [l.id, l]));
    const mrs = new Map(requisitions.map((r) => [r.id, r]));
    const used = await this.quotedQuantities(organizationId, ids, rfqId);

    return items.map((it, index) => {
      const line = byId.get(it.requisitionItemId);
      const mr = line ? mrs.get(line.requisitionId) : undefined;
      if (!line || !mr) throw new BadRequestException('A price-schedule line does not belong to the selected requisitions');
      const balance = round(Number(line.requestedQty) - (used.get(line.id) ?? 0), 3);
      if (it.rfqQuantity > balance + 1e-9) {
        throw new BadRequestException(
          `${mr.mrNumber} line ${line.lineNumber} (${line.materialCode}): RFQ quantity ${it.rfqQuantity} is more than the ${balance} still open`,
        );
      }
      return {
        lineNumber: index + 1,
        requisitionId: mr.id,
        mrNumber: mr.mrNumber,
        requisitionItemId: line.id,
        materialId: line.materialId,
        itemCode: line.materialCode,
        description: line.materialDescription,
        uom: line.uom ?? null,
        mrQuantity: Number(line.requestedQty),
        rfqQuantity: it.rfqQuantity,
        unitPrice: null, totalPrice: null, exchangeRate: null, totalPriceUsd: null, deliveryDuration: null, remarks: null,
      };
    });
  }

  /** Quantity of each requisition line already in RFQs (cancelled and deleted RFQs, and `exceptRfqId`, excepted). */
  private async quotedQuantities(organizationId: string, requisitionItemIds: string[], exceptRfqId?: string | null): Promise<Map<string, number>> {
    if (!requisitionItemIds.length) return new Map();
    const qb = this.itemRepo.createQueryBuilder('i')
      .innerJoin('i.rfq', 'rfq')
      .select('i.requisitionItemId', 'requisitionItemId')
      .addSelect('SUM(i.rfqQuantity)', 'qty')
      .where('i.organizationId = :organizationId', { organizationId })
      .andWhere('i.requisitionItemId IN (:...ids)', { ids: requisitionItemIds })
      .andWhere('rfq.isDeleted = :no', { no: false })
      .andWhere('rfq.status NOT IN (:...released)', { released: RFQ_RELEASED_STATUSES })
      .groupBy('i.requisitionItemId');
    if (exceptRfqId) qb.andWhere('rfq.id <> :exceptRfqId', { exceptRfqId });
    const rows = await qb.getRawMany<{ requisitionItemId: string; qty: string }>();
    return new Map(rows.map((r) => [r.requisitionItemId, Number(r.qty)]));
  }

  private resolveCompliances(rows: RfqComplianceDto[], requisitions: MaterialRequisition[]) {
    const mrs = new Map(requisitions.map((r) => [r.id, r]));
    return rows.map((r, index) => {
      const requirement = r.requirement?.trim() ?? '';
      if (!requirement) throw new BadRequestException(`Compliance item ${index + 1}: enter the requirement`);
      return { id: r.id, requirement, sourceComplianceId: r.sourceComplianceId ?? null, sequence: index + 1, mrs };
    });
  }

  private resolveDeviations(rows: RfqDeviationDto[]) {
    return rows.map((r, index) => {
      const sr = index + 1;
      const clauseNo = r.clauseNo?.trim() ?? '';
      const rfqRequirement = r.rfqRequirement?.trim() ?? '';
      const vendorDeviation = r.vendorDeviation === true;
      const justification = blank(r.justification);
      if (!clauseNo) throw new BadRequestException(`Deviation item ${sr}: enter the clause no.`);
      if (!rfqRequirement) throw new BadRequestException(`Deviation item ${sr}: enter the RFQ requirement`);
      if (!vendorDeviation && !justification) {
        throw new BadRequestException(`Deviation item ${sr}: a justification is required when Vendor Deviation is not ticked`);
      }
      return { sequence: sr, clauseNo, rfqRequirement, vendorDeviation, justification, sourceDeviationId: null };
    });
  }

  private resolveDocuments(docs: RfqDocumentDto[], sections: readonly RfqDocumentSection[], requisitions: MaterialRequisition[]) {
    const mrs = new Map(requisitions.map((r) => [r.id, r]));
    return docs.map((d) => {
      if (!sections.includes(d.section)) throw new BadRequestException(`Documents of section ${d.section} cannot be saved here`);
      if (d.sourceRequisitionId && !mrs.has(d.sourceRequisitionId)) {
        throw new BadRequestException('A document was picked from a requisition that is not part of this RFQ');
      }
      return { ...d, documentName: d.documentName.trim(), sourceMrNumber: d.sourceRequisitionId ? mrs.get(d.sourceRequisitionId)!.mrNumber : null };
    });
  }

  // ── Writing children ─────────────────────────────────────────────

  private async writeRequisitions(manager: EntityManager, rfq: Rfq, requisitions: MaterialRequisition[]): Promise<void> {
    for (const [index, mr] of requisitions.entries()) {
      await manager.save(RfqRequisition, manager.create(RfqRequisition, {
        organizationId: rfq.organizationId, rfqId: rfq.id, requisitionId: mr.id, mrNumber: mr.mrNumber, sequence: index + 1,
      }));
    }
  }

  private async writeItems(manager: EntityManager, rfq: Rfq, items: Awaited<ReturnType<RfqService['resolveItems']>>): Promise<void> {
    for (const item of items) {
      await manager.save(RfqItem, manager.create(RfqItem, { ...item, organizationId: rfq.organizationId, rfqId: rfq.id }));
    }
  }

  /** Writes the compliance list; items kept (by id) keep the vendor's answers. */
  private async writeCompliances(
    manager: EntityManager, rfq: Rfq, rows: ReturnType<RfqService['resolveCompliances']>, existing: RfqCompliance[],
  ): Promise<void> {
    const previous = new Map(existing.map((c) => [c.id, c]));
    for (const r of rows) {
      const kept = r.id ? previous.get(r.id) : undefined;
      const source = r.sourceComplianceId
        ? await manager.findOne(MaterialRequisitionCompliance, { where: { id: r.sourceComplianceId }, select: { id: true, requisitionId: true } })
        : null;
      const mr = source ? r.mrs.get(source.requisitionId) : undefined;
      await manager.save(RfqCompliance, manager.create(RfqCompliance, {
        organizationId: rfq.organizationId,
        rfqId: rfq.id,
        sequence: r.sequence,
        requirement: r.requirement,
        sourceComplianceId: mr ? r.sourceComplianceId : null,
        sourceRequisitionId: mr?.id ?? null,
        sourceMrNumber: mr?.mrNumber ?? null,
        vendorResponse: kept?.vendorResponse ?? null,
        compliant: kept?.compliant ?? null,
        remarks: kept?.remarks ?? null,
      }));
    }
  }

  private async writeDocuments(
    manager: EntityManager, rfq: Rfq, docs: ReturnType<RfqService['resolveDocuments']>,
    _sections: readonly RfqDocumentSection[], userEmail: string,
  ): Promise<void> {
    for (const d of docs) {
      await manager.save(RfqDocument, manager.create(RfqDocument, {
        organizationId: rfq.organizationId,
        rfqId: rfq.id,
        section: d.section,
        documentName: d.documentName,
        documentUrl: d.documentUrl,
        fileName: d.fileName ?? null,
        mimeType: d.mimeType ?? null,
        fileSizeBytes: d.fileSizeBytes ?? null,
        sourceRequisitionId: d.sourceRequisitionId ?? null,
        sourceDocumentId: d.sourceDocumentId ?? null,
        sourceMrNumber: d.sourceMrNumber,
        vendorDocumentId: d.vendorDocumentId ?? null,
        uploadedBy: userEmail,
      }));
    }
  }

  /** The requisitions' deviations become the starting point of the vendor's deviation list. */
  private async copyRequisitionDeviations(manager: EntityManager, rfq: Rfq, requisitions: MaterialRequisition[]): Promise<void> {
    if (!requisitions.length) return;
    const rows = await manager.find(MaterialRequisitionDeviation, {
      where: { requisitionId: In(requisitions.map((r) => r.id)) },
      order: { sequence: 'ASC' },
    });
    for (const [index, d] of rows.entries()) {
      await manager.save(RfqDeviation, manager.create(RfqDeviation, {
        organizationId: rfq.organizationId, rfqId: rfq.id, sequence: index + 1, sourceDeviationId: d.id,
        clauseNo: d.clauseNo, rfqRequirement: d.rfqRequirement, vendorDeviation: !!d.vendorDeviation,
        justification: d.justification ?? null,
      }));
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private async loadOrThrow(organizationId: string, id: string, relations: Record<string, unknown> = {}): Promise<Rfq> {
    const rfq = await this.rfqRepo.findOne({ where: { id, organizationId, isDeleted: false }, relations });
    if (!rfq) throw new NotFoundException('RFQ not found');
    return rfq;
  }

  private textColumns(dto: Partial<CreateRfqDto>): Partial<Rfq> {
    const out: Record<string, string | null> = {};
    for (const key of TEXT_FIELDS) {
      const value = (dto as Record<string, string | null | undefined>)[key];
      if (value !== undefined) out[key] = blank(value);
    }
    return out as Partial<Rfq>;
  }

  private addressOf(addresses: VendorAddress[] | undefined): string | null {
    const list = (addresses ?? []).filter((a) => a.isActive !== false);
    const a = list.find((x) => x.isPrimary) ?? list[0];
    if (!a) return null;
    return [a.addressLine1, a.addressLine2, a.city, a.state, a.postalCode, a.country].filter(Boolean).join(', ') || null;
  }

  private async mrShortDescriptions(ids: string[]): Promise<Map<string, string | null>> {
    if (!ids.length) return new Map();
    const rows = await this.mrRepo.find({ where: { id: In([...new Set(ids)]) }, select: { id: true, shortDescription: true } });
    return new Map(rows.map((r) => [r.id, r.shortDescription ?? null]));
  }

  private async record(
    manager: EntityManager, rfq: Rfq, actor: RfqActor, action: WorkflowAction,
    fromStatus: string | null, toStatus: string | null, metadata: Record<string, unknown> | null,
  ): Promise<void> {
    if (!rfq.trackingId) {
      rfq.trackingId = this.tracking.generateTrackingId(rfq.organizationId);
      await manager.update(Rfq, { id: rfq.id }, { trackingId: rfq.trackingId });
    }
    await this.tracking.record({
      organizationId: rfq.organizationId,
      trackingId: rfq.trackingId,
      entityType: WorkflowEntityType.RFQ,
      entityId: rfq.id,
      entityReference: rfq.rfqNumber,
      action,
      fromStatus,
      toStatus,
      actor: { userId: actor.userId, name: actor.name, email: actor.email },
      metadata,
    }, manager);
  }

  private rethrow(err: unknown, verb: string): never {
    if ((err as { code?: string })?.code === 'ER_DUP_ENTRY') {
      throw new ConflictException('An RFQ with this number and revision already exists');
    }
    this.logger.error(
      `Failed to ${verb} RFQ: ${err instanceof Error ? err.message : String(err)}`,
      err instanceof Error ? err.stack : String(err),
    );
    throw err;
  }

  private toListItem(r: Rfq, itemCount: number, shortDescriptions: Map<string, string | null>): RfqListItemDto {
    return {
      id: r.id,
      code: r.code,
      rfqNumber: r.rfqNumber,
      revisionNo: r.revisionNo,
      issueDate: r.issueDate ? String(r.issueDate).slice(0, 10) : null,
      status: r.status,
      projectId: r.projectId,
      projectCode: r.project?.code ?? null,
      projectName: r.project?.projectName ?? null,
      clientId: r.clientId ?? null,
      clientName: r.client?.clientName ?? null,
      vendorId: r.vendorId ?? null,
      vendorCode: r.vendor?.code ?? null,
      vendorName: r.vendor?.vendorName ?? null,
      vendorEmail: r.vendor?.email ?? null,
      subject: r.subject ?? null,
      bidClosingDate: r.bidClosingDate ? String(r.bidClosingDate).slice(0, 10) : null,
      sealedBid: !!r.sealedBid,
      requisitions: (r.requisitions ?? []).slice().sort((a, b) => a.sequence - b.sequence).map((q) => ({
        requisitionId: q.requisitionId, mrNumber: q.mrNumber, shortDescription: shortDescriptions.get(q.requisitionId) ?? null,
      })),
      itemCount,
      trackingId: r.trackingId ?? null,
      createdBy: r.createdBy ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private async toResponse(r: Rfq, history: RfqResponseDto['history'], permissions: RfqPermissionsDto | null): Promise<RfqResponseDto> {
    const items = (r.items ?? []).slice().sort((a, b) => a.lineNumber - b.lineNumber);
    const otherCharges = (r.otherCharges ?? []).slice().sort((a, b) => a.sequence - b.sequence);
    const priced = items.filter((i) => i.totalPrice != null);
    const quotedTotal = priced.length || otherCharges.length
      ? round(priced.reduce((s, i) => s + (i.totalPrice ?? 0), 0) + otherCharges.reduce((s, c) => s + c.amount, 0), 4)
      : null;
    const usd = items.filter((i) => i.totalPriceUsd != null);
    const shortDescriptions = await this.mrShortDescriptions((r.requisitions ?? []).map((q) => q.requisitionId));

    return {
      ...this.toListItem(r, items.length, shortDescriptions),
      contactName: r.contactName ?? null,
      contactEmail: r.contactEmail ?? null,
      contactPhone: r.contactPhone ?? null,
      ndaScope: r.ndaScope ?? null,
      vendorAddress: this.addressOf(r.vendor?.addresses),
      content: r.content ?? null,
      instructionsToBidders: r.instructionsToBidders ?? null,
      scopeDescription: r.scopeDescription ?? null,
      scopeQuantityNotes: r.scopeQuantityNotes ?? null,
      deliveryLocation: r.deliveryLocation ?? null,
      deliverySchedule: r.deliverySchedule ?? null,
      materialGradeStandards: r.materialGradeStandards ?? null,
      designConditions: r.designConditions ?? null,
      dimensionalRequirements: r.dimensionalRequirements ?? null,
      applicableCodes: r.applicableCodes ?? null,
      qualityRequirements: r.qualityRequirements ?? null,
      regulatoryCompliance: r.regulatoryCompliance ?? null,
      inspectionTesting: r.inspectionTesting ?? null,
      documentationRequirements: r.documentationRequirements ?? null,
      pricingFormat: r.pricingFormat ?? null,
      incoterms: r.incoterms ?? null,
      paymentTerms: r.paymentTerms ?? null,
      taxesDuties: r.taxesDuties ?? null,
      warranty: r.warranty ?? null,
      liquidatedDamages: r.liquidatedDamages ?? null,
      performanceGuarantee: r.performanceGuarantee ?? null,
      insuranceRequirements: r.insuranceRequirements ?? null,
      packingMarking: r.packingMarking ?? null,
      commercialDocumentation: r.commercialDocumentation ?? null,
      quotedCurrency: r.quotedCurrency ?? null,
      quotedAt: r.quotedAt ?? null,
      quotedBy: r.quotedBy ?? null,
      issuedAt: r.issuedAt ?? null,
      issuedBy: r.issuedBy ?? null,
      items: items.map((i) => ({
        id: i.id, lineNumber: i.lineNumber, requisitionId: i.requisitionId, mrNumber: i.mrNumber,
        requisitionItemId: i.requisitionItemId, materialId: i.materialId, itemCode: i.itemCode, description: i.description,
        uom: i.uom ?? null, mrQuantity: i.mrQuantity, rfqQuantity: i.rfqQuantity, unitPrice: i.unitPrice ?? null,
        totalPrice: i.totalPrice ?? null, exchangeRate: i.exchangeRate ?? null, totalPriceUsd: i.totalPriceUsd ?? null,
        deliveryDuration: i.deliveryDuration ?? null, remarks: i.remarks ?? null,
      })),
      documents: (r.documents ?? []).slice().sort((a, b) => +new Date(a.uploadedAt) - +new Date(b.uploadedAt)).map((d) => ({
        id: d.id, section: d.section, documentName: d.documentName, documentUrl: d.documentUrl, fileName: d.fileName ?? null,
        mimeType: d.mimeType ?? null, fileSizeBytes: d.fileSizeBytes ?? null, sourceRequisitionId: d.sourceRequisitionId ?? null,
        sourceDocumentId: d.sourceDocumentId ?? null, sourceMrNumber: d.sourceMrNumber ?? null,
        vendorDocumentId: d.vendorDocumentId ?? null, uploadedBy: d.uploadedBy ?? null, uploadedAt: d.uploadedAt,
      })),
      otherCharges: otherCharges.map((c) => ({ id: c.id, sequence: c.sequence, title: c.title, amount: c.amount })),
      checklist: (r.checklist ?? []).slice().sort((a, b) => a.sequence - b.sequence).map((c) => ({
        id: c.id, section: c.section, key: c.key, label: c.label, sequence: c.sequence,
        provided: c.provided ?? null, reason: c.reason ?? null,
      })),
      compliances: (r.compliances ?? []).slice().sort((a, b) => a.sequence - b.sequence).map((c) => ({
        id: c.id, sequence: c.sequence, sourceComplianceId: c.sourceComplianceId ?? null,
        sourceRequisitionId: c.sourceRequisitionId ?? null, sourceMrNumber: c.sourceMrNumber ?? null,
        requirement: c.requirement, vendorResponse: c.vendorResponse ?? null, compliant: c.compliant ?? null, remarks: c.remarks ?? null,
      })),
      deviations: (r.deviations ?? []).slice().sort((a, b) => a.sequence - b.sequence).map((d) => ({
        id: d.id, sequence: d.sequence, sourceDeviationId: d.sourceDeviationId ?? null, clauseNo: d.clauseNo,
        rfqRequirement: d.rfqRequirement, vendorDeviation: !!d.vendorDeviation, justification: d.justification ?? null,
      })),
      quotedTotal,
      quotedTotalUsd: usd.length ? round(usd.reduce((s, i) => s + (i.totalPriceUsd ?? 0), 0), 4) : null,
      history,
      permissions,
      acknowledgement: r.acknowledgement ? this.toAcknowledgement(r.acknowledgement, r.documents ?? []) : null,
      updatedBy: r.updatedBy ?? null,
    };
  }
}
