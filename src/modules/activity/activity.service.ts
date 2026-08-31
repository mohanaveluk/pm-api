import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
  InternalServerErrorException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Activity } from './entities/activity.entity';
import {
  MasterCodeService,
  MasterSequenceKey,
} from 'src/common/services/master-code.service';
import { Department } from '../department/entity/department.entity';
import { Discipline } from '../discipline/entity/discipline.entity';
import { DepartmentDiscipline } from '../department-discipline/entities/department-discipline.entity';
import {
  CreateActivityDto,
  BulkCreateActivityDto,
  BulkActivityItemDto,
} from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityQueryDto } from './dto/activity-query.dto';
import {
  ActivityResponseDto,
  ActivityListResponseDto,
  ActivityDropdownItemDto,
  BulkCreateActivityResultDto,
} from './dto/activity-response.dto';

const ALLOWED_SORT_FIELDS = new Set(['name', 'code', 'displayOrder', 'createdAt', 'moduleGroup']);

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @InjectRepository(Discipline)
    private readonly discRepo: Repository<Discipline>,
    @InjectRepository(DepartmentDiscipline)
    private readonly mappingRepo: Repository<DepartmentDiscipline>,
    private readonly dataSource: DataSource,
    private readonly masterCodeService: MasterCodeService,
  ) {}

  // ── Create single ─────────────────────────────────────────────────

  async create(
    organizationId: string,
    dto: CreateActivityDto,
    createdBy: string,
  ): Promise<ActivityResponseDto> {
    const mapping = await this.validateMapping(organizationId, dto.departmentDisciplineId);

    this.assertMappingConsistency(mapping, dto.departmentId, dto.disciplineId);

    const [dept, disc] = await Promise.all([
      this.loadDepartment(mapping.departmentId),
      this.loadDiscipline(mapping.disciplineId),
    ]);

    await this.assertUniqueName(organizationId, mapping.id, dto.name);

    try {
      // code is server-generated: a per-organization sequence starting at 0001.
      // Generation and insert share one transaction, under a row lock on the
      // counter, so concurrent creates cannot be handed the same number.
      const saved = await this.masterCodeService.withGeneratedCode(
        organizationId,
        MasterSequenceKey.ACTIVITY,
        async (code, queryRunner) => {
          const entity = queryRunner.manager.create(Activity, {
        dguid:                 uuidv4(),
        organizationId,
        departmentId:          mapping.departmentId,
        disciplineId:          mapping.disciplineId,
        departmentDisciplineId: mapping.id,
        code,
        name:                  dto.name,
        shortName:             dto.shortName,
        description:           dto.description,
        displayOrder:          dto.displayOrder ?? 0,
        moduleGroup:           dto.moduleGroup,
        icon:                  dto.icon,
        routeUrl:              dto.routeUrl,
        featureKey:            dto.featureKey,
        remarks:               dto.remarks,
        isSystem:              dto.isSystem ?? false,
        isDefault:             dto.isDefault ?? false,
        isActive:              dto.isActive ?? true,
        createdBy,
          });
          return queryRunner.manager.save(Activity, entity);
        },
      );

      return this.toResponse(saved, dept, disc);
    } catch (err: any) {
      if (err instanceof ConflictException || err instanceof NotFoundException) throw err;
      this.logger.error('Failed to create activity', err?.message);
      throw new InternalServerErrorException('Unable to create Activity');
    }
  }

  // ── Bulk create ───────────────────────────────────────────────────

  async bulkCreate(
    organizationId: string,
    dto: BulkCreateActivityDto,
    createdBy: string,
  ): Promise<BulkCreateActivityResultDto> {
    const mapping = await this.validateMapping(organizationId, dto.departmentDisciplineId);

    const [dept, disc] = await Promise.all([
      this.loadDepartment(mapping.departmentId),
      this.loadDiscipline(mapping.disciplineId),
    ]);

    // Codes are server-generated, so an incoming item can no longer collide by
    // code — every one would get a fresh number. Duplicate detection therefore
    // keys on NAME, which is the field that actually identifies an activity
    // within a DepartmentDiscipline mapping.
    const incomingNames = dto.activities.map(a => a.name.trim());

    const existing = await this.activityRepo.find({
      where: {
        organizationId,
        departmentDisciplineId: mapping.id,
        name: In(incomingNames),
        isDeleted: false,
      },
      select: ['name'],
    });
    const existingNames = new Set(existing.map(a => a.name));

    // Also de-duplicate within the payload itself: two items with the same
    // name in one request would otherwise both be created.
    const skippedNames: string[] = [];
    const seen = new Set<string>();
    const toCreate = dto.activities.filter(a => {
      const name = a.name.trim();
      if (existingNames.has(name) || seen.has(name)) {
        skippedNames.push(name);
        return false;
      }
      seen.add(name);
      return true;
    });

    if (toCreate.length === 0) {
      return { created: [], skipped: skippedNames.length, skippedNames };
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // One code per item, all drawn from the same locked counter inside this
      // transaction — so a bulk create and a concurrent single create can never
      // be handed the same number, and a rollback returns every number taken.
      const codes: string[] = [];
      for (let i = 0; i < toCreate.length; i++) {
        codes.push(
          await this.masterCodeService.generateCode(
            queryRunner, organizationId, MasterSequenceKey.ACTIVITY,
          ),
        );
      }

      const entities = toCreate.map((item: BulkActivityItemDto, idx: number) =>
        this.activityRepo.create({
          dguid:                  uuidv4(),
          organizationId,
          departmentId:           mapping.departmentId,
          disciplineId:           mapping.disciplineId,
          departmentDisciplineId: mapping.id,
          code:                   codes[idx],
          name:                   item.name.trim(),
          shortName:              item.shortName,
          description:            item.description,
          displayOrder:           item.displayOrder ?? idx,
          moduleGroup:            item.moduleGroup,
          icon:                   item.icon,
          routeUrl:               item.routeUrl,
          featureKey:             item.featureKey,
          isActive:               true,
          isSystem:               false,
          isDefault:              false,
          createdBy,
        }),
      );

      const saved = await queryRunner.manager.save(Activity, entities);
      await queryRunner.commitTransaction();

      return {
        created: saved.map(a => this.toResponse(a, dept, disc)),
        skipped: skippedNames.length,
        skippedNames,
      };
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Bulk activity create failed, transaction rolled back', err?.message);
      throw new InternalServerErrorException('Unable to create Activities');
    } finally {
      await queryRunner.release();
    }
  }

  // ── Find all (paginated + filtered) ──────────────────────────────

  async findAll(
    organizationId: string,
    query: ActivityQueryDto,
  ): Promise<ActivityListResponseDto> {
    const {
      search, isActive, departmentId, disciplineId, departmentDisciplineId, moduleGroup,
      page = 1, limit = 20, sortBy = 'displayOrder', sortOrder = 'ASC',
    } = query;

    const safeSortBy = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : 'displayOrder';

    const qb = this.activityRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.department', 'dept')
      .leftJoinAndSelect('a.discipline', 'disc')
      .where('a.organizationId = :organizationId', { organizationId })
      .andWhere('a.isDeleted = false');

    if (departmentId)          qb.andWhere('a.departmentId = :departmentId',                   { departmentId });
    if (disciplineId)          qb.andWhere('a.disciplineId = :disciplineId',                   { disciplineId });
    if (departmentDisciplineId) qb.andWhere('a.departmentDisciplineId = :departmentDisciplineId', { departmentDisciplineId });
    if (moduleGroup)           qb.andWhere('a.moduleGroup = :moduleGroup',                     { moduleGroup });
    if (isActive !== undefined) qb.andWhere('a.isActive = :isActive',                          { isActive });

    if (search) {
      qb.andWhere(
        '(a.code LIKE :s OR a.name LIKE :s OR a.description LIKE :s OR a.moduleGroup LIKE :s)',
        { s: `%${search}%` },
      );
    }

    qb.orderBy(`a.${safeSortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map(a => this.toResponse(a, a.department, a.discipline)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Find one ──────────────────────────────────────────────────────

  async findOne(organizationId: string, id: string): Promise<ActivityResponseDto> {
    const activity = await this.findOrThrow(organizationId, id);
    return this.toResponse(activity, activity.department, activity.discipline);
  }

  // ── Active list (for dropdowns) ───────────────────────────────────

  async findActive(organizationId: string): Promise<ActivityDropdownItemDto[]> {
    const items = await this.activityRepo.find({
      where: { organizationId, isActive: true, isDeleted: false },
      order: { moduleGroup: 'ASC', displayOrder: 'ASC', name: 'ASC' },
    });
    return items.map(a => this.toDropdown(a));
  }

  // ── By department ─────────────────────────────────────────────────

  async findByDepartment(
    organizationId: string,
    departmentId: string,
  ): Promise<ActivityDropdownItemDto[]> {
    await this.assertDepartmentExists(organizationId, departmentId);

    const items = await this.activityRepo.find({
      where: { organizationId, departmentId, isActive: true, isDeleted: false },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    return items.map(a => this.toDropdown(a));
  }

  // ── By discipline ─────────────────────────────────────────────────

  async findByDiscipline(
    organizationId: string,
    disciplineId: string,
  ): Promise<ActivityDropdownItemDto[]> {
    await this.assertDisciplineExists(organizationId, disciplineId);

    const items = await this.activityRepo.find({
      where: { organizationId, disciplineId, isActive: true, isDeleted: false },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    return items.map(a => this.toDropdown(a));
  }

  // ── By DepartmentDiscipline mapping ───────────────────────────────

  async findByDepartmentDiscipline(
    organizationId: string,
    departmentDisciplineId: string,
  ): Promise<ActivityDropdownItemDto[]> {
    await this.validateMapping(organizationId, departmentDisciplineId);

    const items = await this.activityRepo.find({
      where: { organizationId, departmentDisciplineId, isActive: true, isDeleted: false },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    return items.map(a => this.toDropdown(a));
  }

  // ── Update ────────────────────────────────────────────────────────

  async update(
    organizationId: string,
    id: string,
    dto: UpdateActivityDto,
    updatedBy: string,
  ): Promise<ActivityResponseDto> {
    const activity = await this.findOrThrow(organizationId, id);

    // code is server-generated and immutable — the DTO no longer carries it,
    // but guard here in case a caller bypasses DTO validation.
    if ((dto as any).code !== undefined) {
      throw new ConflictException('Activity code is server-generated and cannot be changed');
    }
    if (dto.name && dto.name !== activity.name) {
      await this.assertUniqueName(organizationId, activity.departmentDisciplineId, dto.name, id);
    }

    Object.assign(activity, dto);
    activity.updatedBy = updatedBy;

    try {
      const saved = await this.activityRepo.save(activity);
      return this.toResponse(saved, saved.department, saved.discipline);
    } catch (err: any) {
      this.logger.error('Failed to update activity', err?.message);
      throw new InternalServerErrorException('Unable to update Activity');
    }
  }

  // ── Soft delete ───────────────────────────────────────────────────

  async remove(organizationId: string, id: string, deletedBy: string): Promise<void> {
    const activity = await this.findOrThrow(organizationId, id);

    if (activity.isSystem) {
      throw new ConflictException('System activities cannot be deleted');
    }

    // Future downstream reference checks should be added here.
    // Example:
    //   const featureCount = await this.featureRepo.count({ where: { activityId: id, isDeleted: false } });
    //   if (featureCount > 0) throw new ConflictException('Activity is referenced by existing Features');

    activity.isDeleted = true;
    activity.deletedAt = new Date();
    activity.deletedBy = deletedBy;
    activity.isActive  = false;

    await this.activityRepo.save(activity);
  }

  // ── Private helpers ───────────────────────────────────────────────

  private async findOrThrow(organizationId: string, id: string): Promise<Activity> {
    const activity = await this.activityRepo.findOne({
      where: { id, organizationId, isDeleted: false },
      relations: ['department', 'discipline'],
    });
    if (!activity) throw new NotFoundException('Activity not found');
    return activity;
  }

  private async validateMapping(
    organizationId: string,
    departmentDisciplineId: string,
  ): Promise<DepartmentDiscipline> {
    const mapping = await this.mappingRepo.findOne({
      where: { id: departmentDisciplineId, organizationId, isDeleted: false },
    });
    if (!mapping) throw new NotFoundException('Department-Discipline mapping not found');
    if (!mapping.isActive) throw new BadRequestException('Department-Discipline mapping is inactive');
    return mapping;
  }

  private assertMappingConsistency(
    mapping: DepartmentDiscipline,
    departmentId: string,
    disciplineId: string,
  ): void {
    if (mapping.departmentId !== departmentId) {
      throw new BadRequestException(
        'departmentId does not match the supplied DepartmentDiscipline mapping',
      );
    }
    if (mapping.disciplineId !== disciplineId) {
      throw new BadRequestException(
        'disciplineId does not match the supplied DepartmentDiscipline mapping',
      );
    }
  }

  private async loadDepartment(departmentId: string): Promise<Department> {
    const dept = await this.deptRepo.findOne({ where: { id: departmentId } });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  private async loadDiscipline(disciplineId: string): Promise<Discipline> {
    const disc = await this.discRepo.findOne({ where: { id: disciplineId } });
    if (!disc) throw new NotFoundException('Discipline not found');
    return disc;
  }

  private async assertDepartmentExists(organizationId: string, departmentId: string): Promise<void> {
    const exists = await this.deptRepo.findOne({
      where: { id: departmentId, organizationId, isDeleted: false },
    });
    if (!exists) throw new NotFoundException('Department not found');
  }

  private async assertDisciplineExists(organizationId: string, disciplineId: string): Promise<void> {
    const exists = await this.discRepo.findOne({
      where: { id: disciplineId, organizationId, isDeleted: false },
    });
    if (!exists) throw new NotFoundException('Discipline not found');
  }

  private async assertUniqueCode(
    organizationId: string,
    departmentDisciplineId: string,
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.activityRepo.findOne({
      where: { organizationId, departmentDisciplineId, code, isDeleted: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Activity code '${code}' already exists in this mapping`);
    }
  }

  private async assertUniqueName(
    organizationId: string,
    departmentDisciplineId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.activityRepo.findOne({
      where: { organizationId, departmentDisciplineId, name, isDeleted: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Activity name '${name}' already exists in this mapping`);
    }
  }

  // ── Response mappers ──────────────────────────────────────────────

  private toResponse(
    a: Activity,
    dept: Department | null,
    disc: Discipline | null,
  ): ActivityResponseDto {
    return {
      id:                     a.id,
      dguid:                  a.dguid,
      organizationId:         a.organizationId,
      departmentId:           a.departmentId,
      departmentName:         dept?.name ?? '',
      departmentCode:         dept?.code ?? '',
      disciplineId:           a.disciplineId,
      disciplineName:         disc?.name ?? '',
      disciplineCode:         disc?.code ?? '',
      departmentDisciplineId: a.departmentDisciplineId,
      code:                   a.code,
      name:                   a.name,
      shortName:              a.shortName,
      description:            a.description,
      displayOrder:           a.displayOrder,
      moduleGroup:            a.moduleGroup,
      icon:                   a.icon,
      routeUrl:               a.routeUrl,
      featureKey:             a.featureKey,
      remarks:                a.remarks,
      isSystem:               a.isSystem,
      isDefault:              a.isDefault,
      isActive:               a.isActive,
      createdBy:              a.createdBy,
      updatedBy:              a.updatedBy,
      createdAt:              a.createdAt,
      updatedAt:              a.updatedAt,
    };
  }

  private toDropdown(a: Activity): ActivityDropdownItemDto {
    return {
      id:           a.id,
      code:         a.code,
      name:         a.name,
      shortName:    a.shortName,
      moduleGroup:  a.moduleGroup,
      icon:         a.icon,
      routeUrl:     a.routeUrl,
      featureKey:   a.featureKey,
      displayOrder: a.displayOrder,
    };
  }
}
