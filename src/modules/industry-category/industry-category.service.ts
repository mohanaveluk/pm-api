import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { IndustryCategory } from './entities/industry-category.entity';
import {
  MasterCodeService,
  MasterSequenceKey,
} from 'src/common/services/master-code.service';
import { CreateIndustryCategoryDto } from './dto/create-industry-category.dto';
import { UpdateIndustryCategoryDto } from './dto/update-industry-category.dto';
import { IndustryCategoryQueryDto } from './dto/industry-category-query.dto';
import {
  IndustryCategoryResponseDto,
  IndustryCategoryDropdownDto,
  IndustryCategoryListResponseDto,
} from './dto/industry-category-response.dto';

const ALLOWED_SORT_FIELDS = new Set(['name', 'code', 'displayOrder', 'createdAt']);

@Injectable()
export class IndustryCategoryService {
  constructor(
    @InjectRepository(IndustryCategory)
    private readonly icRepo: Repository<IndustryCategory>,
    private readonly masterCodeService: MasterCodeService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────

  // code is server-generated: a per-organization sequence starting at 0001.
  // Generation and insert share one transaction, under a row lock on the
  // counter, so concurrent creates cannot be handed the same number.
  async create(
    organizationId: string,
    dto: CreateIndustryCategoryDto,
    createdBy: string,
  ): Promise<IndustryCategoryResponseDto> {
    await this.assertUniqueName(organizationId, dto.name);

    const saved = await this.masterCodeService.withGeneratedCode(
      organizationId,
      MasterSequenceKey.INDUSTRY_CATEGORY,
      async (code, queryRunner) => {
        const ic = queryRunner.manager.create(IndustryCategory, {
          ...dto,
          dguid:        uuidv4(),
          organizationId,
          code,
          isActive:     dto.isActive     ?? true,
          isSystem:     dto.isSystem     ?? false,
          displayOrder: dto.displayOrder ?? 0,
          createdBy,
        });
        return queryRunner.manager.save(IndustryCategory, ic);
      },
    ).catch(err => {
      if (err?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'An Industry Category with this code already exists in your organization',
        );
      }
      throw err;
    });

    return this.toResponse(await this.loadWithOrg(saved.id, organizationId));
  }

  // ── Find all (paginated) ──────────────────────────────────────────

