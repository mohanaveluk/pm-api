import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import * as ExcelJS from 'exceljs';
import { MasterCodeService, MasterSequenceKey } from 'src/common/services/master-code.service';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { UserProjectAccessService } from '../user-project-mapping/user-project-access.service';
import { Material } from '../material/entities/material.entity';
import { MaterialStatus } from '../material/enums/material-status.enum';
import { Project } from '../project/entities/project.entity';
import { OPEN_PROJECT_STATUSES } from '../project/enums/project.enums';
import { WbsCostCode } from '../wbs-cost-code/entity/wbs-cost-code.entity';
import { MaterialRequisition } from './entities/material-requisition.entity';
import { MaterialRequisitionItem } from './entities/material-requisition-item.entity';
import { MaterialRequisitionDocument } from './entities/material-requisition-document.entity';
import { MaterialRequisitionParticipant } from './entities/material-requisition-participant.entity';
import {
  EDITABLE_REQUISITION_STATUSES, MaterialRequisitionStatus, REQUISITION_STATUS_TRANSITIONS,
  RequisitionLineSource, RequisitionParticipantRole, SUBMITTABLE_REQUISITION_STATUSES,
} from './enums/material-requisition.enums';
import { WorkflowTrackingService } from '../workflow-tracking/workflow-tracking.service';
import { WorkflowAction, WorkflowEntityType } from '../workflow-tracking/enums/workflow-tracking.enums';
import { WorkflowEventResponseDto } from '../workflow-tracking/dto/workflow-event-response.dto';
import {
  MaterialRequisitionWorkflowService, ParticipantChange, RequisitionActor, SettledStatus,
} from './material-requisition-workflow.service';
import {
  CreateMaterialRequisitionDto, RequisitionDocumentDto, RequisitionItemDto,
} from './dto/create-material-requisition.dto';
import { UpdateMaterialRequisitionDto } from './dto/update-material-requisition.dto';
import {
  AssignedRequisitionQueryDto, MaterialRequisitionQueryDto, ProjectItemsQueryDto, RequisitionMaterialQueryDto,
} from './dto/material-requisition-query.dto';
import {
  BomColumnsDto, BomPreviewDto, BomRowIssueDto, MaterialRequisitionListItemDto,
  MaterialRequisitionListResponseDto, MaterialRequisitionResponseDto, RequisitionCandidateDto,
  RequisitionCandidateListDto, RequisitionDocumentResponseDto, RequisitionItemResponseDto,
  RequisitionParticipantResponseDto, RequisitionParticipantSummaryDto, RequisitionPermissionsDto,
  RequisitionWbsDto,
} from './dto/material-requisition-response.dto';

// Whitelist of sortBy value → query-builder column. Anything else falls back to
// createdAt, so a caller can never inject a column expression.
const SORT_COLUMNS: Record<string, string> = {
  code:               'mr.code',
  mrNumber:           'mr.mrNumber',
  project:            'prj.code',
  status:             'mr.status',
  requiredOnSiteDate: 'mr.requiredOnSiteDate',
  createdAt:          'mr.createdAt',
  updatedAt:          'mr.updatedAt',
};

const TEXT_FIELDS = [
  'budgetHead', 'mtoReference', 'pidReference', 'isometricReference', 'areaUnit', 'remarks',
] as const;

const BOM_MAX_BYTES = 5 * 1024 * 1024;
const BOM_MAX_ROWS = 5000;

const BOM_ALIASES: Record<'code' | 'description' | 'quantity' | 'uom', RegExp> = {
  code:        /^(item|material|mat|part)?\s*(code|no|number|id)$|^item$|^material$/i,
  description: /desc/i,
  quantity:    /^(req(uired|uested)?\s*)?(qty|quantity)|^qty/i,
  uom:         /^(uom|unit|units|unit of (measure|measurement))$/i,
};

@Injectable()
export class MaterialRequisitionService {
  constructor(
    @InjectRepository(MaterialRequisition)         private readonly mrRepo: Repository<MaterialRequisition>,
    @InjectRepository(MaterialRequisitionItem)     private readonly itemRepo: Repository<MaterialRequisitionItem>,
    @InjectRepository(MaterialRequisitionDocument) private readonly docRepo: Repository<MaterialRequisitionDocument>,
    @InjectRepository(Material)                    private readonly materialRepo: Repository<Material>,
    @InjectRepository(Project)                     private readonly projectRepo: Repository<Project>,
    @InjectRepository(WbsCostCode)                 private readonly wbsRepo: Repository<WbsCostCode>,
    @InjectRepository(MaterialRequisitionParticipant)
    private readonly participantRepo: Repository<MaterialRequisitionParticipant>,
    private readonly masterCodeService: MasterCodeService,
    private readonly workflow: MaterialRequisitionWorkflowService,
    private readonly tracking: WorkflowTrackingService,
    private readonly cloudStorageService: CloudStorageService,
    private readonly logger: CustomLoggerService,
    // A requisition is raised only on a project the requester can see.
    @Optional() private readonly projectAccess?: UserProjectAccessService,
  ) {}

  // ── Create ───────────────────────────────────────────────────────

