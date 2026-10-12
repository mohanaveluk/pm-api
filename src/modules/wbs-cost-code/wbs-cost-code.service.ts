import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { WbsCostCode } from './entity/wbs-cost-code.entity';
import { Discipline } from '../discipline/entity/discipline.entity';
import { Project } from '../project/entities/project.entity';
import { OPEN_PROJECT_STATUSES } from '../project/enums/project.enums';
import {
  MasterCodeService,
  MasterSequenceKey,
} from 'src/common/services/master-code.service';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { CreateWbsCostCodeDto } from './dto/create-wbs-cost-code.dto';
import { UpdateWbsCostCodeDto } from './dto/update-wbs-cost-code.dto';
import { WbsCostCodeQueryDto } from './dto/wbs-cost-code-query.dto';
import { WbsCostCodeListResponseDto, WbsCostCodeResponseDto } from './dto/wbs-cost-code-response.dto';

// Whitelist of sortBy value → query-builder column. Anything not listed falls
// back to `code`, so a caller can never inject a column expression.
const SORT_COLUMNS: Record<string, string> = {
  code:            'w.code',
  projectDetails:  'w.projectDetails',
  areaFacility:    'w.areaFacility',
  systemSubsystem: 'w.systemSubsystem',
  discipline:      'disc.name',
  project:         'prj.code',
  workPackage:     'w.workPackage',
  createdAt:       'w.createdAt',
};

// Free-text fields that are trimmed on the way in; blank becomes null so the
// column never holds an empty string.
const TEXT_FIELDS = ['areaFacility', 'systemSubsystem', 'workPackage', 'activities'] as const;

@Injectable()
export class WbsCostCodeService {
  constructor(
    @InjectRepository(WbsCostCode)
    private readonly repo: Repository<WbsCostCode>,
    @InjectRepository(Discipline)
    private readonly discRepo: Repository<Discipline>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly masterCodeService: MasterCodeService,
    private readonly logger: CustomLoggerService,
  ) {}

