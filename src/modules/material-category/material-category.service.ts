import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MaterialCategory } from './entities/material-category.entity';
import { CreateMaterialCategoryDto } from './dto/create-material-category.dto';
import { UpdateMaterialCategoryDto } from './dto/update-material-category.dto';
import { MaterialCategoryQueryDto } from './dto/material-category-query.dto';
import {
  MaterialCategoryResponseDto,
  MaterialCategoryDropdownDto,
  MaterialCategoryListResponseDto,
} from './dto/material-category-response.dto';

const ALLOWED_SORT_FIELDS = new Set(['name', 'code', 'displayOrder', 'createdAt']);

@Injectable()
export class MaterialCategoryService {
  constructor(
    @InjectRepository(MaterialCategory)
    private readonly mcRepo: Repository<MaterialCategory>,
  ) {}

  // ── Create ────────────────────────────────────────────────────────

  async create(
    organizationId: string,
    dto: CreateMaterialCategoryDto,
    createdBy: string,
  ): Promise<MaterialCategoryResponseDto> {
    await this.assertUniqueCode(organizationId, dto.code);
    await this.assertUniqueName(organizationId, dto.name);

    const mc = this.mcRepo.create({
      ...dto,
      dguid:        uuidv4(),
      organizationId,
      isActive:     dto.isActive     ?? true,
      isSystem:     dto.isSystem     ?? false,
      displayOrder: dto.displayOrder ?? 0,
      createdBy,
    });

    const saved = await this.mcRepo.save(mc);
    return this.toResponse(await this.loadWithOrg(saved.id, organizationId));
  }

  // ── Find all (paginated) ──────────────────────────────────────────

