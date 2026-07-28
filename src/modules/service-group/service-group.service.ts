import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
  InternalServerErrorException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ServiceGroup } from './entities/service-group.entity';
import { ServiceGroupActivity } from './entities/service-group-activity.entity';
import { ServiceGroupPermission } from './entities/service-group-permission.entity';
import { Activity } from '../activity/entities/activity.entity';
import {
  CreateServiceGroupDto,
  ActivityPermissionDto,
  CloneServiceGroupDto,
  CopyPermissionsDto,
} from './dto/create-service-group.dto';
import { UpdateServiceGroupDto } from './dto/update-service-group.dto';
import { ServiceGroupQueryDto } from './dto/service-group-query.dto';
import {
  ServiceGroupResponseDto,
  ServiceGroupListResponseDto,
  ServiceGroupListItemDto,
  ServiceGroupActivityResponseDto,
  ServiceGroupPermissionResponseDto,
  PermissionMatrixDto,
  PermissionMatrixRowDto,
} from './dto/service-group-response.dto';
import { GroupType, PermissionType } from './enums/permission-type.enum';

const ALLOWED_SORT_FIELDS = new Set(['name', 'code', 'createdAt', 'groupType']);

@Injectable()
export class ServiceGroupService {
  private readonly logger = new Logger(ServiceGroupService.name);

  constructor(
    @InjectRepository(ServiceGroup)
    private readonly sgRepo: Repository<ServiceGroup>,
    @InjectRepository(ServiceGroupActivity)
    private readonly sgaRepo: Repository<ServiceGroupActivity>,
    @InjectRepository(ServiceGroupPermission)
    private readonly sgpRepo: Repository<ServiceGroupPermission>,
    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Create ────────────────────────────────────────────────────────

  async create(
    organizationId: string,
    dto: CreateServiceGroupDto,
    createdBy: string,
  ): Promise<ServiceGroupResponseDto> {
    await this.assertUniqueCode(organizationId, dto.code);
    await this.assertUniqueName(organizationId, dto.name);

    const activities = dto.activities ?? [];
    await this.validateActivityInputs(organizationId, activities);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sg = queryRunner.manager.create(ServiceGroup, {
        dguid:          uuidv4(),
        organizationId,
        code:           dto.code,
        name:           dto.name,
        description:    dto.description,
        groupType:      GroupType.CUSTOM,
        isSystem:       false,
        isDefault:      dto.isDefault ?? false,
        isActive:       dto.isActive ?? true,
        remarks:        dto.remarks,
        createdBy,
      });
      const savedSg = await queryRunner.manager.save(ServiceGroup, sg);

      await this.persistActivitiesAndPermissions(
        queryRunner.manager,
        savedSg.id,
        activities,
      );

      await queryRunner.commitTransaction();

      return this.findOne(organizationId, savedSg.id);
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      if (err instanceof ConflictException || err instanceof BadRequestException || err instanceof NotFoundException) throw err;
      this.logger.error('Failed to create service group', err?.message);
      throw new InternalServerErrorException('Unable to create Service Group');
    } finally {
      await queryRunner.release();
    }
  }

  // ── Find all (paginated) ──────────────────────────────────────────

