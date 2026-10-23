import {
  BadRequestException, ConflictException, Injectable, NotFoundException, Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, In, IsNull, Not, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { Project } from '../project/entities/project.entity';
import { OPEN_PROJECT_STATUSES } from '../project/enums/project.enums';
import { User } from '../user/entity/user.entity';
import { WorkflowTrackingService } from '../workflow-tracking/workflow-tracking.service';
import { WorkflowAction, WorkflowEntityType } from '../workflow-tracking/enums/workflow-tracking.enums';
import { UserProjectMapping } from './entities/user-project-mapping.entity';
import { UserProjectMappingStatus } from './enums/user-project-mapping.enums';
import {
  CreateUserProjectMappingDto, EligibleUserDto, MappedUserDto, MyProjectDto,
  UpdateUserProjectMappingDto, UpdateUserProjectMappingStatusDto, UserProjectMappingDetailDto,
  UserProjectMappingListDto, UserProjectMappingQueryDto, UserProjectMappingResponseDto,
} from './dto/user-project-mapping.dto';
import { ProjectViewer, UserProjectAccessService } from './user-project-access.service';

/** Who is changing a mapping (from the JWT). */
export interface MappingActor {
  userId: string;
  email: string;
  name: string;
}

// sortBy → the aggregate selected under that alias in findAll.
const SORT_ALIASES: Record<string, string> = {
  projectCode: 'projectCode',
  projectName: 'projectName',
  clientName:  'clientName',
  userCount:   'userCount',
  createdAt:   'createdAt',
  updatedAt:   'updatedAt',
};

const fullName = (u: Pick<User, 'first_name' | 'last_name' | 'email'>) =>
  [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email;

const escapeLike = (term: string) => `%${term.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;

/**
 * Project ↔ internal user assignments, which decide the projects a user sees
 * after signing in (see UserProjectAccessService).
 *
 * The screen works per project — one project with its list of users — while
 * storage is one row per pair. Every change is a workflow step for the project
 * (PROJECT_ASSIGNMENT) that tells the users it concerns.
 */
@Injectable()
export class UserProjectMappingService {
  constructor(
    @InjectRepository(UserProjectMapping) private readonly repo: Repository<UserProjectMapping>,
    @InjectRepository(Project)            private readonly projectRepo: Repository<Project>,
    @InjectRepository(User)               private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly access: UserProjectAccessService,
    private readonly logger: CustomLoggerService,
    @Optional() private readonly tracking?: WorkflowTrackingService,
  ) {}

  // ── Reading ──────────────────────────────────────────────────────

  /** One row per mapped project, paged over projects. */
  async findAll(organizationId: string, query: UserProjectMappingQueryDto): Promise<UserProjectMappingListDto> {
    const {
      search, projectId, clientId, userId, status,
      page = 1, limit = 20, sortBy = 'projectCode', sortOrder = 'ASC',
    } = query;

    const qb = this.repo.createQueryBuilder('m')
      .innerJoin('m.project', 'p')
      .leftJoin('p.client', 'cl')
      .select('m.projectId', 'projectId')
      .addSelect('MAX(p.code)', 'projectCode')
      .addSelect('MAX(p.projectName)', 'projectName')
      .addSelect('MAX(cl.clientName)', 'clientName')
      .addSelect('COUNT(m.id)', 'userCount')
      .addSelect('MIN(m.createdAt)', 'createdAt')
      .addSelect('MAX(m.updatedAt)', 'updatedAt')
      .where('m.organizationId = :organizationId', { organizationId })
      .andWhere('m.isDeleted = :no', { no: false })
      .andWhere('p.isDeleted = :no')
      .groupBy('m.projectId')
      .setParameter('active', UserProjectMappingStatus.ACTIVE);

    if (projectId) qb.andWhere('m.projectId = :projectId', { projectId });
    if (clientId)  qb.andWhere('p.clientId = :clientId', { clientId });
    if (userId) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM user_project_mappings f
          WHERE f.projectId = m.projectId AND f.userId = :userId AND f.is_deleted = 0)`,
        { userId },
      );
    }
    const term = search?.trim();
    if (term) {
      qb.andWhere(new Brackets((w) => w
        .where('LOWER(p.code) LIKE :like')
        .orWhere('LOWER(p.projectName) LIKE :like')
        .orWhere('LOWER(cl.clientName) LIKE :like')
        .orWhere(
          `EXISTS (SELECT 1 FROM user_project_mappings s INNER JOIN \`user\` su ON su.id = s.userId
            WHERE s.projectId = m.projectId AND s.is_deleted = 0
              AND (LOWER(CONCAT(su.first_name, ' ', COALESCE(su.last_name, ''))) LIKE :like
                   OR LOWER(su.email) LIKE :like))`,
        )), { like: escapeLike(term) });
    }
    if (status === UserProjectMappingStatus.ACTIVE) {
      qb.having('SUM(CASE WHEN m.status = :active THEN 1 ELSE 0 END) > 0');
    } else if (status === UserProjectMappingStatus.INACTIVE) {
      qb.having('SUM(CASE WHEN m.status = :active THEN 1 ELSE 0 END) = 0');
    }

    const counted = await this.dataSource.createQueryBuilder()
      .select('COUNT(*)', 'total')
      .from(`(${qb.getQuery()})`, 'g')
      .setParameters(qb.getParameters())
      .getRawOne<{ total: string }>();
    const total = Number(counted?.total ?? 0);

    const direction: 'ASC' | 'DESC' = sortOrder === 'DESC' ? 'DESC' : 'ASC';
    const sortAlias = SORT_ALIASES[sortBy] ?? SORT_ALIASES.projectCode;
    qb.orderBy(sortAlias, direction);
    if (sortAlias !== 'projectCode') qb.addOrderBy('projectCode', 'ASC');
    const groups = await qb.offset((page - 1) * limit).limit(limit).getRawMany<{ projectId: string }>();

    const items = await this.loadMappings(organizationId, groups.map((g) => g.projectId));
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** One project's mapping with its assignment history. */
  async findOne(organizationId: string, projectId: string): Promise<UserProjectMappingDetailDto> {
    const [mapping] = await this.loadMappings(organizationId, [projectId]);
    if (!mapping) throw new NotFoundException('No users are mapped to this project');
    const history = this.tracking
      ? await this.tracking.eventsFor(organizationId, WorkflowEntityType.PROJECT_ASSIGNMENT, projectId)
      : [];
    return { ...mapping, history };
  }

  /** Active internal users of the organization — the only accounts a project can be assigned to. */
  async eligibleUsers(organizationId: string): Promise<EligibleUserDto[]> {
    const users = await this.userRepo.find({
      where: { organizationId, is_internal: 1, is_active: 1, is_deleted: false },
      relations: { role: true },
      order: { first_name: 'ASC', last_name: 'ASC' },
    });
    return users.map((u) => ({
      id: u.id,
      name: fullName(u),
      email: u.email,
      position: u.position || null,
      role: u.role?.name ?? null,
    }));
  }

  /** The projects the signed-in user can see. */
  async myProjects(organizationId: string, viewer: ProjectViewer): Promise<MyProjectDto[]> {
    const qb = this.projectRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.client', 'cl')
      .where('p.organizationId = :organizationId', { organizationId })
      .andWhere('p.isDeleted = :no', { no: false })
      .orderBy('p.code', 'ASC');
    this.access.scope(qb, 'p', viewer);
    const rows = await qb.getMany();
    return rows.map((p) => ({
      id: p.id, code: p.code, projectName: p.projectName, status: p.status, clientName: p.client?.clientName ?? null,
    }));
  }

  // ── Changing ─────────────────────────────────────────────────────

  /** Assigns a project that has no mapping yet. */
  async create(
    organizationId: string,
    dto: CreateUserProjectMappingDto,
    actor: MappingActor,
  ): Promise<UserProjectMappingDetailDto> {
    const project = await this.assertProjectAssignable(organizationId, dto.projectId);
    const live = await this.repo.count({ where: { organizationId, projectId: project.id, isDeleted: false } });
    if (live > 0) {
      throw new ConflictException(
        `Project ${project.code} already has users mapped. Edit its mapping to add or remove users.`,
      );
    }
    const users = await this.assertUsersEligible(organizationId, dto.userIds);

    await this.dataSource.transaction(async (manager) => {
      await this.assign(manager, organizationId, project.id, dto.userIds, actor);
      await this.track(manager, organizationId, project, actor, {
        action: WorkflowAction.ASSIGNED,
        toStatus: UserProjectMappingStatus.ACTIVE,
        comments: `Assigned to ${users.map(fullName).join(', ')}`,
        metadata: { addedUserIds: dto.userIds, notifyUserIds: dto.userIds },
      });
    });
    this.logger.log(`Project ${project.code} assigned to ${dto.userIds.length} user(s) by ${actor.email}`);
    return this.findOne(organizationId, project.id);
  }

  /**
   * Replaces the project's user list: users not yet mapped are added (a removed
   * user's old row is revived), mapped users left out are removed. Users who
   * stay keep their row, status and assignment date.
   */
  async update(
    organizationId: string,
    projectId: string,
    dto: UpdateUserProjectMappingDto,
    actor: MappingActor,
  ): Promise<UserProjectMappingDetailDto> {
    const project = await this.findProjectOrThrow(organizationId, projectId);
    const current = await this.repo.find({ where: { organizationId, projectId, isDeleted: false } });
    if (!current.length) throw new NotFoundException('No users are mapped to this project');

    const wanted = new Set(dto.userIds);
    const have = new Set(current.map((r) => r.userId));
    const added = dto.userIds.filter((id) => !have.has(id));
    const removed = current.filter((r) => !wanted.has(r.userId));
    if (!added.length && !removed.length) return this.findOne(organizationId, projectId);

    let addedUsers: User[] = [];
    if (added.length) {
      this.assertProjectOpen(project);
      addedUsers = await this.assertUsersEligible(organizationId, added);
    }
    const removedUsers = removed.length
      ? await this.userRepo.find({ where: { id: In(removed.map((r) => r.userId)) } })
      : [];

    await this.dataSource.transaction(async (manager) => {
      if (added.length) await this.assign(manager, organizationId, projectId, added, actor);
      if (removed.length) {
        const now = new Date();
        await manager.update(UserProjectMapping, { id: In(removed.map((r) => r.id)) }, {
          isDeleted: true, deletedAt: now, deletedBy: actor.email, updatedBy: actor.email,
        });
      }
      if (added.length) {
        await this.track(manager, organizationId, project, actor, {
          action: WorkflowAction.ASSIGNED,
          toStatus: UserProjectMappingStatus.ACTIVE,
          comments: `Assigned to ${addedUsers.map(fullName).join(', ')}`,
          metadata: { addedUserIds: added, notifyUserIds: added },
        });
      }
      if (removed.length) {
        await this.track(manager, organizationId, project, actor, {
          action: WorkflowAction.UNASSIGNED,
          comments: `Removed ${removedUsers.map(fullName).join(', ')}`,
          metadata: { removedUserIds: removed.map((r) => r.userId), notifyUserIds: removed.map((r) => r.userId) },
        });
      }
    });
    this.logger.log(
      `Project ${project.code} mapping changed by ${actor.email}: +${added.length} / -${removed.length} user(s)`,
    );
    return this.findOne(organizationId, projectId);
  }

  /** Switches every user of the project on or off at once. */
  async updateStatus(
    organizationId: string,
    projectId: string,
    dto: UpdateUserProjectMappingStatusDto,
    actor: MappingActor,
  ): Promise<UserProjectMappingDetailDto> {
    const project = await this.findProjectOrThrow(organizationId, projectId);
    const rows = await this.repo.find({ where: { organizationId, projectId, isDeleted: false } });
    if (!rows.length) throw new NotFoundException('No users are mapped to this project');

    const fromStatus = rows.some((r) => r.status === UserProjectMappingStatus.ACTIVE)
      ? UserProjectMappingStatus.ACTIVE
      : UserProjectMappingStatus.INACTIVE;
    const toActive = dto.status === UserProjectMappingStatus.ACTIVE;
    if (toActive) this.assertProjectOpen(project);
    const changing = rows.filter((r) => r.status !== dto.status);
    if (!changing.length) {
      throw new ConflictException(`This project mapping is already ${toActive ? 'active' : 'inactive'}`);
    }

    await this.dataSource.transaction(async (manager) => {
      const now = new Date();
      await manager.update(UserProjectMapping, { id: In(changing.map((r) => r.id)) }, {
        status: dto.status,
        deactivatedBy: toActive ? null : actor.email,
        deactivatedAt: toActive ? null : now,
        updatedBy: actor.email,
      });
      await this.track(manager, organizationId, project, actor, {
        action: WorkflowAction.STATUS_CHANGED,
        fromStatus,
        toStatus: dto.status,
        metadata: { notifyUserIds: rows.map((r) => r.userId) },
      });
    });
    this.logger.log(`Project ${project.code} mapping set ${dto.status} by ${actor.email}`);
    return this.findOne(organizationId, projectId);
  }

  /** Removes every user from the project (soft delete — the rows and history stay). */
  async remove(organizationId: string, projectId: string, actor: MappingActor): Promise<void> {
    const project = await this.findProjectOrThrow(organizationId, projectId);
    const rows = await this.repo.find({ where: { organizationId, projectId, isDeleted: false } });
    if (!rows.length) throw new NotFoundException('No users are mapped to this project');

    await this.dataSource.transaction(async (manager) => {
      await manager.update(UserProjectMapping, { id: In(rows.map((r) => r.id)) }, {
        isDeleted: true, deletedAt: new Date(), deletedBy: actor.email, updatedBy: actor.email,
      });
      await this.track(manager, organizationId, project, actor, {
        action: WorkflowAction.DELETED,
        toStatus: 'DELETED',
        metadata: { removedUserIds: rows.map((r) => r.userId), notifyUserIds: rows.map((r) => r.userId) },
      });
    });
    this.logger.log(`Project ${project.code} mapping deleted by ${actor.email}`);
  }

  // ── Helpers ──────────────────────────────────────────────────────

  /** Creates the rows, or revives a removed user's row, as ACTIVE assignments. */
  private async assign(
    manager: EntityManager,
    organizationId: string,
    projectId: string,
    userIds: string[],
    actor: MappingActor,
  ): Promise<void> {
    const now = new Date();
    const previous = await manager.find(UserProjectMapping, {
      where: { organizationId, projectId, userId: In(userIds) },
    });
    const byUser = new Map(previous.map((r) => [r.userId, r]));
    for (const userId of userIds) {
      const old = byUser.get(userId);
      if (old) {
        await manager.update(UserProjectMapping, { id: old.id }, {
          isDeleted: false, deletedAt: null, deletedBy: null,
          status: UserProjectMappingStatus.ACTIVE, deactivatedAt: null, deactivatedBy: null,
          assignedBy: actor.email, assignedAt: now, updatedBy: actor.email,
        });
      } else {
        await manager.save(UserProjectMapping, manager.create(UserProjectMapping, {
          dguid: uuidv4(),
          organizationId,
          projectId,
          userId,
          status: UserProjectMappingStatus.ACTIVE,
          assignedBy: actor.email,
          assignedAt: now,
          createdBy: actor.email,
          updatedBy: actor.email,
        }));
      }
    }
  }

  /**
   * Records an assignment step for the project. The project's rows share one
   * trackingId: reused when any row has one, otherwise generated and stamped on
   * all of them. The users named in notifyUserIds hear about it.
   */
  private async track(
    manager: EntityManager,
    organizationId: string,
    project: Project,
    actor: MappingActor,
    step: {
      action: WorkflowAction;
      fromStatus?: string | null;
      toStatus?: string | null;
      comments?: string | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    if (!this.tracking) return;
    const withId = await manager.findOne(UserProjectMapping, {
      where: { organizationId, projectId: project.id, trackingId: Not(IsNull()) },
    });
    const trackingId = withId?.trackingId ?? this.tracking.generateTrackingId(organizationId);
    await manager.update(UserProjectMapping, { organizationId, projectId: project.id, trackingId: IsNull() }, { trackingId });

    await this.tracking.record({
      organizationId,
      trackingId,
      entityType: WorkflowEntityType.PROJECT_ASSIGNMENT,
      entityId: project.id,
      entityReference: `${project.code} — ${project.projectName}`.slice(0, 50),
      action: step.action,
      fromStatus: step.fromStatus ?? null,
      toStatus: step.toStatus ?? null,
      comments: step.comments ?? null,
      actor: { userId: actor.userId, name: actor.name, email: actor.email },
      metadata: { projectCode: project.code, projectName: project.projectName, ...step.metadata },
    }, manager);
  }

  private async loadMappings(organizationId: string, projectIds: string[]): Promise<UserProjectMappingResponseDto[]> {
    if (!projectIds.length) return [];
    const rows = await this.repo.find({
      where: { organizationId, projectId: In(projectIds), isDeleted: false },
      relations: { user: true, project: { client: true } },
      order: { assignedAt: 'ASC', createdAt: 'ASC' },
    });
    const byProject = new Map<string, UserProjectMapping[]>();
    for (const r of rows) {
      if (!byProject.has(r.projectId)) byProject.set(r.projectId, []);
      byProject.get(r.projectId)!.push(r);
    }
    return projectIds
      .filter((id) => byProject.has(id))
      .map((id) => this.toResponse(byProject.get(id)!));
  }

  private toResponse(rows: UserProjectMapping[]): UserProjectMappingResponseDto {
    const project = rows[0].project;
    const users: MappedUserDto[] = rows.map((r) => ({
      mappingId: r.id,
      userId: r.userId,
      name: r.user ? fullName(r.user) : r.userId,
      email: r.user?.email ?? '',
      position: r.user?.position || null,
      status: r.status,
      userActive: !!r.user && Number(r.user.is_active) === 1 && !r.user.is_deleted,
      assignedBy: r.assignedBy,
      assignedAt: r.assignedAt,
    }));
    const activeUserCount = users.filter((u) => u.status === UserProjectMappingStatus.ACTIVE).length;
    const first = rows.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
    const last = rows.reduce((a, b) => (a.updatedAt >= b.updatedAt ? a : b));
    return {
      projectId: project.id,
      projectCode: project.code,
      projectName: project.projectName,
      projectStatus: project.status,
      clientId: project.clientId,
      clientCode: project.client?.code ?? null,
      clientName: project.client?.clientName ?? null,
      status: activeUserCount ? UserProjectMappingStatus.ACTIVE : UserProjectMappingStatus.INACTIVE,
      userCount: users.length,
      activeUserCount,
      users,
      trackingId: rows.find((r) => r.trackingId)?.trackingId ?? null,
      createdBy: first.createdBy,
      createdAt: first.createdAt,
      updatedBy: last.updatedBy,
      updatedAt: last.updatedAt,
    };
  }

  private async findProjectOrThrow(organizationId: string, projectId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id: projectId, organizationId, isDeleted: false } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private assertProjectOpen(project: Project): void {
    if (!OPEN_PROJECT_STATUSES.includes(project.status)) {
      throw new BadRequestException(
        `Project ${project.code} is ${String(project.status).toLowerCase()}; users can only be assigned to open projects`,
      );
    }
  }

  private async assertProjectAssignable(organizationId: string, projectId: string): Promise<Project> {
    const project = await this.findProjectOrThrow(organizationId, projectId);
    this.assertProjectOpen(project);
    return project;
  }

  /** Every user must be an active internal user of this organization. */
  private async assertUsersEligible(organizationId: string, userIds: string[]): Promise<User[]> {
    const users = await this.userRepo.find({ where: { id: In(userIds), organizationId } });
    const found = new Map(users.map((u) => [u.id, u]));
    const missing = userIds.filter((id) => !found.has(id) || found.get(id)!.is_deleted);
    if (missing.length) throw new BadRequestException(`${missing.length} selected user(s) were not found`);

    const external = users.filter((u) => Number(u.is_internal) !== 1);
    if (external.length) {
      throw new BadRequestException(
        `Only internal users can be assigned projects: ${external.map(fullName).join(', ')}`,
      );
    }
    const inactive = users.filter((u) => Number(u.is_active) !== 1);
    if (inactive.length) {
      throw new BadRequestException(`These users are deactivated: ${inactive.map(fullName).join(', ')}`);
    }
    return userIds.map((id) => found.get(id)!);
  }
}