  async create(
    organizationId: string,
    dto: CreateMaterialRequisitionDto,
    actor: RequisitionActor,
  ): Promise<MaterialRequisitionResponseDto> {
    const submit = dto.submit === true;
    const createdBy = actor.email;

    await this.assertProjectUsable(organizationId, dto.projectId, actor);
    if (dto.wbsCostCodeId) await this.assertWbsBelongsToProject(organizationId, dto.wbsCostCodeId, dto.projectId);

    const lines = await this.resolveLines(organizationId, dto.items ?? []);
    const documents = this.resolveDocuments(dto.documents ?? []);

    const ros = dto.requiredOnSiteDate || null;
    this.assertRequiredOnSite(ros, submit);
    if (submit) this.assertSubmittable(dto.wbsCostCodeId ?? null, ros, lines.length);

    const mrNumber = dto.mrNumber?.trim() || null;

    const saved = await this.masterCodeService.withGeneratedCode(
      organizationId,
      MasterSequenceKey.MATERIAL_REQUISITION,
      async (code, queryRunner) => {
        const number = mrNumber ?? code;
        const taken = await queryRunner.manager.count(MaterialRequisition, {
          where: { organizationId, mrNumber: number },
        });
        if (taken > 0) {
          throw new ConflictException(`Material requisition number '${number}' is already in use`);
        }

        // The workflow id is born with the requisition and is carried by every
        // document raised from it (review, approval, RFQ, purchase order, …).
        const trackingId = this.tracking.generateTrackingId(organizationId);

        const row = queryRunner.manager.create(MaterialRequisition, {
          ...this.toColumns(dto),
          dguid: uuidv4(),
          organizationId,
          code,
          mrNumber: number,
          trackingId,
          reviewRound: 0,
          projectId: dto.projectId,
          wbsCostCodeId: dto.wbsCostCodeId ?? null,
          requiredOnSiteDate: ros,
          status: MaterialRequisitionStatus.DRAFT,
          createdBy,
        });
        const header = await queryRunner.manager.save(MaterialRequisition, row);

        await this.writeChildren(queryRunner.manager, header, lines, documents, createdBy);
        await this.workflow.replaceParticipants(queryRunner.manager, header, dto.reviewerIds, dto.approverIds, actor);
        await this.tracking.record({
          organizationId,
          trackingId,
          entityType: WorkflowEntityType.MATERIAL_REQUISITION,
          entityId: header.id,
          entityReference: header.mrNumber,
          action: WorkflowAction.CREATED,
          toStatus: MaterialRequisitionStatus.DRAFT,
          actor: this.workflow.trackingActor(actor),
          metadata: { projectId: header.projectId, wbsCostCodeId: header.wbsCostCodeId, lines: lines.length },
        }, queryRunner.manager);

        if (submit) {
          await this.workflow.startRound(queryRunner.manager, header, actor);
          await queryRunner.manager.save(MaterialRequisition, header);
        }
        return header;
      },
    ).catch((err) => {
      if (!(err instanceof ConflictException)) {
        this.logger.error(
          `Failed to create material requisition in organization ${organizationId}: ${err instanceof Error ? err.message : String(err)}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
      if ((err as { code?: string })?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('A material requisition with this number already exists');
      }
      throw err;
    });

    if (submit) this.workflow.notifySubmitted(organizationId, saved.id, false);
    return this.findOne(organizationId, saved.id, actor);
  }

  // ── Read ─────────────────────────────────────────────────────────

  async findAll(
    organizationId: string,
    query: MaterialRequisitionQueryDto,
  ): Promise<MaterialRequisitionListResponseDto> {
    const { search, status, projectId, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

    const qb = this.mrRepo
      .createQueryBuilder('mr')
      .leftJoinAndSelect('mr.project', 'prj')
      .leftJoinAndSelect('prj.client', 'cli')
      .leftJoinAndSelect('mr.wbsCostCode', 'wbs')
      .where('mr.organizationId = :organizationId', { organizationId })
      .andWhere('mr.isDeleted = :isDeleted', { isDeleted: false });

    if (status)    qb.andWhere('mr.status = :status', { status });
    if (projectId) qb.andWhere('mr.projectId = :projectId', { projectId });

    const term = search?.trim();
    if (term) {
      // Escape LIKE wildcards so a search for "50%" matches literally.
      const like = `%${term.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere(
        '(LOWER(mr.code) LIKE :like OR LOWER(mr.mrNumber) LIKE :like OR LOWER(mr.trackingId) LIKE :like ' +
        'OR LOWER(prj.code) LIKE :like OR LOWER(prj.projectName) LIKE :like ' +
        'OR LOWER(cli.clientName) LIKE :like OR LOWER(mr.budgetHead) LIKE :like)',
        { like },
      );
    }

    const sortColumn = SORT_COLUMNS[sortBy] ?? SORT_COLUMNS.createdAt;
    const direction: 'ASC' | 'DESC' = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortColumn, direction);
    if (sortColumn !== SORT_COLUMNS.code) qb.addOrderBy(SORT_COLUMNS.code, 'DESC');

    const [rows, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    const counts = await this.countItems(rows.map((r) => r.id));
    await this.attachParticipants(rows);

    return {
      items: rows.map((r) => this.toListItem(r, counts.get(r.id) ?? 0)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * "My reviews" / "My approvals": requisitions the user is assigned to in the
   * given role — by default only those still waiting for their decision.
   */
  async findAssigned(
    organizationId: string,
    actor: RequisitionActor,
    role: RequisitionParticipantRole,
    query: AssignedRequisitionQueryDto,
  ): Promise<MaterialRequisitionListResponseDto> {
    const { search, status, projectId, page = 1, limit = 20, sortBy = 'submittedAt', sortOrder = 'DESC' } = query;
    const pendingOnly = query.pendingOnly !== false;

    const qb = this.mrRepo
      .createQueryBuilder('mr')
      .innerJoin(
        MaterialRequisitionParticipant, 'me',
        'me.requisitionId = mr.id AND me.userId = :userId AND me.role = :role',
        { userId: actor.userId, role },
      )
      .leftJoinAndSelect('mr.project', 'prj')
      .leftJoinAndSelect('prj.client', 'cli')
      .leftJoinAndSelect('mr.wbsCostCode', 'wbs')
      .where('mr.organizationId = :organizationId', { organizationId })
      .andWhere('mr.isDeleted = :isDeleted', { isDeleted: false })
      // A draft has not reached anyone yet.
      .andWhere('mr.status <> :draft', { draft: MaterialRequisitionStatus.DRAFT });

    if (pendingOnly) {
      qb.andWhere('me.decision IS NULL').andWhere('mr.status = :waiting', {
        waiting: role === RequisitionParticipantRole.REVIEWER
          ? MaterialRequisitionStatus.UNDER_REVIEW
          : MaterialRequisitionStatus.REVIEWED,
      });
    } else if (status) {
      qb.andWhere('mr.status = :status', { status });
    }
    if (projectId) qb.andWhere('mr.projectId = :projectId', { projectId });

    const term = search?.trim();
    if (term) {
      const like = `%${term.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere(
        '(LOWER(mr.mrNumber) LIKE :like OR LOWER(mr.trackingId) LIKE :like ' +
        'OR LOWER(prj.code) LIKE :like OR LOWER(prj.projectName) LIKE :like OR LOWER(cli.clientName) LIKE :like)',
        { like },
      );
    }

    const sortColumn = sortBy === 'submittedAt' ? 'mr.submittedAt' : (SORT_COLUMNS[sortBy] ?? 'mr.submittedAt');
    qb.orderBy(sortColumn, sortOrder === 'ASC' ? 'ASC' : 'DESC').addOrderBy(SORT_COLUMNS.code, 'DESC');

    const [rows, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    const counts = await this.countItems(rows.map((r) => r.id));
    await this.attachParticipants(rows);
    return {
      items: rows.map((r) => this.toListItem(r, counts.get(r.id) ?? 0)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Internal users who can be picked as reviewers or approvers. */
  participantOptions(organizationId: string) {
    return this.workflow.userOptions(organizationId);
  }

  async findOne(
    organizationId: string,
    id: string,
    actor?: RequisitionActor,
  ): Promise<MaterialRequisitionResponseDto> {
    const mr = await this.mrRepo.findOne({
      where: { id, organizationId, isDeleted: false },
      relations: {
        project: { client: true },
        wbsCostCode: { discipline: { department: true } },
        items: true,
        documents: true,
        participants: true,
      },
      order: { items: { lineNumber: 'ASC' }, documents: { uploadedAt: 'ASC' }, participants: { sequence: 'ASC' } },
    });
    if (!mr) throw new NotFoundException('Material requisition not found');
    if (actor) this.workflow.assertCanRead(mr, actor);

    const history = await this.tracking.eventsFor(
      organizationId,
      [WorkflowEntityType.MATERIAL_REQUISITION, WorkflowEntityType.MR_REVIEW, WorkflowEntityType.MR_APPROVAL],
      id,
    );
    return this.toResponse(mr, history, actor ? this.workflow.permissionsFor(mr, actor) : null);
  }

  // ── Update / submit / delete ─────────────────────────────────────

  async update(
    organizationId: string,
    id: string,
    dto: UpdateMaterialRequisitionDto,
    actor: RequisitionActor,
  ): Promise<MaterialRequisitionResponseDto> {
    if ((dto as { code?: unknown }).code !== undefined) {
      throw new ConflictException('The requisition code is server-generated and cannot be changed');
    }
    const updatedBy = actor.email;

    const mr = await this.findEditableOrThrow(organizationId, id);
    const participants = await this.participantRepo.find({ where: { requisitionId: id } });
    if (!this.workflow.permissionsFor({ ...mr, participants } as MaterialRequisition, actor).canEdit) {
      throw new ForbiddenException('You cannot edit this requisition');
    }

    // An Under Review or Reviewed requisition is already submitted: it is
    // corrected in place (by its requester or a reviewer while under review, by
    // an approver while reviewed), keeps its status and submission stamp, and
    // must stay submittable.
    const underReview = mr.status === MaterialRequisitionStatus.UNDER_REVIEW
      || mr.status === MaterialRequisitionStatus.REVIEWED;
    const submit = dto.submit === true && SUBMITTABLE_REQUISITION_STATUSES.includes(mr.status);
    const mustBeSubmittable = submit || underReview;


    const projectId = dto.projectId ?? mr.projectId;
    if (dto.projectId && dto.projectId !== mr.projectId) {
      await this.assertProjectUsable(organizationId, dto.projectId, actor);
    }

    // Changing the project invalidates the WBS / cost code picked for the old one.
    const wbsCostCodeId = dto.wbsCostCodeId !== undefined
      ? dto.wbsCostCodeId
      : (dto.projectId && dto.projectId !== mr.projectId ? null : mr.wbsCostCodeId);
    if (wbsCostCodeId) await this.assertWbsBelongsToProject(organizationId, wbsCostCodeId, projectId);

    const ros = dto.requiredOnSiteDate !== undefined ? (dto.requiredOnSiteDate || null) : mr.requiredOnSiteDate;
    const rosChanged = dto.requiredOnSiteDate !== undefined
      && String(ros ?? '').slice(0, 10) !== String(mr.requiredOnSiteDate ?? '').slice(0, 10);
    // An unchanged date on a requisition already under review is not re-judged.
    this.assertRequiredOnSite(ros, submit || (underReview && rosChanged));

    // Lines and documents are replaced as a set — but only when they were sent.
    const lines = dto.items !== undefined
      ? await this.resolveLines(organizationId, dto.items)
      : null;
    const documents = dto.documents !== undefined ? this.resolveDocuments(dto.documents) : null;

    if (mustBeSubmittable) {
      const lineCount = lines ? lines.length : await this.itemRepo.count({ where: { requisitionId: id } });
      this.assertSubmittable(wbsCostCodeId ?? null, ros ? String(ros).slice(0, 10) : null, lineCount);
    }

    if (dto.mrNumber !== undefined) {
      const number = dto.mrNumber?.trim() || mr.code;
      if (number !== mr.mrNumber) {
        const taken = await this.mrRepo.count({ where: { organizationId, mrNumber: number } });
        if (taken > 0) throw new ConflictException(`Material requisition number '${number}' is already in use`);
        mr.mrNumber = number;
      }
    }

    Object.assign(mr, this.toColumns(dto));
    mr.projectId = projectId;
    mr.wbsCostCodeId = wbsCostCodeId ?? null;
    mr.requiredOnSiteDate = ros ? String(ros).slice(0, 10) : null;
    mr.updatedBy = updatedBy;
    // The loaded project relation would otherwise be written back over projectId.
    delete (mr as Partial<MaterialRequisition>).project;

    let resubmitted = false;
    let change: ParticipantChange | null = null;
    let settled: SettledStatus = null;
    try {
      await this.mrRepo.manager.transaction(async (manager) => {
        // Requisitions created before tracking ids existed get one now.
        if (mr.status !== MaterialRequisitionStatus.DRAFT) await this.workflow.ensureTrackingId(manager, mr);
        await manager.save(MaterialRequisition, mr);
        if (lines || documents) {
          await this.replaceChildren(manager, mr, lines, documents, updatedBy);
        }
        // Reviewers change until reviewed, approvers until approved (requester only).
        change = await this.workflow.replaceParticipants(manager, mr, dto.reviewerIds, dto.approverIds, actor);
        if (change.changed && !submit) {
          settled = await this.workflow.settleRound(manager, mr, actor);
          if (settled) await manager.save(MaterialRequisition, mr);
        }
        if (underReview) await this.workflow.markParticipantEdit(manager, mr, actor);
        // Drafts change freely; once submitted, every edit is part of the record.
        if (mr.status !== MaterialRequisitionStatus.DRAFT) {
          await this.tracking.record({
            organizationId,
            trackingId: mr.trackingId,
            entityType: WorkflowEntityType.MATERIAL_REQUISITION,
            entityId: mr.id,
            entityReference: mr.mrNumber,
            action: WorkflowAction.UPDATED,
            fromStatus: mr.status,
            toStatus: mr.status,
            round: mr.reviewRound,
            actor: this.workflow.trackingActor(actor),
          }, manager);
        }
        if (submit) {
          ({ resubmitted } = await this.workflow.startRound(manager, mr, actor));
          await manager.save(MaterialRequisition, mr);
        }
      });
    } catch (err) {
      this.logger.error(
        `Failed to update material requisition ${id} in organization ${organizationId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }

    if (submit) this.workflow.notifySubmitted(organizationId, id, resubmitted);
    else if (change) this.workflow.notifyParticipantChange(organizationId, id, change, settled);
    return this.findOne(organizationId, id, actor);
  }

  /**
   * DRAFT → UNDER_REVIEW, or RETURNED → UNDER_REVIEW (a resubmission, which
   * starts a new review round). Every reviewer is emailed.
   */
  async submit(
    organizationId: string,
    id: string,
    actor: RequisitionActor,
  ): Promise<MaterialRequisitionResponseDto> {
    const mr = await this.mrRepo.findOne({ where: { id, organizationId, isDeleted: false } });
    if (!mr) throw new NotFoundException('Material requisition not found');
    if (mr.lockedAt) throw new ConflictException('This requisition is locked: a purchase order has been raised against it');
    if (!SUBMITTABLE_REQUISITION_STATUSES.includes(mr.status)) {
      throw new ConflictException('Only a draft or a returned requisition can be submitted for review');
    }
    const participants = await this.participantRepo.find({ where: { requisitionId: id } });
    if (!this.workflow.permissionsFor({ ...mr, participants } as MaterialRequisition, actor).canSubmit) {
      throw new ForbiddenException('You cannot submit this requisition');
    }

    const lineCount = await this.itemRepo.count({ where: { requisitionId: id } });
    const ros = mr.requiredOnSiteDate ? String(mr.requiredOnSiteDate).slice(0, 10) : null;
    this.assertRequiredOnSite(ros, true);
    this.assertSubmittable(mr.wbsCostCodeId, ros, lineCount);
    await this.assertProjectUsable(organizationId, mr.projectId);

    let resubmitted = false;
    await this.mrRepo.manager.transaction(async (manager) => {
      ({ resubmitted } = await this.workflow.startRound(manager, mr, actor));
      mr.updatedBy = actor.email;
      await manager.save(MaterialRequisition, mr);
    });

    this.workflow.notifySubmitted(organizationId, id, resubmitted);
    return this.findOne(organizationId, id, actor);
  }

  /**
   * Called by the purchase order module when a PO is raised: from then on the
   * requisition — and its project, client and WBS / cost code — cannot be edited.
   */
  async lockForPurchaseOrder(
    organizationId: string,
    id: string,
    purchaseOrderReference: string,
    actor: RequisitionActor,
  ): Promise<void> {
    const mr = await this.mrRepo.findOne({ where: { id, organizationId, isDeleted: false } });
    if (!mr) throw new NotFoundException('Material requisition not found');
    if (mr.status !== MaterialRequisitionStatus.APPROVED) {
      throw new ConflictException('A purchase order can only be raised against an approved requisition');
    }
    if (mr.lockedAt) return;
    mr.lockedAt = new Date();
    mr.lockedReason = `Purchase order ${purchaseOrderReference}`;
    mr.lockedBy = actor.email;
    await this.mrRepo.manager.transaction(async (manager) => {
      await this.workflow.ensureTrackingId(manager, mr);
      await manager.save(MaterialRequisition, mr);
      await this.tracking.record({
        organizationId,
        trackingId: mr.trackingId,
        entityType: WorkflowEntityType.MATERIAL_REQUISITION,
        entityId: mr.id,
        entityReference: mr.mrNumber,
        action: WorkflowAction.LOCKED,
        fromStatus: mr.status,
        toStatus: mr.status,
        actor: this.workflow.trackingActor(actor),
        comments: mr.lockedReason,
        metadata: { purchaseOrderReference },
      }, manager);
    });
  }

  /**
   * Hold, release, disable, re-enable or retire a submitted requisition.
   * Drafts are edited or deleted instead, so they never move here.
   */
  async changeStatus(
    organizationId: string,
    id: string,
    status: MaterialRequisitionStatus,
    actor: RequisitionActor,
  ): Promise<MaterialRequisitionResponseDto> {
    const mr = await this.mrRepo.findOne({ where: { id, organizationId, isDeleted: false } });
    if (!mr) throw new NotFoundException('Material requisition not found');
    if (mr.lockedAt) throw new ConflictException('This requisition is locked: a purchase order has been raised against it');

    if (!REQUISITION_STATUS_TRANSITIONS[mr.status].includes(status)) {
      throw new ConflictException(
        mr.status === MaterialRequisitionStatus.DRAFT
          ? 'A draft cannot change status. Submit it, or delete it.'
          : `A requisition that is ${mr.status} cannot be moved to ${status}.`,
      );
    }
    // Releasing a hold returns the requisition to exactly where it was held.
    if (mr.status === MaterialRequisitionStatus.ON_HOLD
      && status !== MaterialRequisitionStatus.DISABLED && status !== MaterialRequisitionStatus.OBSOLETE) {
      const back = mr.statusBeforeHold ?? MaterialRequisitionStatus.UNDER_REVIEW;
      if (status !== back) {
        throw new ConflictException(`This requisition was held while ${back}; releasing the hold returns it there.`);
      }
    }

    const fromStatus = mr.status;
    mr.statusBeforeHold = status === MaterialRequisitionStatus.ON_HOLD ? fromStatus : null;
    mr.status = status;
    mr.updatedBy = actor.email;
    await this.mrRepo.manager.transaction(async (manager) => {
      await this.workflow.ensureTrackingId(manager, mr);
      await manager.save(MaterialRequisition, mr);
      await this.tracking.record({
        organizationId,
        trackingId: mr.trackingId,
        entityType: WorkflowEntityType.MATERIAL_REQUISITION,
        entityId: mr.id,
        entityReference: mr.mrNumber,
        action: WorkflowAction.STATUS_CHANGED,
        fromStatus,
        toStatus: status,
        round: mr.reviewRound,
        actor: this.workflow.trackingActor(actor),
      }, manager);
    });
    this.logger.log(`Requisition ${mr.code} moved to ${status}`, MaterialRequisitionService.name);

    return this.findOne(organizationId, id, actor);
  }

  async remove(organizationId: string, id: string, deletedBy: string): Promise<void> {
    const mr = await this.findDraftOrThrow(organizationId, id);
    mr.isDeleted = true;
    mr.deletedAt = new Date();
    mr.deletedBy = deletedBy;
    await this.mrRepo.manager.transaction(async (manager) => {
      await this.workflow.ensureTrackingId(manager, mr);
      await manager.save(MaterialRequisition, mr);
      await this.tracking.record({
        organizationId,
        trackingId: mr.trackingId,
        entityType: WorkflowEntityType.MATERIAL_REQUISITION,
        entityId: mr.id,
        entityReference: mr.mrNumber,
        action: WorkflowAction.DELETED,
        fromStatus: mr.status,
        toStatus: 'DELETED',
        actor: { email: deletedBy, name: deletedBy },
      }, manager);
    });
  }

  // ── Documents ────────────────────────────────────────────────────

  async uploadDocument(
    organizationId: string,
    file: Express.Multer.File,
  ): Promise<{ message: string; url: string }> {
    try {
      await this.cloudStorageService.isFileValid(file);
      const url = await this.cloudStorageService.uploadFile(file, `pm/material-requisition/${organizationId}`);
      return { message: 'Document uploaded successfully', url };
    } catch (err) {
      this.logger.error(
        `Material requisition document upload failed for organization ${organizationId} (file: ${file?.originalname ?? 'unknown'}): ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  // ── Material sources ─────────────────────────────────────────────

  /** Material Master source: every active material, filtered and paged. */
  async searchMaterials(
    organizationId: string,
    query: RequisitionMaterialQueryDto,
  ): Promise<RequisitionCandidateListDto> {
    const { search, materialCategoryId, materialGroupId, unitOfMeasurementId, page = 1, limit = 25 } = query;

    const qb = this.materialRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.materialCategory', 'cat')
      .leftJoinAndSelect('m.materialGroup', 'grp')
      .leftJoinAndSelect('m.unitOfMeasurement', 'u')
      .where('m.organizationId = :organizationId', { organizationId })
      .andWhere('m.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('m.status = :active', { active: MaterialStatus.ACTIVE });

    if (materialCategoryId)  qb.andWhere('m.materialCategoryId = :materialCategoryId', { materialCategoryId });
    if (materialGroupId)     qb.andWhere('m.materialGroupId = :materialGroupId', { materialGroupId });
    if (unitOfMeasurementId) qb.andWhere('m.unitOfMeasurementId = :unitOfMeasurementId', { unitOfMeasurementId });

    const term = search?.trim();
    if (term) {
      const like = `%${term.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere('(LOWER(m.code) LIKE :like OR LOWER(m.shortDescription) LIKE :like)', { like });
    }

    qb.orderBy('m.code', 'ASC');
    const [rows, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();

    return {
      items: rows.map((m) => this.toCandidate(m, null)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Project source: materials already requisitioned on this project (or WBS). */
  async getProjectItems(
    organizationId: string,
    query: ProjectItemsQueryDto,
  ): Promise<RequisitionCandidateDto[]> {
    const qb = this.itemRepo
      .createQueryBuilder('i')
      .innerJoin('i.requisition', 'mr')
      .innerJoin('i.material', 'm')
      .leftJoin('m.materialCategory', 'cat')
      .leftJoin('m.materialGroup', 'grp')
      .leftJoin('m.unitOfMeasurement', 'u')
      .select('i.materialId', 'materialId')
      .addSelect('m.code', 'code')
      .addSelect('m.shortDescription', 'description')
      .addSelect('cat.name', 'categoryName')
      .addSelect('grp.name', 'groupName')
      .addSelect('u.symbol', 'uomSymbol')
      .addSelect('u.code', 'uomCode')
      .addSelect('SUM(i.requestedQty)', 'total')
      .where('mr.organizationId = :organizationId', { organizationId })
      .andWhere('mr.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('mr.projectId = :projectId', { projectId: query.projectId })
      .andWhere('mr.status NOT IN (:...excluded)', {
        excluded: [
          MaterialRequisitionStatus.CANCELLED, MaterialRequisitionStatus.REJECTED,
          MaterialRequisitionStatus.OBSOLETE, MaterialRequisitionStatus.DISABLED,
        ],
      })
      .andWhere('m.isDeleted = :materialDeleted', { materialDeleted: false })
      .andWhere('m.status = :active', { active: MaterialStatus.ACTIVE });

    if (query.wbsCostCodeId) qb.andWhere('mr.wbsCostCodeId = :wbsCostCodeId', { wbsCostCodeId: query.wbsCostCodeId });

    const rows = await qb
      .groupBy('i.materialId')
      .addGroupBy('m.code').addGroupBy('m.shortDescription')
      .addGroupBy('cat.name').addGroupBy('grp.name')
      .addGroupBy('u.symbol').addGroupBy('u.code')
      .orderBy('m.code', 'ASC')
      .getRawMany<{
        materialId: string; code: string; description: string; categoryName: string | null;
        groupName: string | null; uomSymbol: string | null; uomCode: string | null; total: string;
      }>();

    return rows.map((r) => ({
      materialId: r.materialId,
      code: r.code,
      description: r.description,
      categoryName: r.categoryName ?? null,
      groupName: r.groupName ?? null,
      uom: r.uomSymbol || r.uomCode || null,
      stockOnHand: 0,
      referenceQty: Number(r.total),
    }));
  }

  // ── BOM / MTO source ─────────────────────────────────────────────

  /** Step 1 of a BOM upload: the file's columns, with the likely ones guessed. */
  async getBomColumns(file: Express.Multer.File): Promise<BomColumnsDto> {
    const table = await this.readTable(file);
    const find = (re: RegExp) => table.headers.find((h) => re.test(h.trim()));

    return {
      columns: table.headers,
      rowCount: table.rows.length,
      sample: table.rows.slice(0, 5).map((r) => r.cells),
      suggested: {
        codeColumn: find(BOM_ALIASES.code),
        descriptionColumn: find(BOM_ALIASES.description),
        quantityColumn: find(BOM_ALIASES.quantity),
        uomColumn: find(BOM_ALIASES.uom),
      },
    };
  }

  /**
   * Step 2: matches each row's code to an active material of the Material
   * Master. Rows that cannot be used are reported, not silently dropped.
   */
  async previewBom(
    organizationId: string,
    file: Express.Multer.File,
    mapping: { codeColumn?: string; quantityColumn?: string },
  ): Promise<BomPreviewDto> {
    if (!mapping.codeColumn) throw new BadRequestException('Choose the column that holds the material code');
    if (!mapping.quantityColumn) throw new BadRequestException('Choose the column that holds the quantity');

    const table = await this.readTable(file);
    for (const column of [mapping.codeColumn, mapping.quantityColumn]) {
      if (!table.headers.includes(column)) throw new BadRequestException(`Column "${column}" is not in the file`);
    }

    const issues: BomRowIssueDto[] = [];
    const wanted: Array<{ rowNumber: number; code: string; qty: number }> = [];

    for (const row of table.rows) {
      const code = (row.cells[mapping.codeColumn] ?? '').trim();
      const rawQty = (row.cells[mapping.quantityColumn] ?? '').trim();
      if (!code && !rawQty) continue;
      if (!code) { issues.push({ rowNumber: row.rowNumber, code: null, reason: 'Material code is empty' }); continue; }

      const qty = Number(rawQty.replace(/,/g, ''));
      if (!rawQty || !Number.isFinite(qty) || qty <= 0) {
        issues.push({ rowNumber: row.rowNumber, code, reason: 'Quantity must be a number greater than 0' });
        continue;
      }
      wanted.push({ rowNumber: row.rowNumber, code, qty });
    }

    // One lookup for all codes, case-insensitively.
    const codes = [...new Set(wanted.map((w) => w.code.toLowerCase()))];
    const found = new Map<string, Material>();
    for (let i = 0; i < codes.length; i += 500) {
      const chunk = codes.slice(i, i + 500);
      const materials = await this.materialRepo
        .createQueryBuilder('m')
        .leftJoinAndSelect('m.materialCategory', 'cat')
        .leftJoinAndSelect('m.materialGroup', 'grp')
        .leftJoinAndSelect('m.unitOfMeasurement', 'u')
        .where('m.organizationId = :organizationId', { organizationId })
        .andWhere('m.isDeleted = :isDeleted', { isDeleted: false })
        .andWhere('m.status = :active', { active: MaterialStatus.ACTIVE })
        .andWhere('LOWER(m.code) IN (:...chunk)', { chunk })
        .getMany();
      materials.forEach((m) => found.set(m.code.toLowerCase(), m));
    }

    // A material listed on several rows becomes one line with the quantities added.
    const merged = new Map<string, RequisitionCandidateDto>();
    for (const w of wanted) {
      const material = found.get(w.code.toLowerCase());
      if (!material) {
        issues.push({
          rowNumber: w.rowNumber, code: w.code,
          reason: 'Not found in the Material Master, or the material is not active',
        });
        continue;
      }
      const existing = merged.get(material.id);
      if (existing) existing.referenceQty = (existing.referenceQty ?? 0) + w.qty;
      else merged.set(material.id, this.toCandidate(material, w.qty));
    }

    issues.sort((a, b) => a.rowNumber - b.rowNumber);
    return { matched: [...merged.values()], issues, totalRows: table.rows.length };
  }

  // ── Helpers: validation ──────────────────────────────────────────

  private async findEditableOrThrow(organizationId: string, id: string): Promise<MaterialRequisition> {
    const mr = await this.mrRepo.findOne({ where: { id, organizationId, isDeleted: false } });
    if (!mr) throw new NotFoundException('Material requisition not found');
    if (mr.lockedAt) {
      throw new ConflictException('This requisition is locked: a purchase order has been raised against it');
    }
    if (!EDITABLE_REQUISITION_STATUSES.includes(mr.status)) {
      throw new ConflictException(
        'Only a draft, a returned requisition, or one waiting for review or approval can be edited. An approved requisition is locked.',
      );
    }
    return mr;
  }

  private async findDraftOrThrow(organizationId: string, id: string): Promise<MaterialRequisition> {
    const mr = await this.mrRepo.findOne({ where: { id, organizationId, isDeleted: false } });
    if (!mr) throw new NotFoundException('Material requisition not found');
    if (mr.status !== MaterialRequisitionStatus.DRAFT) {
      throw new ConflictException(
        'Only a draft requisition can be changed. This one has already been submitted.',
      );
    }
    return mr;
  }

  private async assertProjectUsable(
    organizationId: string,
    projectId: string,
    actor?: RequisitionActor,
  ): Promise<void> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId, organizationId, isDeleted: false },
    });
    if (!project) throw new BadRequestException('Selected project was not found');
    // Only on a project the requester is mapped to (or manages / created).
    if (actor && this.projectAccess && !(await this.projectAccess.canSee(organizationId, project, {
      userId: actor.userId, email: actor.email, role: actor.role,
    }))) {
      throw new BadRequestException('Selected project was not found');
    }
    if (!OPEN_PROJECT_STATUSES.includes(project.status)) {
      throw new BadRequestException('Selected project is closed (completed or cancelled)');
    }
  }

  private async assertWbsBelongsToProject(
    organizationId: string,
    wbsCostCodeId: string,
    projectId: string,
  ): Promise<void> {
    const wbs = await this.wbsRepo.findOne({
      where: { id: wbsCostCodeId, organizationId, isDeleted: false },
    });
    if (!wbs) throw new BadRequestException('Selected WBS / cost code was not found');
    if (wbs.projectId !== projectId) {
      throw new BadRequestException('Selected WBS / cost code does not belong to the chosen project');
    }
    if (!wbs.isActive) throw new BadRequestException('Selected WBS / cost code is inactive');
  }

  private assertRequiredOnSite(ros: string | null, submitting: boolean): void {
    if (!ros) return;
    const parsed = new Date(`${ros}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== ros) {
      throw new BadRequestException('Required on site is not a valid date');
    }
    // A draft may carry an old date; one being submitted must still be useful.
    if (submitting && ros < new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('Required on site date cannot be in the past');
    }
  }

  private assertSubmittable(wbsCostCodeId: string | null, ros: string | null, lineCount: number): void {
    const missing: string[] = [];
    if (!wbsCostCodeId) missing.push('a WBS / cost code');
    if (!ros) missing.push('the required-on-site date');
    if (lineCount === 0) missing.push('at least one material with a quantity');
    if (missing.length) {
      throw new BadRequestException(`A requisition needs ${missing.join(', ')} before it can be submitted`);
    }
  }

  // ── Helpers: lines and documents ─────────────────────────────────

  /**
   * Validates the lines and snapshots each material. Lines without a quantity
   * (empty or 0) are dropped — the requisition only holds what is requested.
   */
  private async resolveLines(
    organizationId: string,
    items: RequisitionItemDto[],
  ): Promise<ResolvedLine[]> {
    const requested = items.filter((i) => Number(i.requestedQty ?? 0) > 0);
    if (requested.length === 0) return [];

    const seen = new Set<string>();
    for (const item of requested) {
      if (seen.has(item.materialId)) {
        throw new BadRequestException('A material is listed more than once; combine its quantities into one line');
      }
      seen.add(item.materialId);
    }

    const materials = await this.materialRepo.find({
      where: { id: In([...seen]), organizationId, isDeleted: false },
      relations: { unitOfMeasurement: true },
    });
    const byId = new Map(materials.map((m) => [m.id, m]));

    const problems: string[] = [];
    for (const item of requested) {
      const m = byId.get(item.materialId);
      if (!m) problems.push('a selected material was not found');
      else if (m.status !== MaterialStatus.ACTIVE) problems.push(`${m.code} is not active`);
    }
    if (problems.length) {
      throw new BadRequestException(`Cannot request: ${[...new Set(problems)].join('; ')}`);
    }

    return requested.map((item, index) => {
      const m = byId.get(item.materialId)!;
      return {
        materialId: m.id,
        materialCode: m.code,
        materialDescription: m.shortDescription,
        uom: m.unitOfMeasurement?.symbol || m.unitOfMeasurement?.code || null,
        requestedQty: Number(item.requestedQty),
        source: item.source ?? RequisitionLineSource.MATERIAL_MASTER,
        sourceReference: item.sourceReference?.trim() || null,
        lineNumber: index + 1,
      };
    });
  }

  /** One covering document at most; a later one replaces an earlier one. */
  private resolveDocuments(documents: RequisitionDocumentDto[]): RequisitionDocumentDto[] {
    const covering = documents.filter((d) => d.documentType === 'COVERING_DOCUMENT');
    const others = documents.filter((d) => d.documentType !== 'COVERING_DOCUMENT');
    return covering.length ? [...others, covering[covering.length - 1]] : others;
  }

  private async writeChildren(
    manager: Repository<MaterialRequisition>['manager'],
    header: MaterialRequisition,
    lines: ResolvedLine[],
    documents: RequisitionDocumentDto[],
    userEmail: string,
  ): Promise<void> {
    for (const line of lines) {
      await manager.save(
        MaterialRequisitionItem,
        manager.create(MaterialRequisitionItem, {
          ...line,
          organizationId: header.organizationId,
          requisitionId: header.id,
        }),
      );
    }
    for (const doc of documents) {
      await manager.save(
        MaterialRequisitionDocument,
        manager.create(MaterialRequisitionDocument, {
          organizationId: header.organizationId,
          requisitionId: header.id,
          documentType: doc.documentType,
          documentName: doc.documentName.trim(),
          documentUrl: doc.documentUrl,
          fileName: doc.fileName ?? null,
          mimeType: doc.mimeType ?? null,
          fileSizeBytes: doc.fileSizeBytes ?? null,
          uploadedBy: userEmail,
        }),
      );
    }
  }

  private async replaceChildren(
    manager: Repository<MaterialRequisition>['manager'],
    header: MaterialRequisition,
    lines: ResolvedLine[] | null,
    documents: RequisitionDocumentDto[] | null,
    userEmail: string,
  ): Promise<void> {
    if (lines) await manager.delete(MaterialRequisitionItem, { requisitionId: header.id });
    if (documents) await manager.delete(MaterialRequisitionDocument, { requisitionId: header.id });
    await this.writeChildren(manager, header, lines ?? [], documents ?? [], userEmail);
  }

  // ── Helpers: files ───────────────────────────────────────────────

  private async readTable(file: Express.Multer.File): Promise<ParsedTable> {
    if (!file?.buffer) throw new BadRequestException('No file provided');
    if (file.size > BOM_MAX_BYTES) throw new BadRequestException('The file is larger than 5 MB');

    const name = (file.originalname ?? '').toLowerCase();
    const isXlsx = name.endsWith('.xlsx');
    if (!isXlsx && !name.endsWith('.csv')) {
      throw new BadRequestException('Unsupported file type. Use .xlsx or .csv');
    }

    const workbook = new ExcelJS.Workbook();
    const stream = Readable.from(file.buffer);
    try {
      if (isXlsx) await workbook.xlsx.read(stream);
      else await workbook.csv.read(stream);
    } catch (err: any) {
      throw new BadRequestException(`Unable to read the file: ${err?.message ?? 'unsupported or corrupt file'}`);
    } finally {
      stream.destroy();
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('The file has no data');

    const headers: string[] = [];
    let headerRowNumber = 0;
    sheet.eachRow((row, rowNumber) => {
      if (headerRowNumber) return;
      const values = row.values as unknown[];
      if (!values.some((v) => v !== null && v !== undefined && String(v).trim() !== '')) return;
      headerRowNumber = rowNumber;
      const seen = new Set<string>();
      for (let c = 1; c <= row.cellCount; c++) {
        let h = row.getCell(c).text?.trim() || `Column ${c}`;
        while (seen.has(h)) h = `${h} (${c})`;
        seen.add(h);
        headers.push(h);
      }
    });
    if (!headerRowNumber) throw new BadRequestException('The file has no header row');

    const rows: ParsedTable['rows'] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return;
      const cells: Record<string, string> = {};
      let any = false;
      headers.forEach((h, i) => {
        const text = row.getCell(i + 1).text?.trim() ?? '';
        if (text) any = true;
        cells[h] = text;
      });
      if (any) rows.push({ rowNumber, cells });
    });

    if (rows.length > BOM_MAX_ROWS) {
      throw new BadRequestException(`The file has more than ${BOM_MAX_ROWS} rows`);
    }
    return { headers, rows };
  }

  // ── Helpers: mapping ─────────────────────────────────────────────

  private toColumns(dto: Partial<CreateMaterialRequisitionDto>): Partial<MaterialRequisition> {
    const out: Record<string, unknown> = {};
    const source = dto as Record<string, unknown>;
    for (const key of TEXT_FIELDS) {
      const value = source[key];
      if (value === undefined) continue;
      out[key] = typeof value === 'string' ? value.trim() || null : value;
    }
    return out as Partial<MaterialRequisition>;
  }

  /** Loads the reviewers and approvers of a page of requisitions in one query. */
  private async attachParticipants(rows: MaterialRequisition[]): Promise<void> {
    if (!rows.length) return;
    const all = await this.participantRepo.find({
      where: { requisitionId: In(rows.map((r) => r.id)) },
      order: { sequence: 'ASC' },
    });
    for (const r of rows) r.participants = all.filter((p) => p.requisitionId === r.id);
  }

  private async countItems(ids: string[]): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();
    const rows = await this.itemRepo
      .createQueryBuilder('i')
      .select('i.requisitionId', 'id')
      .addSelect('COUNT(*)', 'n')
      .where('i.requisitionId IN (:...ids)', { ids })
      .groupBy('i.requisitionId')
      .getRawMany<{ id: string; n: string }>();
    return new Map(rows.map((r) => [r.id, Number(r.n)]));
  }

  private dateOnly(value: string | Date | null | undefined): string | null {
    if (!value) return null;
    return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  }

  private toCandidate(m: Material, referenceQty: number | null): RequisitionCandidateDto {
    return {
      materialId: m.id,
      code: m.code,
      description: m.shortDescription,
      categoryName: m.materialCategory?.name ?? null,
      groupName: m.materialGroup?.name ?? null,
      uom: m.unitOfMeasurement?.symbol || m.unitOfMeasurement?.code || null,
      stockOnHand: 0,
      referenceQty,
    };
  }

  private toListItem(mr: MaterialRequisition, itemCount: number): MaterialRequisitionListItemDto {
    return {
      id: mr.id,
      code: mr.code,
      mrNumber: mr.mrNumber,
      status: mr.status,
      projectId: mr.projectId,
      projectCode: mr.project?.code ?? null,
      projectName: mr.project?.projectName ?? null,
      clientCode: mr.project?.client?.code ?? null,
      clientName: mr.project?.client?.clientName ?? null,
      wbsCostCodeId: mr.wbsCostCodeId ?? null,
      wbsName: mr.wbsCostCode?.projectDetails ?? null,
      budgetHead: mr.budgetHead ?? null,
      requiredOnSiteDate: this.dateOnly(mr.requiredOnSiteDate),
      itemCount,
      reviewers: this.summarise(mr, RequisitionParticipantRole.REVIEWER),
      approvers: this.summarise(mr, RequisitionParticipantRole.APPROVER),
      trackingId: mr.trackingId ?? null,
      reviewRound: Number(mr.reviewRound ?? 0),
      reviewedAt: mr.reviewedAt ?? null,
      approvedAt: mr.approvedAt ?? null,
      statusBeforeHold: mr.statusBeforeHold ?? null,
      lockedAt: mr.lockedAt ?? null,
      lockedReason: mr.lockedReason ?? null,
      submittedBy: mr.submittedBy ?? null,
      submittedAt: mr.submittedAt ?? null,
      createdBy: mr.createdBy ?? null,
      createdAt: mr.createdAt,
      updatedAt: mr.updatedAt,
    };
  }

  private summarise(mr: MaterialRequisition, role: RequisitionParticipantRole): RequisitionParticipantSummaryDto[] {
    return (mr.participants ?? [])
      .filter((p) => p.role === role)
      .sort((a, b) => a.sequence - b.sequence)
      .map((p) => ({ userId: p.userId, name: p.userName, decision: p.decision ?? null }));
  }

  private toWbs(w: WbsCostCode | null | undefined): RequisitionWbsDto | null {
    if (!w) return null;
    return {
      id: w.id,
      code: w.code,
      name: w.projectDetails,
      areaFacility: w.areaFacility ?? null,
      systemSubsystem: w.systemSubsystem ?? null,
      disciplineName: w.discipline?.name ?? null,
      departmentName: w.discipline?.department?.name ?? null,
      workPackage: w.workPackage ?? null,
      activities: w.activities ?? null,
    };
  }

  private toResponse(
    mr: MaterialRequisition,
    history: WorkflowEventResponseDto[] = [],
    permissions: RequisitionPermissionsDto | null = null,
  ): MaterialRequisitionResponseDto {
    const participants: RequisitionParticipantResponseDto[] = [...(mr.participants ?? [])]
      .sort((a, b) => (a.role === b.role ? a.sequence - b.sequence : a.role.localeCompare(b.role)))
      .map((p) => ({
        id: p.id,
        role: p.role,
        userId: p.userId,
        userName: p.userName,
        userEmail: p.userEmail,
        sequence: p.sequence,
        decision: p.decision ?? null,
        decisionComments: p.decisionComments ?? null,
        decidedAt: p.decidedAt ?? null,
        editedInRound: !!p.editedInRound,
      }));
    const items: RequisitionItemResponseDto[] = (mr.items ?? []).map((i) => ({
      id: i.id,
      lineNumber: i.lineNumber,
      materialId: i.materialId,
      materialCode: i.materialCode,
      materialDescription: i.materialDescription,
      uom: i.uom ?? null,
      requestedQty: Number(i.requestedQty),
      stockOnHand: 0,
      source: i.source,
      sourceReference: i.sourceReference ?? null,
    }));
    const documents: RequisitionDocumentResponseDto[] = (mr.documents ?? []).map((d) => ({
      id: d.id,
      documentType: d.documentType,
      documentName: d.documentName,
      documentUrl: d.documentUrl,
      fileName: d.fileName ?? null,
      mimeType: d.mimeType ?? null,
      fileSizeBytes: d.fileSizeBytes != null ? Number(d.fileSizeBytes) : null,
      uploadedBy: d.uploadedBy ?? null,
      uploadedAt: d.uploadedAt,
    }));

    return {
      ...this.toListItem(mr, items.length),
      dguid: mr.dguid,
      organizationId: mr.organizationId,
      wbs: this.toWbs(mr.wbsCostCode),
      mtoReference: mr.mtoReference ?? null,
      pidReference: mr.pidReference ?? null,
      isometricReference: mr.isometricReference ?? null,
      areaUnit: mr.areaUnit ?? null,
      remarks: mr.remarks ?? null,
      items,
      documents,
      participants,
      history,
      permissions,
      updatedBy: mr.updatedBy ?? null,
    };
  }
}

interface ResolvedLine {
  materialId: string;
  materialCode: string;
  materialDescription: string;
  uom: string | null;
  requestedQty: number;
  source: RequisitionLineSource;
  sourceReference: string | null;
  lineNumber: number;
}

interface ParsedTable {
  headers: string[];
  rows: Array<{ rowNumber: number; cells: Record<string, string> }>;
}
