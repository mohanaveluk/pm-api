import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
  InternalServerErrorException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ServiceGroupUser } from './entities/service-group-user.entity';
import { ServiceGroup } from '../service-group/entities/service-group.entity';
import { ServiceGroupActivity } from '../service-group/entities/service-group-activity.entity';
import { User } from '../user/entity/user.entity';
import {
  CreateServiceGroupUserDto,
  AssignUserItemDto,
  SyncServiceGroupUsersDto,
  BulkAssignmentIdsDto,
} from './dto/create-service-group-user.dto';
import { ServiceGroupUserQueryDto } from './dto/service-group-user-query.dto';
import {
  ServiceGroupUserResponseDto,
  ServiceGroupMemberDto,
  UserServiceGroupDto,
  SyncResultDto,
  BulkOperationResultDto,
  ServiceGroupUserListResponseDto,
} from './dto/service-group-user-response.dto';
import { AssignmentType } from './enums/assignment-type.enum';

const ALLOWED_SORT_FIELDS = new Set(['createdAt', 'isPrimary', 'assignmentType']);

@Injectable()
export class ServiceGroupUserService {
  private readonly logger = new Logger(ServiceGroupUserService.name);

  constructor(
    @InjectRepository(ServiceGroupUser)
    private readonly sguRepo: Repository<ServiceGroupUser>,
    @InjectRepository(ServiceGroup)
    private readonly sgRepo: Repository<ServiceGroup>,
    @InjectRepository(ServiceGroupActivity)
    private readonly sgaRepo: Repository<ServiceGroupActivity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Assign users to a service group (upsert) ────────────────────
  //
  // Design: the DB unique constraint UQ_sgu_org_sg_user covers ALL rows,
  // including soft-deleted ones. A plain INSERT for a previously-deleted
  // user therefore hits a duplicate-key error. We solve this with upsert
  // semantics: check for ANY existing row (active, disabled, or deleted),
  // and restore it in place rather than inserting a new one.
  // Result:
  //   "restored"  — row existed (deleted/disabled), was reactivated
  //   "created"   — brand-new row inserted
  //   "skipped"   — row exists and is already active, no change needed

  async create(
    organizationId: string,
    dto: CreateServiceGroupUserDto,
    createdBy: string,
  ): Promise<{
    created: ServiceGroupUserResponseDto[];
    restored: ServiceGroupUserResponseDto[];
    skipped: number;
    skippedIds: string[];
  }> {
    const sg = await this.validateServiceGroup(organizationId, dto.serviceGroupId);

    const userIds = dto.users.map(u => u.userId);
    const userMap = await this.validateUsers(organizationId, userIds);

    // Load ALL records for these users in this group — including deleted/disabled
    const allExisting = await this.sguRepo.find({
      where: { organizationId, serviceGroupId: sg.id, userId: In(userIds) },
    });
    const existingByUserId = new Map(allExisting.map(e => [e.userId, e]));

    const toInsert:  AssignUserItemDto[] = [];
    const toRestore: { row: ServiceGroupUser; item: AssignUserItemDto }[] = [];
    const skippedIds: string[] = [];

    for (const item of dto.users) {
      const existing = existingByUserId.get(item.userId);
      if (!existing) {
        toInsert.push(item);
      } else if (existing.isActive && !existing.isDeleted) {
        // Already an active member — skip
        skippedIds.push(item.userId);
      } else {
        // Soft-deleted or disabled — restore in place to avoid unique-key collision
        toRestore.push({ row: existing, item });
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Restore previously deleted / disabled rows
      const restoredRows: ServiceGroupUser[] = [];
      for (const { row, item } of toRestore) {
        row.isDeleted      = false;
        row.deletedAt      = null;
        row.deletedBy      = null;
        row.isActive       = true;
        row.disabledAt     = null;
        row.disabledBy     = null;
        row.assignmentType = item.assignmentType ?? row.assignmentType;
        row.isPrimary      = item.isPrimary ?? row.isPrimary;
        row.effectiveFrom  = item.effectiveFrom ? new Date(item.effectiveFrom) : row.effectiveFrom;
        row.effectiveTo    = item.effectiveTo   ? new Date(item.effectiveTo)   : row.effectiveTo;
        row.remarks        = item.remarks ?? row.remarks;
        row.updatedBy      = createdBy;
        restoredRows.push(await queryRunner.manager.save(ServiceGroupUser, row));
      }

      // Insert brand-new rows
      const newEntities = toInsert.map(item =>
        queryRunner.manager.create(ServiceGroupUser, {
          dguid:          uuidv4(),
          organizationId,
          serviceGroupId: sg.id,
          userId:         item.userId,
          assignmentType: item.assignmentType ?? AssignmentType.MANUAL,
          effectiveFrom:  item.effectiveFrom ? new Date(item.effectiveFrom) : null,
          effectiveTo:    item.effectiveTo   ? new Date(item.effectiveTo)   : null,
          isPrimary:      item.isPrimary ?? false,
          isActive:       true,
          remarks:        item.remarks,
          createdBy,
        }),
      );
      const insertedRows = newEntities.length > 0
        ? await queryRunner.manager.save(ServiceGroupUser, newEntities)
        : [];

      await queryRunner.commitTransaction();

      return {
        created:  insertedRows.map(a  => this.toResponse(a,   sg, userMap.get(a.userId)!)),
        restored: restoredRows.map(a  => this.toResponse(a,   sg, userMap.get(a.userId)!)),
        skipped:  skippedIds.length,
        skippedIds,
      };
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to assign service group users', err?.message);
      throw new InternalServerErrorException('Unable to create assignments');
    } finally {
      await queryRunner.release();
    }
  }

  // ── Sync membership (intelligent diff) ───────────────────────────

  async sync(
    organizationId: string,
    serviceGroupId: string,
    dto: SyncServiceGroupUsersDto,
    updatedBy: string,
  ): Promise<SyncResultDto> {
    const sg = await this.validateServiceGroup(organizationId, serviceGroupId);

    const incomingUserIds = new Set(dto.users.map(u => u.userId));
    const incomingMap = new Map(dto.users.map(u => [u.userId, u]));

    // Validate all incoming users at once
    if (incomingUserIds.size > 0) {
      await this.validateUsers(organizationId, [...incomingUserIds]);
    }

    // Load ALL rows for this group — including soft-deleted — so we can
    // restore them in place and avoid hitting the unique constraint on re-add.
    const allRows = await this.sguRepo.find({
      where: { organizationId, serviceGroupId: sg.id },
      relations: ['user'],
    });
    const allByUserId = new Map(allRows.map(e => [e.userId, e]));

    // Active non-deleted rows — used to compute removes / re-enables / unchanged
    const activeRows    = allRows.filter(e => !e.isDeleted);
    const activeUserIds = new Set(activeRows.map(e => e.userId));

    // Compute diff buckets
    // toAdd       — not in any existing row at all → INSERT
    // toRestore   — row exists but is deleted → restore in place (avoids unique-key collision)
    // toReEnable  — row exists, not deleted, but disabled → re-enable
    // toRemove    — active row not in incoming list → soft-delete
    // unchanged   — active + active in both sets
    const toAdd: AssignUserItemDto[] = [];
    const toRestore: { row: ServiceGroupUser; item: AssignUserItemDto }[] = [];

    for (const item of dto.users) {
      const row = allByUserId.get(item.userId);
      if (!row) {
        toAdd.push(item);
      } else if (row.isDeleted) {
        toRestore.push({ row, item });
      }
      // isActive=false but not deleted → handled by toReEnable below
    }

    const toRemove   = activeRows.filter(e => !incomingUserIds.has(e.userId));
    const toReEnable = activeRows.filter(e => incomingUserIds.has(e.userId) && !e.isActive && !e.isDeleted);
    const unchanged  = activeRows.filter(e => incomingUserIds.has(e.userId) && e.isActive);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Soft-delete removed users
      for (const rem of toRemove) {
        rem.isDeleted = true;
        rem.deletedAt = new Date();
        rem.deletedBy = updatedBy;
        rem.isActive  = false;
        rem.updatedBy = updatedBy;
        await queryRunner.manager.save(ServiceGroupUser, rem);
      }

      // 2. Re-enable previously disabled (but not deleted) users
      for (const ree of toReEnable) {
        const incoming = incomingMap.get(ree.userId)!;
        ree.isActive       = true;
        ree.disabledAt     = null;
        ree.disabledBy     = null;
        ree.isPrimary      = incoming.isPrimary ?? ree.isPrimary;
        ree.assignmentType = incoming.assignmentType ?? ree.assignmentType;
        ree.updatedBy      = updatedBy;
        await queryRunner.manager.save(ServiceGroupUser, ree);
      }

      // 3. Restore soft-deleted rows in place (avoids unique constraint violation)
      for (const { row, item } of toRestore) {
        row.isDeleted      = false;
        row.deletedAt      = null;
        row.deletedBy      = null;
        row.isActive       = true;
        row.disabledAt     = null;
        row.disabledBy     = null;
        row.assignmentType = item.assignmentType ?? row.assignmentType;
        row.isPrimary      = item.isPrimary ?? row.isPrimary;
        row.effectiveFrom  = item.effectiveFrom ? new Date(item.effectiveFrom) : row.effectiveFrom;
        row.effectiveTo    = item.effectiveTo   ? new Date(item.effectiveTo)   : row.effectiveTo;
        row.remarks        = item.remarks ?? row.remarks;
        row.updatedBy      = updatedBy;
        await queryRunner.manager.save(ServiceGroupUser, row);
      }

      // 4. Insert brand-new rows
      const newEntities = toAdd.map(item =>
        queryRunner.manager.create(ServiceGroupUser, {
          dguid:          uuidv4(),
          organizationId,
          serviceGroupId: sg.id,
          userId:         item.userId,
          assignmentType: item.assignmentType ?? AssignmentType.MANUAL,
          effectiveFrom:  item.effectiveFrom ? new Date(item.effectiveFrom) : null,
          effectiveTo:    item.effectiveTo   ? new Date(item.effectiveTo)   : null,
          isPrimary:      item.isPrimary ?? false,
          isActive:       true,
          remarks:        item.remarks,
          createdBy:      updatedBy,
        }),
      );
      const saved = newEntities.length > 0
        ? await queryRunner.manager.save(ServiceGroupUser, newEntities)
        : [];

      await queryRunner.commitTransaction();

      // Reload all active assignments for the response
      const allActive = await this.sguRepo.find({
        where: { organizationId, serviceGroupId: sg.id, isDeleted: false, isActive: true },
        relations: ['user'],
      });

      const userIds = allActive.map(a => a.userId);
      const users = userIds.length > 0
        ? await this.userRepo.find({ where: { id: In(userIds) } })
        : [];
      const userMap = new Map(users.map(u => [u.id, u]));

      return {
        added:      toAdd.length + toRestore.length,
        removed:    toRemove.length,
        reEnabled:  toReEnable.length,
        unchanged:  unchanged.length,
        assignments: allActive.map(a => this.toResponse(a, sg, userMap.get(a.userId)!)),
      };
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to sync service group users', err?.message);
      throw new InternalServerErrorException('Unable to synchronize user assignments');
    } finally {
      await queryRunner.release();
    }
  }

  // ── Find all (paginated) ──────────────────────────────────────────

  async findAll(
    organizationId: string,
    query: ServiceGroupUserQueryDto,
  ): Promise<ServiceGroupUserListResponseDto> {
    const {
      search, serviceGroupId, userId, assignmentType,
      isActive, isPrimary, createdFrom, createdTo,
      page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC',
    } = query;

    const safeSortBy = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : 'createdAt';

    const qb = this.sguRepo
      .createQueryBuilder('sgu')
      .leftJoinAndSelect('sgu.serviceGroup', 'sg')
      .leftJoinAndSelect('sgu.user', 'u')
      .where('sgu.organizationId = :organizationId', { organizationId })
      .andWhere('sgu.isDeleted = false');

    if (serviceGroupId)    qb.andWhere('sgu.serviceGroupId = :serviceGroupId',       { serviceGroupId });
    if (userId)            qb.andWhere('sgu.userId = :userId',                        { userId });
    if (assignmentType)    qb.andWhere('sgu.assignmentType = :assignmentType',        { assignmentType });
    if (isActive !== undefined) qb.andWhere('sgu.isActive = :isActive',               { isActive });
    if (isPrimary !== undefined) qb.andWhere('sgu.isPrimary = :isPrimary',             { isPrimary });

    if (createdFrom && createdTo) {
      qb.andWhere('sgu.createdAt BETWEEN :createdFrom AND :createdTo', {
        createdFrom: new Date(createdFrom),
        createdTo:   new Date(createdTo),
      });
    } else if (createdFrom) {
      qb.andWhere('sgu.createdAt >= :createdFrom', { createdFrom: new Date(createdFrom) });
    } else if (createdTo) {
      qb.andWhere('sgu.createdAt <= :createdTo', { createdTo: new Date(createdTo) });
    }

    if (search) {
      qb.andWhere(
        "(CONCAT(u.first_name, ' ', u.last_name) LIKE :s OR u.email LIKE :s OR sg.name LIKE :s OR sg.code LIKE :s)",
        { s: `%${search}%` },
      );
    }

    qb.orderBy(`sgu.${safeSortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items:      items.map(a => this.toResponse(a, a.serviceGroup, a.user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Find one ──────────────────────────────────────────────────────

  async findOne(organizationId: string, id: string): Promise<ServiceGroupUserResponseDto> {
    const assignment = await this.findOrThrow(organizationId, id);
    return this.toResponse(assignment, assignment.serviceGroup, assignment.user);
  }

  // ── Get users for a service group ─────────────────────────────────

  async getUsersForServiceGroup(
    organizationId: string,
    serviceGroupId: string,
  ): Promise<{ serviceGroup: Partial<ServiceGroup>; members: ServiceGroupMemberDto[] }> {
    const sg = await this.validateServiceGroup(organizationId, serviceGroupId);

    const assignments = await this.sguRepo.find({
      where: { organizationId, serviceGroupId: sg.id, isDeleted: false },
      relations: ['user'],
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });

    const members: ServiceGroupMemberDto[] = assignments.map(a => ({
      assignmentId:   a.id,
      userId:         a.userId,
      userFullName:   a.user ? `${a.user.first_name} ${a.user.last_name ?? ''}`.trim() : '',
      userEmail:      a.user?.email ?? '',
      userPosition:   a.user?.position ?? '',
      assignmentType: a.assignmentType,
      isPrimary:      a.isPrimary,
      isActive:       a.isActive,
      effectiveFrom:  a.effectiveFrom,
      effectiveTo:    a.effectiveTo,
      createdAt:      a.createdAt,
    }));

    return {
      serviceGroup: { id: sg.id, name: sg.name, code: sg.code, isActive: sg.isActive },
      members,
    };
  }

  // ── Get service groups for a user ─────────────────────────────────

  async getServiceGroupsForUser(
    organizationId: string,
    userId: string,
  ): Promise<{ user: Partial<User>; serviceGroups: UserServiceGroupDto[] }> {
    const user = await this.validateUser(organizationId, userId);

    const assignments = await this.sguRepo.find({
      where: { organizationId, userId: user.id, isDeleted: false, isActive: true },
      relations: ['serviceGroup'],
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });

    const sgIds = assignments.map(a => a.serviceGroupId);
    const activityCountMap = await this.buildActivityCountMap(sgIds);

    const serviceGroups: UserServiceGroupDto[] = assignments.map(a => ({
      assignmentId:           a.id,
      serviceGroupId:         a.serviceGroupId,
      serviceGroupCode:       a.serviceGroup?.code ?? '',
      serviceGroupName:       a.serviceGroup?.name ?? '',
      serviceGroupDescription: a.serviceGroup?.description ?? '',
      groupType:              a.serviceGroup?.groupType ?? '',
      assignmentType:         a.assignmentType,
      isPrimary:              a.isPrimary,
      isActive:               a.isActive,
      effectiveFrom:          a.effectiveFrom,
      effectiveTo:            a.effectiveTo,
      activityCount:          activityCountMap.get(a.serviceGroupId) ?? 0,
      createdAt:              a.createdAt,
    }));

    return {
      user: {
        id:         user.id,
        first_name: user.first_name,
        last_name:  user.last_name,
        email:      user.email,
        position:   user.position,
      },
      serviceGroups,
    };
  }

  // ── Disable single assignment ─────────────────────────────────────

  async disable(organizationId: string, id: string, disabledBy: string): Promise<ServiceGroupUserResponseDto> {
    const a = await this.findOrThrow(organizationId, id);
    if (!a.isActive) throw new BadRequestException('Assignment is already disabled');

    a.isActive    = false;
    a.disabledAt  = new Date();
    a.disabledBy  = disabledBy;
    a.updatedBy   = disabledBy;

    const saved = await this.sguRepo.save(a);
    return this.toResponse(saved, saved.serviceGroup, saved.user);
  }

  // ── Enable single assignment ──────────────────────────────────────

  async enable(organizationId: string, id: string, updatedBy: string): Promise<ServiceGroupUserResponseDto> {
    const a = await this.findOrThrow(organizationId, id);
    if (a.isActive) throw new BadRequestException('Assignment is already active');

    // Re-validate that the service group is still active
    if (!a.serviceGroup?.isActive) {
      throw new BadRequestException('Cannot enable: Service Group is disabled');
    }

    a.isActive   = true;
    a.disabledAt = null;
    a.disabledBy = null;
    a.updatedBy  = updatedBy;

    const saved = await this.sguRepo.save(a);
    return this.toResponse(saved, saved.serviceGroup, saved.user);
  }

  // ── Soft delete ───────────────────────────────────────────────────

  async remove(organizationId: string, id: string, deletedBy: string): Promise<void> {
    const a = await this.findOrThrow(organizationId, id);

    a.isDeleted  = true;
    a.deletedAt  = new Date();
    a.deletedBy  = deletedBy;
    a.isActive   = false;
    a.updatedBy  = deletedBy;

    await this.sguRepo.save(a);
  }

  // ── Bulk disable ──────────────────────────────────────────────────

  async bulkDisable(
    organizationId: string,
    dto: BulkAssignmentIdsDto,
    disabledBy: string,
  ): Promise<BulkOperationResultDto> {
    return this.bulkStatusChange(organizationId, dto.assignmentIds, false, disabledBy);
  }

  // ── Bulk enable ───────────────────────────────────────────────────

  async bulkEnable(
    organizationId: string,
    dto: BulkAssignmentIdsDto,
    updatedBy: string,
  ): Promise<BulkOperationResultDto> {
    return this.bulkStatusChange(organizationId, dto.assignmentIds, true, updatedBy);
  }

  // ── Private helpers ───────────────────────────────────────────────

  private async findOrThrow(organizationId: string, id: string): Promise<ServiceGroupUser> {
    const a = await this.sguRepo.findOne({
      where: { id, organizationId, isDeleted: false },
      relations: ['serviceGroup', 'user'],
    });
    if (!a) throw new NotFoundException('Assignment not found');
    return a;
  }

  private async validateServiceGroup(organizationId: string, serviceGroupId: string): Promise<ServiceGroup> {
    const sg = await this.sgRepo.findOne({
      where: { id: serviceGroupId, organizationId, isDeleted: false },
    });
    if (!sg) throw new NotFoundException('Service Group not found');
    if (!sg.isActive) throw new BadRequestException('Service Group is disabled');
    return sg;
  }

  private async validateUser(organizationId: string, userId: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId, organizationId },
    });
    if (!user) throw new NotFoundException(`User not found: ${userId}`);
    if (user.is_deleted)     throw new BadRequestException(`User '${user.email}' has been deleted`);
    if (!user.is_active)     throw new BadRequestException(`User '${user.email}' is inactive`);
    return user;
  }

  private async validateUsers(organizationId: string, userIds: string[]): Promise<Map<string, User>> {
    const users = await this.userRepo.find({
      where: { id: In(userIds), organizationId },
    });

    const foundMap = new Map(users.map(u => [u.id, u]));
    const missing  = userIds.filter(id => !foundMap.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(`User(s) not found: ${missing.join(', ')}`);
    }

    for (const user of users) {
      if (user.is_deleted)  throw new BadRequestException(`User '${user.email}' has been deleted`);
      if (!user.is_active)  throw new BadRequestException(`User '${user.email}' is inactive`);
    }

    return foundMap;
  }

  private async bulkStatusChange(
    organizationId: string,
    ids: string[],
    activate: boolean,
    operatedBy: string,
  ): Promise<BulkOperationResultDto> {
    const assignments = await this.sguRepo.find({
      where: { id: In(ids), organizationId, isDeleted: false },
      relations: ['serviceGroup'],
    });

    const foundIds  = new Set(assignments.map(a => a.id));
    const failedIds = ids.filter(id => !foundIds.has(id));

    const now = new Date();
    let succeeded = 0;

    for (const a of assignments) {
      try {
        if (activate) {
          if (!a.serviceGroup?.isActive) { failedIds.push(a.id); continue; }
          a.isActive   = true;
          a.disabledAt = null;
          a.disabledBy = null;
        } else {
          a.isActive   = false;
          a.disabledAt = now;
          a.disabledBy = operatedBy;
        }
        a.updatedBy = operatedBy;
        await this.sguRepo.save(a);
        succeeded++;
      } catch (err: any) {
        this.logger.warn(`Bulk status change failed for assignment ${a.id}`, err?.message);
        failedIds.push(a.id);
      }
    }

    return { succeeded, failed: failedIds.length, failedIds };
  }

  private async buildActivityCountMap(serviceGroupIds: string[]): Promise<Map<string, number>> {
    if (serviceGroupIds.length === 0) return new Map();

    const counts = await this.sgaRepo
      .createQueryBuilder('sga')
      .select('sga.serviceGroupId', 'serviceGroupId')
      .addSelect('COUNT(sga.id)', 'cnt')
      .where('sga.serviceGroupId IN (:...ids)', { ids: serviceGroupIds })
      .andWhere('sga.isActive = true')
      .groupBy('sga.serviceGroupId')
      .getRawMany<{ serviceGroupId: string; cnt: string }>();

    return new Map(counts.map(r => [r.serviceGroupId, parseInt(r.cnt, 10)]));
  }

  // ── Response mapper ───────────────────────────────────────────────

  private toResponse(
    a: ServiceGroupUser,
    sg: ServiceGroup | null,
    user: User | null,
  ): ServiceGroupUserResponseDto {
    return {
      id:                a.id,
      dguid:             a.dguid,
      organizationId:    a.organizationId,
      serviceGroupId:    a.serviceGroupId,
      serviceGroupCode:  sg?.code ?? '',
      serviceGroupName:  sg?.name ?? '',
      userId:            a.userId,
      userFullName:      user ? `${user.first_name} ${user.last_name ?? ''}`.trim() : '',
      userEmail:         user?.email ?? '',
      userPosition:      user?.position ?? '',
      assignmentType:    a.assignmentType,
      effectiveFrom:     a.effectiveFrom,
      effectiveTo:       a.effectiveTo,
      isPrimary:         a.isPrimary,
      isActive:          a.isActive,
      remarks:           a.remarks,
      disabledAt:        a.disabledAt,
      disabledBy:        a.disabledBy,
      createdBy:         a.createdBy,
      updatedBy:         a.updatedBy,
      createdAt:         a.createdAt,
      updatedAt:         a.updatedAt,
    };
  }
}
