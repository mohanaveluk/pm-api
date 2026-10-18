import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MasterCodeService, MasterSequenceKey } from 'src/common/services/master-code.service';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { WorkflowLockService } from '../workflow-tracking/workflow-lock.service';
import { Client } from '../client/entities/client.entity';
import { ClientContact } from '../client/entities/client-contact.entity';
import { ProjectType } from '../project-type/entity/project-type.entity';
import { User } from '../user/entity/user.entity';
import { Project } from './entities/project.entity';
import {
  DELETABLE_PROJECT_STATUSES, OPEN_PROJECT_STATUSES, PROJECT_STATUS_TRANSITIONS, ProjectStatus,
} from './enums/project.enums';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto, UpdateProjectStatusDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import {
  ProjectListResponseDto, ProjectManagerOptionDto, ProjectOptionDto, ProjectResponseDto,
  ProjectSummaryResponseDto,
} from './dto/project-response.dto';

// Whitelist of sortBy value → query-builder column. Anything else falls back to
// createdAt, so a caller can never inject a column expression.
const SORT_COLUMNS: Record<string, string> = {
  code:        'p.code',
  projectName: 'p.projectName',
  client:      'cl.clientName',
  projectType: 'pt.name',
  status:      'p.status',
  startDate:   'p.startDate',
  endDate:     'p.endDate',
  createdAt:   'p.createdAt',
  updatedAt:   'p.updatedAt',
};

// Text columns: trimmed on the way in, blank stored as null.
const TEXT_FIELDS = [
  'description', 'siteLocation', 'addressLine1', 'city', 'state', 'postalCode',
  'contractNumber', 'clientProjectReference', 'timeZone',
] as const;

