import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Department } from './entity/department.entity';
import {
  MasterCodeService,
  MasterSequenceKey,
} from 'src/common/services/master-code.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentQueryDto } from './dto/department-query.dto';
import { DepartmentListResponseDto, DepartmentResponseDto } from './dto/department-response.dto';

const ALLOWED_SORT_FIELDS = new Set(['name', 'code', 'displayOrder', 'createdAt']);

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    private readonly masterCodeService: MasterCodeService,
  ) {}

  async create(
    organizationId: string,
    dto: CreateDepartmentDto,
    createdBy: string,
  ): Promise<DepartmentResponseDto> {
    // code is server-generated: a per-organization sequence starting at 0001.
    // Generation and insert share one transaction, under a row lock on the
    // counter, so concurrent creates cannot be handed the same number.
    const saved = await this.masterCodeService.withGeneratedCode(
      organizationId,
      MasterSequenceKey.DEPARTMENT,
      async (code, queryRunner) => {
        const dept = queryRunner.manager.create(Department, {
          ...dto,
          dguid: uuidv4(),
          organizationId,
          code,
          isActive: dto.isActive ?? true,
          displayOrder: dto.displayOrder ?? 0,
          createdBy,
        });
        return queryRunner.manager.save(Department, dept);
      },
    ).catch(err => {
      if (err?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'A Department with this code already exists in your organization',
        );
      }
      throw err;
    });

    return this.toResponse(saved);
  }

  async findAll(
    organizationId: string,
    query: DepartmentQueryDto,
  ): Promise<DepartmentListResponseDto> {
    const {
      search, isActive, page = 1, limit = 20,
      sortBy = 'displayOrder', sortOrder = 'ASC',
    } = query;

    const safeSortBy = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : 'displayOrder';

    const where: any[] = [];

    const base = { organizationId, isDeleted: false };

    if (search) {
      where.push(
        { ...base, name:      ILike(`%${search}%`) },
        { ...base, code:      ILike(`%${search}%`) },
        { ...base, shortName: ILike(`%${search}%`) },
      );
    } else {
      where.push(base);
    }

    if (isActive !== undefined) {
      where.forEach(w => (w.isActive = isActive));
    }

    const [items, total] = await this.deptRepo.findAndCount({
      where,
      relations: {
        organization: true,
      },      
      order: { [safeSortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map(d => this.toResponse(d)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(organizationId: string, id: string): Promise<DepartmentResponseDto> {
    const dept = await this.findActiveOrThrow(organizationId, id);
    return this.toResponse(dept);
  }

  async findActive(organizationId: string): Promise<DepartmentResponseDto[]> {
    const depts = await this.deptRepo.find({
      where: { organizationId, isActive: true, isDeleted: false },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    return depts.map(d => this.toResponse(d));
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateDepartmentDto,
    updatedBy: string,
  ): Promise<DepartmentResponseDto> {
    const dept = await this.findActiveOrThrow(organizationId, id);

    // code is server-generated and immutable — the DTO no longer carries it,
    // but guard here in case a caller bypasses DTO validation.
    if ((dto as any).code !== undefined) {
      throw new ConflictException('Department code is server-generated and cannot be changed');
    }

    Object.assign(dept, dto);
    dept.updatedBy = updatedBy;

    const saved = await this.deptRepo.save(dept);
    return this.toResponse(saved);
  }

  async remove(organizationId: string, id: string, deletedBy: string): Promise<void> {
    const dept = await this.findActiveOrThrow(organizationId, id);

    dept.isDeleted = true;
    dept.deletedAt = new Date();
    dept.deletedBy = deletedBy;
    dept.isActive = false;

    await this.deptRepo.save(dept);
  }

  // ── helpers ──────────────────────────────────────────────────────

  private async findActiveOrThrow(organizationId: string, id: string): Promise<Department> {
    const dept = await this.deptRepo.findOne({
      where: { id, organizationId, isDeleted: false },
    });
    if (!dept) throw new NotFoundException(`Department not found`);
    return dept;
  }

  // Retained as a safety net only — code is server-generated, so this can no
  // longer fail in practice. The unique index remains the real guarantee.
  private async assertUniqueCode(
    organizationId: string,
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.deptRepo.findOne({
      where: { organizationId, code, isDeleted: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Department code '${code}' already exists in this organization`);
    }
  }

  private toResponse(dept: Department): DepartmentResponseDto {
    return {
      id:             dept.id,
      dguid:          dept.dguid,
      organizationId: dept.organizationId,
      // Optional-chained: create/update/findOne load the department without the
      // organization relation, so an unguarded dereference threw here.
      organizationName: dept.organization?.organizationName ?? '',
      organization:   {id: dept.organizationId, name: dept.organization?.organizationName},
      code:           dept.code,
      name:           dept.name,
      shortName:      dept.shortName,
      description:    dept.description,
      displayOrder:   dept.displayOrder,
      isActive:       dept.isActive,
      remarks:        dept.remarks,
      createdBy:      dept.createdBy,
      updatedBy:      dept.updatedBy,
      createdAt:      dept.createdAt,
      updatedAt:      dept.updatedAt,
    };
  }
}