  async findAll(
    organizationId: string,
    query: MaterialCategoryQueryDto,
  ): Promise<MaterialCategoryListResponseDto> {
    const {
      search, isActive, isSystem,
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

    if (isActive  !== undefined) where.forEach(w => (w.isActive  = isActive));
    if (isSystem  !== undefined) where.forEach(w => (w.isSystem  = isSystem));

    const [items, total] = await this.mcRepo.findAndCount({
      where,
      relations: { organization: true },
      order:     { [safeSortBy]: sortOrder },
      skip:      (page - 1) * limit,
      take:      limit,
    });

    return {
      items:      items.map(mc => this.toResponse(mc)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Find one by ID ────────────────────────────────────────────────

  async findOne(organizationId: string, id: string): Promise<MaterialCategoryResponseDto> {
    const mc = await this.findOrThrow(organizationId, id);
    return this.toResponse(mc);
  }

  // ── Find active (dropdown) ────────────────────────────────────────

  async findActive(organizationId: string): Promise<MaterialCategoryDropdownDto[]> {
    const items = await this.mcRepo.find({
      where:  { organizationId, isActive: true, isDeleted: false },
      order:  { displayOrder: 'ASC', name: 'ASC' },
      select: ['id', 'code', 'name', 'shortName', 'displayOrder'],
    });
    return items.map(mc => ({
      id:           mc.id,
      code:         mc.code,
      name:         mc.name,
      shortName:    mc.shortName,
      displayOrder: mc.displayOrder,
    }));
  }

  // ── Update ────────────────────────────────────────────────────────

  async update(
    organizationId: string,
    id: string,
    dto: UpdateMaterialCategoryDto,
    updatedBy: string,
  ): Promise<MaterialCategoryResponseDto> {
    const mc = await this.findOrThrow(organizationId, id);

    // code is immutable — the DTO already omits it via OmitType, but guard in
    // the service layer too in case the caller bypasses DTO validation.
    if ((dto as any).code !== undefined) {
      throw new ConflictException('Material Category code cannot be changed after creation');
    }

    if (dto.name && dto.name !== mc.name) {
      await this.assertUniqueName(organizationId, dto.name, id);
    }

    Object.assign(mc, dto);
    mc.updatedBy = updatedBy;

    await this.mcRepo.save(mc);
    return this.toResponse(await this.loadWithOrg(mc.id, organizationId));
  }

  // ── Enable ────────────────────────────────────────────────────────

  async enable(organizationId: string, id: string, updatedBy: string): Promise<MaterialCategoryResponseDto> {
    const mc = await this.findOrThrow(organizationId, id);
    if (mc.isActive) throw new BadRequestException('Material Category is already active');

    mc.isActive  = true;
    mc.updatedBy = updatedBy;

    await this.mcRepo.save(mc);
    return this.toResponse(await this.loadWithOrg(mc.id, organizationId));
  }

  // ── Disable ───────────────────────────────────────────────────────

  async disable(organizationId: string, id: string, updatedBy: string): Promise<MaterialCategoryResponseDto> {
    const mc = await this.findOrThrow(organizationId, id);
    if (!mc.isActive) throw new BadRequestException('Material Category is already inactive');

    // Pre-wired dependency guard — plug in repository counts here when
    // Material Master module exists:
    //   const usageCount = await this.materialMasterRepo.count({ where: { materialCategoryId: id, isDeleted: false } });
    //   if (usageCount > 0) throw new ConflictException(`Cannot disable: ${usageCount} material(s) reference this category`);
    await this.assertNotInUse(id, 'disable');

    mc.isActive  = false;
    mc.updatedBy = updatedBy;

    await this.mcRepo.save(mc);
    return this.toResponse(await this.loadWithOrg(mc.id, organizationId));
  }

  // ── Soft delete ───────────────────────────────────────────────────

  async remove(organizationId: string, id: string, deletedBy: string): Promise<void> {
    const mc = await this.findOrThrow(organizationId, id);

    if (mc.isSystem) {
      throw new ConflictException('System categories cannot be deleted');
    }

    // Pre-wired dependency guard — same pattern as disable above:
    //   const usageCount = await this.materialMasterRepo.count({ where: { materialCategoryId: id, isDeleted: false } });
    //   if (usageCount > 0) throw new ConflictException(`Cannot delete: ${usageCount} material(s) reference this category`);
    await this.assertNotInUse(id, 'delete');

    mc.isDeleted = true;
    mc.deletedAt = new Date();
    mc.deletedBy = deletedBy;
    mc.isActive  = false;
    mc.updatedBy = deletedBy;

    await this.mcRepo.save(mc);
  }

  // ── Private helpers ───────────────────────────────────────────────

  private async findOrThrow(organizationId: string, id: string): Promise<MaterialCategory> {
    const mc = await this.mcRepo.findOne({
      where:     { id, organizationId, isDeleted: false },
      relations: { organization: true },
    });
    if (!mc) throw new NotFoundException('Material Category not found');
    return mc;
  }

  private async loadWithOrg(id: string, organizationId: string): Promise<MaterialCategory> {
    return this.mcRepo.findOne({
      where:     { id, organizationId },
      relations: { organization: true },
    });
  }

  private async assertUniqueCode(
    organizationId: string,
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.mcRepo.findOne({
      where: { organizationId, code, isDeleted: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Material Category with code '${code}' already exists in this organization`);
    }
  }

  private async assertUniqueName(
    organizationId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.mcRepo.findOne({
      where: { organizationId, name, isDeleted: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Material Category with name '${name}' already exists in this organization`);
    }
  }

  // Centralized dependency check — inject downstream repositories here as
  // the Material Master module hierarchy is built out. The method signature
  // is intentionally stable so callers (disable, remove) never need to change.
  private async assertNotInUse(_id: string, _operation: 'disable' | 'delete'): Promise<void> {
    // Future checks:
    //   materialMasterRepo, purchaseRequisitionRepo, rfqRepo, poRepo, inventoryRepo
    // Example:
    //   const count = await this.materialMasterRepo.count({ where: { materialCategoryId: id, isDeleted: false } });
    //   if (count > 0) throw new ConflictException(`Cannot ${operation}: ${count} Material Master record(s) reference this category`);
  }

  // ── Response mapper ───────────────────────────────────────────────

  private toResponse(mc: MaterialCategory): MaterialCategoryResponseDto {
    return {
      id:               mc.id,
      dguid:            mc.dguid,
      organizationId:   mc.organizationId,
      organizationName: mc.organization?.organizationName ?? '',
      organization:     { id: mc.organizationId, name: mc.organization?.organizationName, code: mc.organization?.organizationCode },
      code:             mc.code,
      name:             mc.name,
      shortName:        mc.shortName,
      description:      mc.description,
      displayOrder:     mc.displayOrder,
      isSystem:         mc.isSystem,
      isActive:         mc.isActive,
      remarks:          mc.remarks,
      createdBy:        mc.createdBy,
      updatedBy:        mc.updatedBy,
      createdAt:        mc.createdAt,
      updatedAt:        mc.updatedAt,
    };
  }
}
