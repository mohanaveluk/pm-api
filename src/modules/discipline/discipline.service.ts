import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Discipline } from './entity/discipline.entity';
import {
  MasterCodeService,
  MasterSequenceKey,
} from 'src/common/services/master-code.service';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';
import { DisciplineQueryDto } from './dto/discipline-query.dto';
import { DisciplineListResponseDto, DisciplineResponseDto } from './dto/discipline-response.dto';

const ALLOWED_SORT_FIELDS = new Set(['name', 'code', 'displayOrder', 'createdAt']);

@Injectable()
export class DisciplineService {
  constructor(
    @InjectRepository(Discipline)
    private readonly deptRepo: Repository<Discipline>,
    private readonly masterCodeService: MasterCodeService,
  ) {}

  async create(
    organizationId: string,
    dto: CreateDisciplineDto,
    createdBy: string,
  ): Promise<DisciplineResponseDto> {
    // code is server-generated: a per-organization sequence starting at 0001.
    // Generation and insert share one transaction, under a row lock on the
    // counter, so concurrent creates cannot be handed the same number.
    const saved = await this.masterCodeService.withGeneratedCode(
      organizationId,
      MasterSequenceKey.DISCIPLINE,
      async (code, queryRunner) => {
        const disc = queryRunner.manager.create(Discipline, {
          ...dto,
          dguid: uuidv4(),
          organizationId,
          code,
          isActive: dto.isActive ?? true,
          displayOrder: dto.displayOrder ?? 0,
          createdBy,
        });
        return queryRunner.manager.save(Discipline, disc);
      },
    ).catch(err => {
      if (err?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'A Discipline with this code already exists in your organization',
        );
      }
      throw err;
    });

    return this.toResponse(saved);
  }

  async findAll(
    organizationId: string,
    query: DisciplineQueryDto,
  ): Promise<DisciplineListResponseDto> {
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

  async findOne(organizationId: string, id: string): Promise<DisciplineResponseDto> {
    const dept = await this.findActiveOrThrow(organizationId, id);
    return this.toResponse(dept);
  }

  async findActive(organizationId: string): Promise<DisciplineResponseDto[]> {
    const depts = await this.deptRepo.find({
      where: { organizationId, isActive: true, isDeleted: false },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    return depts.map(d => this.toResponse(d));
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateDisciplineDto,
    updatedBy: string,
  ): Promise<DisciplineResponseDto> {
    const dept = await this.findActiveOrThrow(organizationId, id);

    // code is server-generated and immutable — the DTO no longer carries it,
    // but guard here in case a caller bypasses DTO validation.
    if ((dto as any).code !== undefined) {
      throw new ConflictException('Discipline code is server-generated and cannot be changed');
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

  private async findActiveOrThrow(organizationId: string, id: string): Promise<Discipline> {
    const dept = await this.deptRepo.findOne({
      where: { id, organizationId, isDeleted: false },
    });
    if (!dept) throw new NotFoundException(`Discipline not found`);
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
      throw new ConflictException(`Discipline code '${code}' already exists in this organization`);
    }
  }

  private toResponse(dept: Discipline): DisciplineResponseDto {
    return {
      id:             dept.id,
      dguid:          dept.dguid,
      organizationId: dept.organizationId,
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
