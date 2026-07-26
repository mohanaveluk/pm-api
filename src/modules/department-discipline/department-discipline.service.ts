import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
  InternalServerErrorException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DepartmentDiscipline } from './entities/department-discipline.entity';
import { Department } from '../department/entity/department.entity';
import { Discipline } from '../discipline/entity/discipline.entity';
import { CreateDepartmentDisciplineDto, BulkCreateDepartmentDisciplineDto } from './dto/create-department-discipline.dto';
import { UpdateDepartmentDisciplineDto } from './dto/update-department-discipline.dto';
import { DepartmentDisciplineQueryDto } from './dto/department-discipline-query.dto';
import {
  BulkCreateResultDto,
  DepartmentDisciplineListResponseDto,
  DepartmentDisciplineResponseDto,
  DepartmentInDisciplineDto,
  DisciplineInDepartmentDto,
} from './dto/department-discipline-response.dto';

const ALLOWED_SORT_FIELDS = new Set(['displayOrder', 'createdAt', 'departmentId', 'disciplineId']);

@Injectable()
export class DepartmentDisciplineService {
  private readonly logger = new Logger(DepartmentDisciplineService.name);

  constructor(
    @InjectRepository(DepartmentDiscipline)
    private readonly mappingRepo: Repository<DepartmentDiscipline>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @InjectRepository(Discipline)
    private readonly discRepo: Repository<Discipline>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Create single mapping ─────────────────────────────────────────

  async create(
    organizationId: string,
    dto: CreateDepartmentDisciplineDto,
    createdBy: string,
  ): Promise<DepartmentDisciplineResponseDto> {
    const [dept, disc] = await Promise.all([
      this.validateDepartment(organizationId, dto.departmentId),
      this.validateDiscipline(organizationId, dto.disciplineId),
    ]);

    await this.assertUnique(organizationId, dto.departmentId, dto.disciplineId);

    try {
      const mapping = this.mappingRepo.create({
        dguid: uuidv4(),
        organizationId,
        departmentId: dto.departmentId,
        disciplineId: dto.disciplineId,
        displayOrder: dto.displayOrder ?? 0,
        remarks: dto.remarks,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
        createdBy,
      });

      const saved = await this.mappingRepo.save(mapping);
      return this.toResponse(saved, dept, disc);
    } catch (err) {
      this.logger.error('Failed to create department-discipline mapping', err);
      throw new InternalServerErrorException('Unable to create mapping');
    }
  }

  // ── Bulk create ───────────────────────────────────────────────────

  async bulkCreate(
    organizationId: string,
    dto: BulkCreateDepartmentDisciplineDto,
    createdBy: string,
  ): Promise<BulkCreateResultDto> {
    const dept = await this.validateDepartment(organizationId, dto.departmentId);

    // Validate all disciplines exist and belong to org
    const disciplines = await this.deptRepo.manager.find(Discipline, {
      where: { id: In(dto.disciplineIds), organizationId, isDeleted: false },
    });

    const foundIds = new Set(disciplines.map(d => d.id));
    const missing = dto.disciplineIds.filter(id => !foundIds.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(`Discipline(s) not found: ${missing.join(', ')}`);
    }

    const inactiveDisciplines = disciplines.filter(d => !d.isActive);
    if (inactiveDisciplines.length > 0) {
      throw new BadRequestException(
        `Discipline(s) are inactive: ${inactiveDisciplines.map(d => d.name).join(', ')}`,
      );
    }

    // Find which ones already exist (skip duplicates)
    const existing = await this.mappingRepo.find({
      where: {
        organizationId,
        departmentId: dto.departmentId,
        disciplineId: In(dto.disciplineIds),
        isDeleted: false,
      },
    });
    const existingDisciplineIds = new Set(existing.map(m => m.disciplineId));
    const toCreate = dto.disciplineIds.filter(id => !existingDisciplineIds.has(id));
    const skippedIds = dto.disciplineIds.filter(id => existingDisciplineIds.has(id));

    if (toCreate.length === 0) {
      return { created: [], skipped: skippedIds.length, skippedIds };
    }

    const disciplineMap = new Map(disciplines.map(d => [d.id, d]));

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const entities = toCreate.map((disciplineId, idx) =>
        this.mappingRepo.create({
          dguid: uuidv4(),
          organizationId,
          departmentId: dto.departmentId,
          disciplineId,
          displayOrder: idx,
          isActive: true,
          isDefault: false,
          createdBy,
        }),
      );

      const saved = await queryRunner.manager.save(DepartmentDiscipline, entities);
      await queryRunner.commitTransaction();

      const created = saved.map(m => this.toResponse(m, dept, disciplineMap.get(m.disciplineId)!));
      return { created, skipped: skippedIds.length, skippedIds };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Bulk create failed, transaction rolled back', err);
      throw new InternalServerErrorException('Unable to create mappings');
    } finally {
      await queryRunner.release();
    }
  }