  async create(
    organizationId: string,
    dto: CreateWbsCostCodeDto,
    createdBy: string,
  ): Promise<WbsCostCodeResponseDto> {
    if (dto.disciplineId) await this.assertDisciplineSelectable(organizationId, dto.disciplineId);
    if (dto.projectId) await this.assertProjectSelectable(organizationId, dto.projectId);

    // code is server-generated: a per-organization sequence starting at 0001.
    // Generation and insert share one transaction, under a row lock on the
    // counter, so concurrent creates cannot be handed the same number.
    const saved = await this.masterCodeService.withGeneratedCode(
      organizationId,
      MasterSequenceKey.WBS_COST_CODE,
      async (code, queryRunner) => {
        const row = queryRunner.manager.create(WbsCostCode, {
          ...this.normalise(dto),
          dguid: uuidv4(),
          organizationId,
          code,
          isActive: dto.isActive ?? true,
          createdBy,
        });
        return queryRunner.manager.save(WbsCostCode, row);
      },
    ).catch(err => {
      this.logger.error(
        `Failed to create WBS / cost code "${dto.projectDetails}" in organization ${organizationId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
      if (err?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'A WBS / Cost Code with this code already exists in your organization',
        );
      }
      throw err;
    });

    return this.findOne(organizationId, saved.id);
  }

  async findAll(
    organizationId: string,
    query: WbsCostCodeQueryDto,
  ): Promise<WbsCostCodeListResponseDto> {
    const {
      search, isActive, disciplineId, page = 1, limit = 20,
      sortBy = 'code', sortOrder = 'ASC',
    } = query;

    const qb = this.repo
      .createQueryBuilder('w')
      .leftJoinAndSelect('w.discipline', 'disc')
      .leftJoinAndSelect('disc.department', 'dept')
      .leftJoinAndSelect('w.project', 'prj')
      .leftJoinAndSelect('prj.client', 'cli')
      .where('w.organizationId = :organizationId', { organizationId })
      .andWhere('w.isDeleted = :isDeleted', { isDeleted: false });

    if (isActive !== undefined) qb.andWhere('w.isActive = :isActive', { isActive });
    if (disciplineId)           qb.andWhere('w.disciplineId = :disciplineId', { disciplineId });

    const term = search?.trim();
    if (term) {
      // Escape LIKE wildcards so a search for "50%" matches literally.
      const like = `%${term.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere(
        '(LOWER(w.code) LIKE :like OR LOWER(w.projectDetails) LIKE :like ' +
        'OR LOWER(w.areaFacility) LIKE :like OR LOWER(w.systemSubsystem) LIKE :like ' +
        'OR LOWER(w.workPackage) LIKE :like OR LOWER(w.activities) LIKE :like ' +
        'OR LOWER(disc.name) LIKE :like ' +
        'OR LOWER(prj.code) LIKE :like OR LOWER(prj.projectName) LIKE :like ' +
        'OR LOWER(cli.clientName) LIKE :like)',
        { like },
      );
    }

    const sortColumn = SORT_COLUMNS[sortBy] ?? SORT_COLUMNS.code;
    const direction: 'ASC' | 'DESC' = sortOrder === 'DESC' ? 'DESC' : 'ASC';
    qb.orderBy(sortColumn, direction);
    // Stable paging when the primary sort column has ties.
    if (sortColumn !== SORT_COLUMNS.code) qb.addOrderBy(SORT_COLUMNS.code, 'ASC');

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(w => this.toResponse(w)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(organizationId: string, id: string): Promise<WbsCostCodeResponseDto> {
    const row = await this.findActiveOrThrow(organizationId, id);
    return this.toResponse(row);
  }

  async findActive(organizationId: string, projectId?: string): Promise<WbsCostCodeResponseDto[]> {
    const items = await this.repo.find({
      where: { organizationId, isActive: true, isDeleted: false, ...(projectId ? { projectId } : {}) },
      relations: { discipline: { department: true }, project: { client: true } },
      order: { code: 'ASC' },
    });
    return items.map(w => this.toResponse(w));
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateWbsCostCodeDto,
    updatedBy: string,
  ): Promise<WbsCostCodeResponseDto> {
    // Loaded without the discipline relation on purpose: with a stale
    // `discipline` object on the entity, TypeORM would write that relation's
    // id back over a newly assigned disciplineId.
    const row = await this.findActiveOrThrow(organizationId, id, false);

    // code is server-generated and immutable — the DTO does not carry it, but
    // guard here in case a caller bypasses DTO validation.
    if ((dto as any).code !== undefined) {
      throw new ConflictException('WBS / Cost Code code is server-generated and cannot be changed');
    }

    // Only a *changed* discipline must be selectable: a row may legitimately
    // keep a discipline that has since been deactivated.
    if (dto.disciplineId && dto.disciplineId !== row.disciplineId) {
      await this.assertDisciplineSelectable(organizationId, dto.disciplineId);
    }
    // Same for the project: an entry keeps a project that has since closed.
    if (dto.projectId && dto.projectId !== row.projectId) {
      await this.assertProjectSelectable(organizationId, dto.projectId);
    }

    Object.assign(row, this.normalise(dto));
    row.updatedBy = updatedBy;

    try {
      await this.repo.save(row);
    } catch (err) {
      this.logger.error(
        `Failed to update WBS / cost code ${id} in organization ${organizationId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }

    return this.findOne(organizationId, id);
  }

  async remove(organizationId: string, id: string, deletedBy: string): Promise<void> {
    const row = await this.findActiveOrThrow(organizationId, id, false);

    row.isDeleted = true;
    row.deletedAt = new Date();
    row.deletedBy = deletedBy;
    row.isActive = false;

    await this.repo.save(row);
  }

  // ── helpers ──────────────────────────────────────────────────────

  private async findActiveOrThrow(
    organizationId: string,
    id: string,
    withDiscipline = true,
  ): Promise<WbsCostCode> {
    const row = await this.repo.findOne({
      where: { id, organizationId, isDeleted: false },
      relations: withDiscipline
        ? { discipline: { department: true }, project: { client: true } }
        : undefined,
    });
    if (!row) throw new NotFoundException('WBS / Cost Code not found');
    return row;
  }

  // A 400 rather than 404: the *request body* names something that does not
  // exist (or is not selectable), the addressed WBS / cost code itself is fine.
  private async assertDisciplineSelectable(organizationId: string, disciplineId: string): Promise<void> {
    const discipline = await this.discRepo.findOne({
      where: { id: disciplineId, organizationId, isDeleted: false },
    });
    if (!discipline) throw new BadRequestException('Selected discipline was not found');
    if (!discipline.isActive) throw new BadRequestException('Selected discipline is inactive');
  }

  // Same 400-not-404 reasoning as the discipline. Only an open project can take
  // new work — a completed or cancelled one is closed.
  private async assertProjectSelectable(organizationId: string, projectId: string): Promise<void> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId, organizationId, isDeleted: false },
    });
    if (!project) throw new BadRequestException('Selected project was not found');
    if (!OPEN_PROJECT_STATUSES.includes(project.status)) {
      throw new BadRequestException('Selected project is closed (completed or cancelled)');
    }
  }

  // Trims text and turns blank values into null. Keys the caller did not send
  // are left out entirely so an update never wipes them by accident.
  private normalise(dto: Partial<CreateWbsCostCodeDto>): Partial<CreateWbsCostCodeDto> {
    const out: Record<string, unknown> = { ...dto };
    if (typeof dto.projectDetails === 'string') out.projectDetails = dto.projectDetails.trim();
    for (const field of TEXT_FIELDS) {
      const value = dto[field];
      if (typeof value === 'string') out[field] = value.trim() || null;
    }
    return out as Partial<CreateWbsCostCodeDto>;
  }

  private toResponse(w: WbsCostCode): WbsCostCodeResponseDto {
    return {
      id:              w.id,
      dguid:           w.dguid,
      organizationId:  w.organizationId,
      code:            w.code,
      projectDetails:  w.projectDetails,
      areaFacility:    w.areaFacility ?? null,
      systemSubsystem: w.systemSubsystem ?? null,
      disciplineId:    w.disciplineId ?? null,
      // Optional-chained: the discipline relation is only present when loaded.
      disciplineName:  w.discipline?.name ?? null,
      departmentName:  w.discipline?.department?.name ?? null,
      projectId:       w.projectId ?? null,
      // Always read through the relationship, never stored here.
      projectCode:     w.project?.code ?? null,
      projectName:     w.project?.projectName ?? null,
      clientId:        w.project?.clientId ?? null,
      clientCode:      w.project?.client?.code ?? null,
      clientName:      w.project?.client?.clientName ?? null,
      discipline:      w.disciplineId
        ? { id: w.disciplineId, name: w.discipline?.name, code: w.discipline?.code }
        : null,
      workPackage:     w.workPackage ?? null,
      activities:      w.activities ?? null,
      isActive:        w.isActive,
      createdBy:       w.createdBy,
      updatedBy:       w.updatedBy,
      createdAt:       w.createdAt,
      updatedAt:       w.updatedAt,
    };
  }
}