  async findAll(
    organizationId: string,
    query: ServiceGroupQueryDto,
  ): Promise<ServiceGroupListResponseDto> {
    const {
      search, isActive, groupType,
      page = 1, limit = 20, sortBy = 'name', sortOrder = 'ASC',
    } = query;

    const safeSortBy = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : 'name';

    const qb = this.sgRepo
      .createQueryBuilder('sg')
      .loadRelationCountAndMap('sg.activityCount', 'sg.serviceGroupActivities', 'sga',
        (qb) => qb.where('sga.isActive = true'),
      )
      .where('sg.organizationId = :organizationId', { organizationId })
      .andWhere('sg.isDeleted = false');

    if (isActive !== undefined) qb.andWhere('sg.isActive = :isActive', { isActive });
    if (groupType)              qb.andWhere('sg.groupType = :groupType', { groupType });
    if (search) {
      qb.andWhere('(sg.code LIKE :s OR sg.name LIKE :s OR sg.description LIKE :s)', { s: `%${search}%` });
    }

    qb.orderBy(`sg.${safeSortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map(sg => this.toListItem(sg)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Find one (full with activities + permissions) ─────────────────

  async findOne(organizationId: string, id: string): Promise<ServiceGroupResponseDto> {
    const sg = await this.findOrThrow(organizationId, id);

    const sgas = await this.sgaRepo.find({
      where: { serviceGroupId: sg.id },
      relations: ['activity', 'permissions'],
      order: { displayOrder: 'ASC' },
    });

    return this.toResponse(sg, sgas);
  }

  // ── Update ────────────────────────────────────────────────────────

  async update(
    organizationId: string,
    id: string,
    dto: UpdateServiceGroupDto,
    updatedBy: string,
  ): Promise<ServiceGroupResponseDto> {
    const sg = await this.findOrThrow(organizationId, id);

    // Immutability enforcement — code and name cannot be changed
    if ((dto as any).code !== undefined) {
      throw new ConflictException('Service Group code cannot be modified after creation');
    }
    if ((dto as any).name !== undefined) {
      throw new ConflictException('Service Group name cannot be modified after creation');
    }

    if (dto.activities !== undefined) {
      await this.validateActivityInputs(organizationId, dto.activities);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      sg.description = dto.description ?? sg.description;
      sg.remarks     = dto.remarks     ?? sg.remarks;
      sg.isDefault   = dto.isDefault   ?? sg.isDefault;
      sg.isActive    = dto.isActive    ?? sg.isActive;
      sg.updatedBy   = updatedBy;

      await queryRunner.manager.save(ServiceGroup, sg);

      if (dto.activities !== undefined) {
        // Full replace — remove existing activities (cascade deletes permissions)
        await queryRunner.manager.delete(ServiceGroupActivity, { serviceGroupId: sg.id });
        await this.persistActivitiesAndPermissions(
          queryRunner.manager,
          sg.id,
          dto.activities,
        );
      }

      await queryRunner.commitTransaction();
      return this.findOne(organizationId, id);
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      if (err instanceof ConflictException || err instanceof BadRequestException || err instanceof NotFoundException) throw err;
      this.logger.error('Failed to update service group', err?.message);
      throw new InternalServerErrorException('Unable to update Service Group');
    } finally {
      await queryRunner.release();
    }
  }

  // ── Disable / Enable ──────────────────────────────────────────────

  async disable(organizationId: string, id: string, updatedBy: string): Promise<ServiceGroupResponseDto> {
    const sg = await this.findOrThrow(organizationId, id);
    if (!sg.isActive) throw new BadRequestException('Service Group is already disabled');
    sg.isActive  = false;
    sg.updatedBy = updatedBy;
    await this.sgRepo.save(sg);
    return this.findOne(organizationId, id);
  }

  async enable(organizationId: string, id: string, updatedBy: string): Promise<ServiceGroupResponseDto> {
    const sg = await this.findOrThrow(organizationId, id);
    if (sg.isActive) throw new BadRequestException('Service Group is already active');
    sg.isActive  = true;
    sg.updatedBy = updatedBy;
    await this.sgRepo.save(sg);
    return this.findOne(organizationId, id);
  }

  // ── Soft delete ───────────────────────────────────────────────────

  async remove(organizationId: string, id: string, deletedBy: string): Promise<void> {
    const sg = await this.findOrThrow(organizationId, id);

    if (sg.isSystem) {
      throw new ConflictException('System Service Groups cannot be deleted');
    }

    // Guard: prevent deletion if assigned to active users.
    // Uncomment when UserServiceGroupAssignment entity is available:
    //   const assignedCount = await this.assignmentRepo.count({ where: { serviceGroupId: id, isActive: true } });
    //   if (assignedCount > 0) throw new ConflictException('Service Group is assigned to active users');

    sg.isDeleted = true;
    sg.deletedAt = new Date();
    sg.deletedBy = deletedBy;
    sg.isActive  = false;
    sg.updatedBy = deletedBy;

    await this.sgRepo.save(sg);
  }

  // ── Clone ─────────────────────────────────────────────────────────

  async clone(
    organizationId: string,
    sourceId: string,
    dto: CloneServiceGroupDto,
    createdBy: string,
  ): Promise<ServiceGroupResponseDto> {
    const source = await this.findOrThrow(organizationId, sourceId);
    await this.assertUniqueCode(organizationId, dto.code);
    await this.assertUniqueName(organizationId, dto.name);

    const sourceSgas = await this.sgaRepo.find({
      where: { serviceGroupId: source.id },
      relations: ['permissions'],
    });

    const activityInputs: ActivityPermissionDto[] = sourceSgas.map((sga, idx) => ({
      activityId:   sga.activityId,
      displayOrder: idx,
      permissions:  sga.permissions
        .filter(p => p.isAllowed)
        .map(p => p.permissionType),
    }));

    return this.create(
      organizationId,
      {
        code:        dto.code,
        name:        dto.name,
        description: dto.description ?? source.description,
        isActive:    true,
        activities:  activityInputs,
      },
      createdBy,
    );
  }

  // ── Copy permissions from another group ───────────────────────────

  async copyPermissions(
    organizationId: string,
    targetId: string,
    dto: CopyPermissionsDto,
    updatedBy: string,
  ): Promise<ServiceGroupResponseDto> {
    const [target, source] = await Promise.all([
      this.findOrThrow(organizationId, targetId),
      this.findOrThrow(organizationId, dto.sourceServiceGroupId),
    ]);

    if (target.id === source.id) {
      throw new BadRequestException('Source and target Service Groups must be different');
    }

    const sourceSgas = await this.sgaRepo.find({
      where: { serviceGroupId: source.id },
      relations: ['permissions'],
    });

    const activityInputs: ActivityPermissionDto[] = sourceSgas.map((sga, idx) => ({
      activityId:   sga.activityId,
      displayOrder: idx,
      permissions:  sga.permissions
        .filter(p => p.isAllowed)
        .map(p => p.permissionType),
    }));

    return this.update(
      organizationId,
      targetId,
      { activities: activityInputs },
      updatedBy,
    );
  }

  // ── Permission matrix ─────────────────────────────────────────────

  async getPermissionMatrix(organizationId: string, id: string): Promise<PermissionMatrixDto> {
    const sg = await this.findOrThrow(organizationId, id);

    const sgas = await this.sgaRepo.find({
      where: { serviceGroupId: sg.id },
      relations: ['activity', 'permissions'],
      order: { displayOrder: 'ASC' },
    });

    const columns = Object.values(PermissionType);

    const rows: PermissionMatrixRowDto[] = sgas.map(sga => {
      const permMap: Record<string, boolean> = {};
      for (const col of columns) {
        permMap[col] = false;
      }
      for (const perm of sga.permissions) {
        permMap[perm.permissionType] = perm.isAllowed;
      }
      return {
        activityId:   sga.activityId,
        activityCode: sga.activity?.code ?? '',
        activityName: sga.activity?.name ?? '',
        moduleGroup:  sga.activity?.moduleGroup ?? '',
        permissions:  permMap as Record<PermissionType, boolean>,
      };
    });

    return {
      serviceGroupId:   sg.id,
      serviceGroupName: sg.name,
      columns,
      rows,
    };
  }

  // ── Available activities for an org ──────────────────────────────

  async getAvailableActivities(organizationId: string): Promise<Activity[]> {
    return this.activityRepo.find({
      where: { organizationId, isActive: true, isDeleted: false },
      order: { moduleGroup: 'ASC', displayOrder: 'ASC', name: 'ASC' },
    });
  }

  // ── Private helpers ───────────────────────────────────────────────

  private async findOrThrow(organizationId: string, id: string): Promise<ServiceGroup> {
    const sg = await this.sgRepo.findOne({
      where: { id, organizationId, isDeleted: false },
    });
    if (!sg) throw new NotFoundException('Service Group not found');
    return sg;
  }

  private async assertUniqueCode(organizationId: string, code: string, excludeId?: string): Promise<void> {
    const existing = await this.sgRepo.findOne({
      where: { organizationId, code, isDeleted: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Service Group code '${code}' already exists in this organization`);
    }
  }

  private async assertUniqueName(organizationId: string, name: string, excludeId?: string): Promise<void> {
    const existing = await this.sgRepo.findOne({
      where: { organizationId, name, isDeleted: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Service Group name '${name}' already exists in this organization`);
    }
  }

  private async validateActivityInputs(
    organizationId: string,
    inputs: ActivityPermissionDto[],
  ): Promise<void> {
    if (inputs.length === 0) return;

    // Duplicate activity IDs in request
    const activityIds = inputs.map(i => i.activityId);
    const uniqueIds = new Set(activityIds);
    if (uniqueIds.size !== activityIds.length) {
      throw new BadRequestException('Duplicate activityId detected in the request');
    }

    // Each activity must exist and be active in org
    const found = await this.activityRepo.findByIds(activityIds);
    const foundMap = new Map(found.map(a => [a.id, a]));

    for (const input of inputs) {
      const act = foundMap.get(input.activityId);
      if (!act) throw new NotFoundException(`Activity not found: ${input.activityId}`);
      if (act.organizationId !== organizationId) {
        throw new BadRequestException(`Activity ${input.activityId} does not belong to this organization`);
      }
      if (!act.isActive || act.isDeleted) {
        throw new BadRequestException(`Activity '${act.name}' is inactive or deleted`);
      }

      // Duplicate permissions within the same activity
      const permSet = new Set(input.permissions);
      if (permSet.size !== input.permissions.length) {
        throw new BadRequestException(`Duplicate permissions detected for activity '${act.name}'`);
      }
    }
  }

  private async persistActivitiesAndPermissions(
    manager: any,
    serviceGroupId: string,
    inputs: ActivityPermissionDto[],
  ): Promise<void> {
    for (let idx = 0; idx < inputs.length; idx++) {
      const input = inputs[idx];

      const sga = manager.create(ServiceGroupActivity, {
        serviceGroupId,
        activityId:   input.activityId,
        displayOrder: input.displayOrder ?? idx,
        isActive:     true,
      });
      const savedSga = await manager.save(ServiceGroupActivity, sga);

      const permissions = input.permissions.map(pt =>
        manager.create(ServiceGroupPermission, {
          serviceGroupActivityId: savedSga.id,
          permissionType:         pt,
          isAllowed:              true,
        }),
      );
      await manager.save(ServiceGroupPermission, permissions);
    }
  }

  // ── Response mappers ──────────────────────────────────────────────

  private toResponse(sg: ServiceGroup, sgas: ServiceGroupActivity[]): ServiceGroupResponseDto {
    return {
      id:             sg.id,
      dguid:          sg.dguid,
      organizationId: sg.organizationId,
      code:           sg.code,
      name:           sg.name,
      description:    sg.description,
      groupType:      sg.groupType,
      isSystem:       sg.isSystem,
      isDefault:      sg.isDefault,
      isActive:       sg.isActive,
      remarks:        sg.remarks,
      createdBy:      sg.createdBy,
      updatedBy:      sg.updatedBy,
      createdAt:      sg.createdAt,
      updatedAt:      sg.updatedAt,
      activities:     sgas.map(sga => this.toActivityResponse(sga)),
    };
  }

  private toActivityResponse(sga: ServiceGroupActivity): ServiceGroupActivityResponseDto {
    return {
      id:               sga.id,
      activityId:       sga.activityId,
      activityCode:     sga.activity?.code     ?? '',
      activityName:     sga.activity?.name     ?? '',
      activityShortName: sga.activity?.shortName ?? '',
      moduleGroup:      sga.activity?.moduleGroup ?? '',
      icon:             sga.activity?.icon     ?? '',
      routeUrl:         sga.activity?.routeUrl ?? '',
      featureKey:       sga.activity?.featureKey ?? '',
      displayOrder:     sga.displayOrder,
      isActive:         sga.isActive,
      permissions:      (sga.permissions ?? []).map(p => this.toPermissionResponse(p)),
    };
  }

  private toPermissionResponse(p: ServiceGroupPermission): ServiceGroupPermissionResponseDto {
    return {
      id:             p.id,
      permissionType: p.permissionType,
      isAllowed:      p.isAllowed,
    };
  }

  private toListItem(sg: ServiceGroup & { activityCount?: number }): ServiceGroupListItemDto {
    return {
      id:             sg.id,
      dguid:          sg.dguid,
      organizationId: sg.organizationId,
      code:           sg.code,
      name:           sg.name,
      description:    sg.description,
      groupType:      sg.groupType,
      isSystem:       sg.isSystem,
      isDefault:      sg.isDefault,
      isActive:       sg.isActive,
      remarks:        sg.remarks,
      activityCount:  (sg as any).activityCount ?? 0,
      createdAt:      sg.createdAt,
      updatedAt:      sg.updatedAt,
    };
  }
}