const DAY_MS = 86_400_000;

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)     private readonly projectRepo: Repository<Project>,
    @InjectRepository(Client)      private readonly clientRepo: Repository<Client>,
    @InjectRepository(ClientContact) private readonly contactRepo: Repository<ClientContact>,
    @InjectRepository(ProjectType) private readonly typeRepo: Repository<ProjectType>,
    @InjectRepository(User)        private readonly userRepo: Repository<User>,
    private readonly masterCodeService: MasterCodeService,
    private readonly logger: CustomLoggerService,
    private readonly workflowLock: WorkflowLockService,
  ) {}

  // ── Create ───────────────────────────────────────────────────────

  async create(
    organizationId: string,
    dto: CreateProjectDto,
    createdBy: string,
  ): Promise<ProjectResponseDto> {
    this.assertName(dto.projectName);
    this.assertDates(dto.startDate, dto.endDate ?? null);

    // The client must exist in this organization and be active — a project is
    // not started for a client that has been deactivated.
    await this.assertClientUsable(organizationId, dto.clientId);
    await this.assertProjectTypeUsable(organizationId, dto.projectTypeId);
    if (dto.projectManagerId) await this.assertManagerUsable(organizationId, dto.projectManagerId);

    // code is server-generated: a per-organization sequence starting at 0001.
    // Generation and insert share one transaction, under a row lock on the
    // counter, so concurrent creates cannot be handed the same number.
    const saved = await this.masterCodeService.withGeneratedCode(
      organizationId,
      MasterSequenceKey.PROJECT,
      async (code, queryRunner) => {
        const row = queryRunner.manager.create(Project, {
          ...this.toColumns(dto),
          dguid: uuidv4(),
          organizationId,
          code,
          projectName: dto.projectName.trim(),
          clientId: dto.clientId,
          projectTypeId: dto.projectTypeId,
          startDate: dto.startDate,
          status: dto.status ?? ProjectStatus.PLANNED,
          createdBy,
        });
        return queryRunner.manager.save(Project, row);
      },
    ).catch((err) => {
      this.logger.error(
        `Failed to create project "${dto.projectName}" in organization ${organizationId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
      if ((err as { code?: string })?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('A project with this number already exists in your organization');
      }
      throw err;
    });

    return this.findOne(organizationId, saved.id);
  }

  // ── Read ─────────────────────────────────────────────────────────

  async findAll(organizationId: string, query: ProjectQueryDto): Promise<ProjectListResponseDto> {
    const {
      search, status, clientId, projectTypeId, projectManagerId, countryCode,
      page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC',
    } = query;

    const qb = this.projectRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.client', 'cl')
      .leftJoinAndSelect('p.projectType', 'pt')
      .leftJoinAndSelect('p.projectManager', 'pm')
      .where('p.organizationId = :organizationId', { organizationId })
      .andWhere('p.isDeleted = :isDeleted', { isDeleted: false });

    if (status)           qb.andWhere('p.status = :status', { status });
    if (clientId)         qb.andWhere('p.clientId = :clientId', { clientId });
    if (projectTypeId)    qb.andWhere('p.projectTypeId = :projectTypeId', { projectTypeId });
    if (projectManagerId) qb.andWhere('p.projectManagerId = :projectManagerId', { projectManagerId });
    if (countryCode)      qb.andWhere('p.countryCode = :countryCode', { countryCode: countryCode.toUpperCase() });

    const term = search?.trim();
    if (term) {
      // Escape LIKE wildcards so a search for "50%" matches literally.
      const like = `%${term.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere(
        '(LOWER(p.code) LIKE :like OR LOWER(p.projectName) LIKE :like ' +
        'OR LOWER(cl.code) LIKE :like OR LOWER(cl.clientName) LIKE :like OR LOWER(cl.displayName) LIKE :like ' +
        'OR LOWER(p.contractNumber) LIKE :like OR LOWER(p.clientProjectReference) LIKE :like ' +
        'OR LOWER(p.siteLocation) LIKE :like)',
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
      items: items.map((p) => this.toResponse(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(organizationId: string, id: string): Promise<ProjectResponseDto> {
    return this.toResponse(await this.findEntityOrThrow(organizationId, id));
  }

  /** Open projects (planned, active, on hold) for dropdowns in other masters. */
  async findActive(organizationId: string): Promise<ProjectOptionDto[]> {
    const rows = await this.projectRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.client', 'cl')
      .where('p.organizationId = :organizationId', { organizationId })
      .andWhere('p.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('p.status IN (:...open)', { open: OPEN_PROJECT_STATUSES })
      .orderBy('p.code', 'ASC')
      .getMany();

    return rows.map((p) => ({
      id: p.id,
      code: p.code,
      projectName: p.projectName,
      clientId: p.clientId,
      clientCode: p.client?.code ?? null,
      clientName: p.client?.clientName ?? null,
      status: p.status,
      currencyCode: p.currencyCode ?? null,
    }));
  }

  /** Internal, active staff that can own a project. */
  async findProjectManagers(organizationId: string): Promise<ProjectManagerOptionDto[]> {
    const users = await this.userRepo.find({
      where: { organizationId, is_internal: 1, is_active: 1, is_deleted: false },
      order: { first_name: 'ASC', last_name: 'ASC' },
    });
    return users.map((u) => ({ id: u.id, name: this.userName(u), email: u.email }));
  }

  /** The project together with the master data it points at. */
  async getSummary(organizationId: string, id: string): Promise<ProjectSummaryResponseDto> {
    const project = await this.findEntityOrThrow(organizationId, id);
    const client = project.client;

    const primary = await this.contactRepo.findOne({
      where: { clientId: project.clientId, isPrimary: true, isActive: true, isDeleted: false },
    });

    return {
      project: this.toResponse(project),
      client: {
        id: client.id,
        code: client.code,
        clientName: client.clientName,
        displayName: client.displayName ?? null,
        clientTypeName: client.clientType?.name ?? null,
        industryCategoryName: client.industryCategory?.name ?? null,
        countryCode: client.countryCode ?? null,
        status: client.status,
        defaultCurrencyCode: client.defaultCurrencyCode ?? null,
        primaryContactName: primary?.contactName ?? null,
        primaryContactEmail: primary?.email ?? null,
        primaryContactPhone: primary?.mobile ?? primary?.phone ?? null,
      },
      schedule: this.scheduleOf(project),
      allowedStatuses: [...PROJECT_STATUS_TRANSITIONS[project.status]],
    };
  }

  // ── Update ───────────────────────────────────────────────────────

  async update(
    organizationId: string,
    id: string,
    dto: UpdateProjectDto,
    updatedBy: string,
  ): Promise<ProjectResponseDto> {
    // Frozen once a purchase order is raised against a requisition for this project.
    await this.workflowLock.assertProjectEditable(organizationId, id);
    // The number is server-generated and immutable, and status has its own
    // endpoint — neither has a field in the DTO, but guard against a caller
    // that bypasses validation.
    if ((dto as { code?: unknown }).code !== undefined) {
      throw new ConflictException('Project number is server-generated and cannot be changed');
    }
    if ((dto as { status?: unknown }).status !== undefined) {
      throw new ConflictException('Use PATCH /projects/:id/status to change the status');
    }

    const project = await this.findEntityOrThrow(organizationId, id, false);

    if (dto.projectName !== undefined) this.assertName(dto.projectName);

    // Dates are checked as they will stand after the update, so moving only the
    // start date past an unchanged end date is caught too.
    const startDate = dto.startDate ?? project.startDate;
    const endDate = dto.endDate !== undefined ? dto.endDate : project.endDate;
    this.assertDates(startDate, endDate);

    // Only a *changed* reference must be usable: a project keeps its client even
    // if that client has since been deactivated.
    if (dto.clientId && dto.clientId !== project.clientId) {
      await this.assertClientUsable(organizationId, dto.clientId);
    }
    if (dto.projectTypeId && dto.projectTypeId !== project.projectTypeId) {
      await this.assertProjectTypeUsable(organizationId, dto.projectTypeId);
    }
    if (dto.projectManagerId && dto.projectManagerId !== project.projectManagerId) {
      await this.assertManagerUsable(organizationId, dto.projectManagerId);
    }

    Object.assign(project, this.toColumns(dto));
    if (dto.projectName !== undefined) project.projectName = dto.projectName.trim();
    if (dto.clientId) project.clientId = dto.clientId;
    if (dto.projectTypeId) project.projectTypeId = dto.projectTypeId;
    if (dto.startDate) project.startDate = dto.startDate;
    project.updatedBy = updatedBy;

    try {
      await this.projectRepo.save(project);
    } catch (err) {
      this.logger.error(
        `Failed to update project ${id} in organization ${organizationId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }

    return this.findOne(organizationId, id);
  }

  async updateStatus(
    organizationId: string,
    id: string,
    dto: UpdateProjectStatusDto,
    updatedBy: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.findEntityOrThrow(organizationId, id, false);

    if (project.status === dto.status) {
      throw new BadRequestException(`The project is already ${this.statusLabel(dto.status)}`);
    }

    const allowed = PROJECT_STATUS_TRANSITIONS[project.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `A ${this.statusLabel(project.status)} project cannot become ${this.statusLabel(dto.status)}. ` +
        `It can become: ${allowed.map((s) => this.statusLabel(s)).join(', ')}.`,
      );
    }

    // Work cannot begin for a client that has since been deactivated.
    if (dto.status === ProjectStatus.ACTIVE) {
      await this.assertClientUsable(organizationId, project.clientId);
    }

    project.status = dto.status;
    project.statusReason = dto.reason?.trim() || null;
    project.statusChangedBy = updatedBy;
    project.statusChangedAt = new Date();
    project.updatedBy = updatedBy;
    await this.projectRepo.save(project);

    return this.findOne(organizationId, id);
  }

  async remove(organizationId: string, id: string, deletedBy: string): Promise<void> {
    // Frozen once a purchase order is raised against a requisition for this project.
    await this.workflowLock.assertProjectEditable(organizationId, id);
    const project = await this.findEntityOrThrow(organizationId, id, false);

    if (!DELETABLE_PROJECT_STATUSES.includes(project.status)) {
      throw new ConflictException(
        `A ${this.statusLabel(project.status)} project cannot be deleted. ` +
        'Cancel it first, or keep it for the record.',
      );
    }

    project.isDeleted = true;
    project.deletedAt = new Date();
    project.deletedBy = deletedBy;
    await this.projectRepo.save(project);
  }

  // ── Helpers: validation ──────────────────────────────────────────

  private assertName(name: string | undefined): void {
    if (!name || !name.trim()) throw new BadRequestException('Project name is required');
  }

  /** Valid calendar dates, and the end strictly after the start. */
  private assertDates(startDate: string, endDate: string | null): void {
    if (!this.isRealDate(startDate)) throw new BadRequestException('Start date is not a valid date');
    if (endDate) {
      if (!this.isRealDate(endDate)) throw new BadRequestException('End date is not a valid date');
      if (endDate <= startDate) {
        throw new BadRequestException('End date must be later than the start date');
      }
    }
  }

  private isRealDate(value: string): boolean {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  private async assertClientUsable(organizationId: string, clientId: string): Promise<void> {
    const client = await this.clientRepo.findOne({
      where: { id: clientId, organizationId, isDeleted: false },
    });
    if (!client) throw new BadRequestException('Selected client was not found');
    if (!client.isActive) throw new BadRequestException('Selected client is inactive');
  }

  private async assertProjectTypeUsable(organizationId: string, projectTypeId: string): Promise<void> {
    const type = await this.typeRepo.findOne({
      where: { id: projectTypeId, organizationId, isDeleted: false },
    });
    if (!type) throw new BadRequestException('Selected project type was not found');
    if (!type.isActive) throw new BadRequestException('Selected project type is inactive');
  }

  private async assertManagerUsable(organizationId: string, userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId, organizationId } });
    if (!user || user.is_deleted) throw new BadRequestException('Selected project manager was not found');
    if (Number(user.is_internal) !== 1) {
      throw new BadRequestException('A project manager must be an internal user');
    }
    if (Number(user.is_active) !== 1) throw new BadRequestException('Selected project manager is inactive');
  }

  private async findEntityOrThrow(
    organizationId: string,
    id: string,
    withRelations = true,
  ): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id, organizationId, isDeleted: false },
      relations: withRelations
        ? {
            client: { clientType: true, industryCategory: true },
            projectType: true,
            projectManager: true,
          }
        : undefined,
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  // ── Helpers: mapping ─────────────────────────────────────────────

  /**
   * The columns a request may set. Only keys the caller actually sent are
   * returned, so an update never wipes a value by omission; a string is trimmed
   * and a blank one becomes null.
   */
  private toColumns(dto: Partial<CreateProjectDto>): Partial<Project> {
    const out: Record<string, unknown> = {};
    const source = dto as Record<string, unknown>;

    for (const key of TEXT_FIELDS) {
      const value = source[key];
      if (value === undefined) continue;
      out[key] = typeof value === 'string' ? value.trim() || null : value;
    }
    for (const key of ['countryCode', 'currencyCode'] as const) {
      const value = source[key];
      if (value === undefined) continue;
      out[key] = typeof value === 'string' ? value.trim().toUpperCase() || null : value;
    }
    if (dto.endDate !== undefined) out.endDate = dto.endDate || null;
    if (dto.measurementSystem !== undefined) out.measurementSystem = dto.measurementSystem || null;
    if (dto.projectManagerId !== undefined) out.projectManagerId = dto.projectManagerId || null;

    return out as Partial<Project>;
  }

  private statusLabel(status: ProjectStatus): string {
    return status.replace(/_/g, ' ').toLowerCase();
  }

  private userName(u: Pick<User, 'first_name' | 'last_name' | 'email'>): string {
    return [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email;
  }

  private dateOnly(value: string | Date | null | undefined): string | null {
    if (!value) return null;
    return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  }

  private scheduleOf(p: Project): ProjectSummaryResponseDto['schedule'] {
    const start = this.dateOnly(p.startDate);
    const end = this.dateOnly(p.endDate);
    const today = new Date().toISOString().slice(0, 10);
    const days = (a: string, b: string) =>
      Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / DAY_MS);

    return {
      durationDays: start && end ? days(start, end) + 1 : null,
      daysToEnd: end ? days(today, end) : null,
      isOverdue: !!end && end < today && OPEN_PROJECT_STATUSES.includes(p.status),
    };
  }

  private toResponse(p: Project): ProjectResponseDto {
    return {
      id: p.id,
      dguid: p.dguid,
      organizationId: p.organizationId,
      code: p.code,
      projectName: p.projectName,
      clientId: p.clientId,
      // Always read through the relationship; optional-chained because some
      // callers load the row without it.
      clientCode: p.client?.code ?? null,
      clientName: p.client?.clientName ?? null,
      clientDisplayName: p.client?.displayName ?? null,
      projectTypeId: p.projectTypeId,
      projectTypeName: p.projectType?.name ?? null,
      status: p.status,
      statusReason: p.statusReason ?? null,
      statusChangedBy: p.statusChangedBy ?? null,
      statusChangedAt: p.statusChangedAt ?? null,
      description: p.description ?? null,
      startDate: this.dateOnly(p.startDate) as string,
      endDate: this.dateOnly(p.endDate),
      projectManagerId: p.projectManagerId ?? null,
      projectManagerName: p.projectManager ? this.userName(p.projectManager) : null,
      siteLocation: p.siteLocation ?? null,
      addressLine1: p.addressLine1 ?? null,
      city: p.city ?? null,
      state: p.state ?? null,
      postalCode: p.postalCode ?? null,
      countryCode: p.countryCode ?? null,
      contractNumber: p.contractNumber ?? null,
      clientProjectReference: p.clientProjectReference ?? null,
      currencyCode: p.currencyCode ?? null,
      measurementSystem: p.measurementSystem ?? null,
      timeZone: p.timeZone ?? null,
      createdBy: p.createdBy ?? null,
      updatedBy: p.updatedBy ?? null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