  // ── Find all (paginated) ──────────────────────────────────────────

  async findAll(
    organizationId: string,
    query: DepartmentDisciplineQueryDto,
  ): Promise<DepartmentDisciplineListResponseDto> {
    const {
      search, isActive, departmentId, disciplineId,
      page = 1, limit = 20, sortBy = 'displayOrder', sortOrder = 'ASC',
    } = query;

    const safeSortBy = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : 'displayOrder';

    const qb = this.mappingRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.department', 'dept')
      .leftJoinAndSelect('m.discipline', 'disc')
      .where('m.organizationId = :organizationId', { organizationId })
      .andWhere('m.isDeleted = false');

    if (departmentId) qb.andWhere('m.departmentId = :departmentId', { departmentId });
    if (disciplineId) qb.andWhere('m.disciplineId = :disciplineId', { disciplineId });
    if (isActive !== undefined) qb.andWhere('m.isActive = :isActive', { isActive });

    if (search) {
      qb.andWhere(
        '(dept.name LIKE :s OR disc.name LIKE :s OR m.remarks LIKE :s)',
        { s: `%${search}%` },
      );
    }

    qb.orderBy(`m.${safeSortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map(m => this.toResponse(m, m.department, m.discipline)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Find one ──────────────────────────────────────────────────────

  async findOne(organizationId: string, id: string): Promise<DepartmentDisciplineResponseDto> {
    const mapping = await this.findOrThrow(organizationId, id);
    return this.toResponse(mapping, mapping.department, mapping.discipline);
  }

  // ── Get disciplines for a department ─────────────────────────────

  async getDisciplinesByDepartment(
    organizationId: string,
    departmentId: string,
  ): Promise<DisciplineInDepartmentDto[]> {
    await this.validateDepartment(organizationId, departmentId);

    const mappings = await this.mappingRepo.find({
      where: { organizationId, departmentId, isDeleted: false, isActive: true },
      relations: ['discipline'],
      order: { displayOrder: 'ASC' },
    });

    return mappings.map(m => ({
      id:             m.id,
      disciplineId:   m.disciplineId,
      disciplineName: m.discipline?.name ?? '',
      disciplineCode: m.discipline?.code ?? '',
      displayOrder:   m.displayOrder,
      isDefault:      m.isDefault,
      isActive:       m.isActive,
    }));
  }

  // ── Get departments for a discipline ─────────────────────────────

  async getDepartmentsByDiscipline(
    organizationId: string,
    disciplineId: string,
  ): Promise<DepartmentInDisciplineDto[]> {
    await this.validateDiscipline(organizationId, disciplineId);

    const mappings = await this.mappingRepo.find({
      where: { organizationId, disciplineId, isDeleted: false, isActive: true },
      relations: ['department'],
      order: { displayOrder: 'ASC' },
    });

    return mappings.map(m => ({
      id:             m.id,
      departmentId:   m.departmentId,
      departmentName: m.department?.name ?? '',
      departmentCode: m.department?.code ?? '',
      displayOrder:   m.displayOrder,
      isDefault:      m.isDefault,
      isActive:       m.isActive,
    }));
  }

  // ── Get active mappings ───────────────────────────────────────────

  async findActive(organizationId: string): Promise<DepartmentDisciplineResponseDto[]> {
    const mappings = await this.mappingRepo.find({
      where: { organizationId, isActive: true, isDeleted: false },
      relations: ['department', 'discipline'],
      order: { displayOrder: 'ASC' },
    });
    return mappings.map(m => this.toResponse(m, m.department, m.discipline));
  }

  // ── Update ────────────────────────────────────────────────────────

  async update(
    organizationId: string,
    id: string,
    dto: UpdateDepartmentDisciplineDto,
    updatedBy: string,
  ): Promise<DepartmentDisciplineResponseDto> {
    const mapping = await this.findOrThrow(organizationId, id);

    Object.assign(mapping, dto);
    mapping.updatedBy = updatedBy;

    try {
      const saved = await this.mappingRepo.save(mapping);
      return this.toResponse(saved, saved.department, saved.discipline);
    } catch (err) {
      this.logger.error('Failed to update mapping', err);
      throw new InternalServerErrorException('Unable to update mapping');
    }
  }

  // ── Soft delete ───────────────────────────────────────────────────

  async remove(organizationId: string, id: string, deletedBy: string): Promise<void> {
    const mapping = await this.findOrThrow(organizationId, id);

    // Guard: prevent deletion if referenced by downstream modules
    // Future modules (Activities, Features, Materials, etc.) should be checked here.
    // Example:
    //   const refCount = await this.activityRepo.count({ where: { mappingId: id, isDeleted: false } });
    //   if (refCount > 0) throw new ConflictException('Mapping is referenced by existing Activities');

    mapping.isDeleted = true;
    mapping.deletedAt = new Date();
    mapping.deletedBy = deletedBy;
    mapping.isActive  = false;

    await this.mappingRepo.save(mapping);
  }

  // ── Private helpers ───────────────────────────────────────────────

  private async findOrThrow(organizationId: string, id: string): Promise<DepartmentDiscipline> {
    const mapping = await this.mappingRepo.findOne({
      where: { id, organizationId, isDeleted: false },
      relations: ['department', 'discipline'],
    });
    if (!mapping) throw new NotFoundException('Department-Discipline mapping not found');
    return mapping;
  }

  private async validateDepartment(organizationId: string, departmentId: string): Promise<Department> {
    const dept = await this.deptRepo.findOne({
      where: { id: departmentId, organizationId, isDeleted: false },
    });
    if (!dept) throw new NotFoundException('Department not found');
    if (!dept.isActive) throw new BadRequestException('Department is inactive');
    return dept;
  }

  private async validateDiscipline(organizationId: string, disciplineId: string): Promise<Discipline> {
    const disc = await this.discRepo.findOne({
      where: { id: disciplineId, organizationId, isDeleted: false },
    });
    if (!disc) throw new NotFoundException('Discipline not found');
    if (!disc.isActive) throw new BadRequestException('Discipline is inactive');
    return disc;
  }

  private async assertUnique(
    organizationId: string,
    departmentId: string,
    disciplineId: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.mappingRepo.findOne({
      where: { organizationId, departmentId, disciplineId, isDeleted: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Mapping already exists for this Department-Discipline combination');
    }
  }

  private toResponse(
    mapping: DepartmentDiscipline,
    dept: Department | null,
    disc: Discipline | null,
  ): DepartmentDisciplineResponseDto {
    return {
      id:             mapping.id,
      dguid:          mapping.dguid,
      organizationId: mapping.organizationId,
      departmentId:   mapping.departmentId,
      departmentName: dept?.name ?? '',
      departmentCode: dept?.code ?? '',
      disciplineId:   mapping.disciplineId,
      disciplineName: disc?.name ?? '',
      disciplineCode: disc?.code ?? '',
      displayOrder:   mapping.displayOrder,
      remarks:        mapping.remarks,
      isDefault:      mapping.isDefault,
      isActive:       mapping.isActive,
      createdBy:      mapping.createdBy,
      updatedBy:      mapping.updatedBy,
      createdAt:      mapping.createdAt,
      updatedAt:      mapping.updatedAt,
    };
  }
}