  async findAll(
    organizationId: string,
    query: IndustryCategoryQueryDto,
  ): Promise<IndustryCategoryListResponseDto> {
    const {
      search, code, name, isActive, isSystem,
      page = 1, limit = 20,
      sortBy = 'displayOrder', sortOrder = 'ASC',
    } = query;

    const safeSortBy = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : 'displayOrder';
    const base: Record<string, any> = { organizationId, isDeleted: false };

    const where: Record<string, any>[] = search
      ? [
          { ...base, name:      ILike(`%${search}%`) },
          { ...base, code:      ILike(`%${search}%`) },
          { ...base, shortName: ILike(`%${search}%`) },
        ]
      : [{ ...base }];

    if (code     !== undefined) where.forEach(w => (w.code     = code));
    if (name     !== undefined) where.forEach(w => (w.name     = name));
    if (isActive !== undefined) where.forEach(w => (w.isActive = isActive));
    if (isSystem !== undefined) where.forEach(w => (w.isSystem = isSystem));

    const [items, total] = await this.icRepo.findAndCount({
      where,
      relations: { organization: true },
      order:     { [safeSortBy]: sortOrder },
      skip:      (page - 1) * limit,
      take:      limit,
    });

    return {
      items:      items.map(ic => this.toResponse(ic)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Find one by ID ────────────────────────────────────────────────

  async findOne(organizationId: string, id: string): Promise<IndustryCategoryResponseDto> {
    const ic = await this.findOrThrow(organizationId, id);
    return this.toResponse(ic);
  }

  // ── Find active (dropdown) ────────────────────────────────────────

  async findActive(organizationId: string): Promise<IndustryCategoryDropdownDto[]> {
    const items = await this.icRepo.find({
      where:  { organizationId, isActive: true, isDeleted: false },
      order:  { displayOrder: 'ASC', name: 'ASC' },
      select: ['id', 'code', 'name', 'shortName', 'displayOrder'],
    });
    return items.map(ic => ({
      id:           ic.id,
      code:         ic.code,
      name:         ic.name,
      shortName:    ic.shortName,
      displayOrder: ic.displayOrder,
    }));
  }

  // ── Update ────────────────────────────────────────────────────────

  async update(
    organizationId: string,
    id: string,
    dto: UpdateIndustryCategoryDto,
    updatedBy: string,
  ): Promise<IndustryCategoryResponseDto> {
    const ic = await this.findOrThrow(organizationId, id);

    // code is immutable — the DTO already omits it via OmitType, but guard in
    // the service layer too in case the caller bypasses DTO validation.
    if ((dto as any).code !== undefined) {
      throw new ConflictException('Industry Category code cannot be changed after creation');
    }

    if (dto.name && dto.name !== ic.name) {
      await this.assertUniqueName(organizationId, dto.name, id);
    }

    Object.assign(ic, dto);
    ic.updatedBy = updatedBy;

    await this.icRepo.save(ic);
    return this.toResponse(await this.loadWithOrg(ic.id, organizationId));
  }

  // ── Enable ────────────────────────────────────────────────────────

  async enable(organizationId: string, id: string, updatedBy: string): Promise<IndustryCategoryResponseDto> {
    const ic = await this.findOrThrow(organizationId, id);
    if (ic.isActive) throw new BadRequestException('Industry Category is already active');

    ic.isActive  = true;
    ic.updatedBy = updatedBy;

    await this.icRepo.save(ic);
    return this.toResponse(await this.loadWithOrg(ic.id, organizationId));
  }

  // ── Disable ───────────────────────────────────────────────────────

  async disable(organizationId: string, id: string, updatedBy: string): Promise<IndustryCategoryResponseDto> {
    const ic = await this.findOrThrow(organizationId, id);
    if (!ic.isActive) throw new BadRequestException('Industry Category is already inactive');

    // Pre-wired dependency guard — plug in repository counts here as the
    // Project / Department / Discipline modules start referencing this master:
    //   const usageCount = await this.projectRepo.count({ where: { industryCategoryId: id, isDeleted: false } });
    //   if (usageCount > 0) throw new ConflictException(`Cannot disable: ${usageCount} project(s) reference this category`);
    await this.assertNotInUse(id, 'disable');

    ic.isActive  = false;
    ic.updatedBy = updatedBy;

    await this.icRepo.save(ic);
    return this.toResponse(await this.loadWithOrg(ic.id, organizationId));
  }

  // ── Soft delete ───────────────────────────────────────────────────

  async remove(organizationId: string, id: string, deletedBy: string): Promise<void> {
    const ic = await this.findOrThrow(organizationId, id);

    if (ic.isSystem) {
      throw new ConflictException('System categories cannot be deleted');
    }

    // Pre-wired dependency guard — same pattern as disable above:
    //   const usageCount = await this.projectRepo.count({ where: { industryCategoryId: id, isDeleted: false } });
    //   if (usageCount > 0) throw new ConflictException(`Cannot delete: ${usageCount} project(s) reference this category`);
    await this.assertNotInUse(id, 'delete');

    ic.isDeleted = true;
    ic.deletedAt = new Date();
    ic.deletedBy = deletedBy;
    ic.isActive  = false;
    ic.updatedBy = deletedBy;

    await this.icRepo.save(ic);
  }

  // ── Private helpers ───────────────────────────────────────────────

  private async findOrThrow(organizationId: string, id: string): Promise<IndustryCategory> {
    const ic = await this.icRepo.findOne({
      where:     { id, organizationId, isDeleted: false },
      relations: { organization: true },
    });
    if (!ic) throw new NotFoundException('Industry Category not found');
    return ic;
  }

  private async loadWithOrg(id: string, organizationId: string): Promise<IndustryCategory> {
    return this.icRepo.findOne({
      where:     { id, organizationId },
      relations: { organization: true },
    });
  }

  // Retained as a safety net only — code is server-generated, so this can no
  // longer fail in practice. The unique index remains the real guarantee.
  private async assertUniqueCode(
    organizationId: string,
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.icRepo.findOne({
      where: { organizationId, code, isDeleted: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Industry Category with code '${code}' already exists in this organization`);
    }
  }

  private async assertUniqueName(
    organizationId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.icRepo.findOne({
      where: { organizationId, name, isDeleted: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Industry Category with name '${name}' already exists in this organization`);
    }
  }

  // Centralized dependency check — inject downstream repositories here as the
  // Project / Department / Discipline / Activity / Material Category hierarchy
  // is built out. The method signature is intentionally stable so callers
  // (disable, remove) never need to change.
  private async assertNotInUse(_id: string, _operation: 'disable' | 'delete'): Promise<void> {
    // Future checks:
    //   projectRepo, departmentRepo, disciplineRepo, activityRepo,
    //   materialCategoryRepo, supplierRepo
    // Example:
    //   const count = await this.projectRepo.count({ where: { industryCategoryId: id, isDeleted: false } });
    //   if (count > 0) throw new ConflictException(`Cannot ${operation}: ${count} Project record(s) reference this category`);
  }

  // ── Response mapper ───────────────────────────────────────────────

  private toResponse(ic: IndustryCategory): IndustryCategoryResponseDto {
    return {
      id:               ic.id,
      dguid:            ic.dguid,
      organizationId:   ic.organizationId,
      organizationName: ic.organization?.organizationName ?? '',
      organization:     { id: ic.organizationId, name: ic.organization?.organizationName, code: ic.organization?.organizationCode },
      code:             ic.code,
      name:             ic.name,
      shortName:        ic.shortName,
      description:      ic.description,
      displayOrder:     ic.displayOrder,
      isSystem:         ic.isSystem,
      isActive:         ic.isActive,
      remarks:          ic.remarks,
      createdBy:        ic.createdBy,
      updatedBy:        ic.updatedBy,
      createdAt:        ic.createdAt,
      updatedAt:        ic.updatedAt,
    };
  }
}
