import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MaterialGroup } from './entities/material-group.entity';
import {
  MasterCodeService,
  MasterSequenceKey,
} from 'src/common/services/master-code.service';
import { MaterialCategory } from '../material-category/entities/material-category.entity';
import { CreateMaterialGroupDto } from './dto/create-material-group.dto';
import { UpdateMaterialGroupDto } from './dto/update-material-group.dto';
import { MaterialGroupQueryDto } from './dto/material-group-query.dto';
import {
  MaterialGroupResponseDto,
  MaterialGroupDropdownDto,
  MaterialGroupListResponseDto,
} from './dto/material-group-response.dto';

const ALLOWED_SORT_FIELDS = new Set(['name', 'code', 'displayOrder', 'createdAt']);

@Injectable()
export class MaterialGroupService {
  constructor(
    @InjectRepository(MaterialGroup)
    private readonly mgRepo: Repository<MaterialGroup>,
    @InjectRepository(MaterialCategory)
    private readonly mcRepo: Repository<MaterialCategory>,
    private readonly masterCodeService: MasterCodeService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────

  async create(
    organizationId: string,
    dto: CreateMaterialGroupDto,
    createdBy: string,
  ): Promise<MaterialGroupResponseDto> {
    await this.validateCategory(organizationId, dto.materialCategoryId);
    await this.assertUniqueName(organizationId, dto.materialCategoryId, dto.name);

    // The sequence is per ORGANIZATION, not per category, so generated codes
    // are unique organization-wide — comfortably stricter than the
    // (organization, category, code) uniqueness the table enforces.
    const saved = await this.masterCodeService.withGeneratedCode(
      organizationId,
      MasterSequenceKey.MATERIAL_GROUP,
      async (code, queryRunner) => {
        const mg = queryRunner.manager.create(MaterialGroup, {
          ...dto,
          dguid:        uuidv4(),
          organizationId,
          code,
          isActive:     dto.isActive     ?? true,
          isSystem:     dto.isSystem     ?? false,
          displayOrder: dto.displayOrder ?? 0,
          createdBy,
        });
        return queryRunner.manager.save(MaterialGroup, mg);
      },
    ).catch(err => {
      if (err?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'A Material Group with this code already exists in your organization',
        );
      }
      throw err;
    });

    return this.toResponse(await this.loadWithRelations(saved.id, organizationId));
  }

  // ── Find all (paginated) ──────────────────────────────────────────

  async findAll(
    organizationId: string,
    query: MaterialGroupQueryDto,
  ): Promise<MaterialGroupListResponseDto> {
    const {
      search, materialCategoryId, isActive, isSystem,
      page = 1, limit = 20,
      sortBy = 'displayOrder', sortOrder = 'ASC',
    } = query;

    const safeSortBy = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : 'displayOrder';
    const base: Record<string, any> = { organizationId, isDeleted: false };

    if (materialCategoryId) base.materialCategoryId = materialCategoryId;

    const where: Record<string, any>[] = search
      ? [
          { ...base, name:      ILike(`%${search}%`) },
          { ...base, code:      ILike(`%${search}%`) },
          { ...base, shortName: ILike(`%${search}%`) },
        ]
      : [{ ...base }];

    if (isActive !== undefined) where.forEach(w => (w.isActive = isActive));
    if (isSystem !== undefined) where.forEach(w => (w.isSystem = isSystem));

    const [items, total] = await this.mgRepo.findAndCount({
      where,
      relations: { organization: true, materialCategory: true },
      order:     { [safeSortBy]: sortOrder },
      skip:      (page - 1) * limit,
      take:      limit,
    });

    return {
      items:      items.map(mg => this.toResponse(mg)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Find one by ID ────────────────────────────────────────────────

  async findOne(organizationId: string, id: string): Promise<MaterialGroupResponseDto> {
    const mg = await this.findOrThrow(organizationId, id);
    return this.toResponse(mg);
  }

  // ── Find active (dropdown) ────────────────────────────────────────
  // Accepts an optional materialCategoryId to scope the dropdown to a
  // specific parent category — the primary use case in Angular forms.

  async findActive(
    organizationId: string,
    materialCategoryId?: string,
  ): Promise<MaterialGroupDropdownDto[]> {
    const where: Record<string, any> = { organizationId, isActive: true, isDeleted: false };
    if (materialCategoryId) where.materialCategoryId = materialCategoryId;

    const items = await this.mgRepo.find({
      where,
      relations: { materialCategory: true },
      order:     { displayOrder: 'ASC', name: 'ASC' },
    });

    return items.map(mg => ({
      id:                   mg.id,
      materialCategoryId:   mg.materialCategoryId,
      materialCategoryCode: mg.materialCategory?.code ?? '',
      code:                 mg.code,
      name:                 mg.name,
      shortName:            mg.shortName,
      displayOrder:         mg.displayOrder,
    }));
  }

  // ── Update ────────────────────────────────────────────────────────

  async update(
    organizationId: string,
    id: string,
    dto: UpdateMaterialGroupDto,
    updatedBy: string,
  ): Promise<MaterialGroupResponseDto> {
    const mg = await this.findOrThrow(organizationId, id);

    // code and materialCategoryId are immutable — OmitType already blocks
    // them in the DTO; guard here as a defence-in-depth measure.
    if ((dto as any).code !== undefined) {
      throw new ConflictException('Material Group code cannot be changed after creation');
    }
    if ((dto as any).materialCategoryId !== undefined) {
      throw new ConflictException('Material Group cannot be moved to a different category after creation');
    }

    if (dto.name && dto.name !== mg.name) {
      await this.assertUniqueName(organizationId, mg.materialCategoryId, dto.name, id);
    }

    Object.assign(mg, dto);
    mg.updatedBy = updatedBy;

    await this.mgRepo.save(mg);
    return this.toResponse(await this.loadWithRelations(mg.id, organizationId));
  }

  // ── Enable ────────────────────────────────────────────────────────

  async enable(organizationId: string, id: string, updatedBy: string): Promise<MaterialGroupResponseDto> {
    const mg = await this.findOrThrow(organizationId, id);
    if (mg.isActive) throw new BadRequestException('Material Group is already active');

    // Parent category must be active before a group can be re-enabled
    if (!mg.materialCategory?.isActive) {
      throw new BadRequestException(
        `Cannot enable: parent category '${mg.materialCategory?.name}' is inactive`,
      );
    }

    mg.isActive  = true;
    mg.updatedBy = updatedBy;

    await this.mgRepo.save(mg);
    return this.toResponse(await this.loadWithRelations(mg.id, organizationId));
  }

  // ── Disable ───────────────────────────────────────────────────────

  async disable(organizationId: string, id: string, updatedBy: string): Promise<MaterialGroupResponseDto> {
    const mg = await this.findOrThrow(organizationId, id);
    if (!mg.isActive) throw new BadRequestException('Material Group is already inactive');

    // Pre-wired dependency guard — plug in downstream repository counts here:
    //   const usageCount = await this.materialSubcategoryRepo.count({ where: { materialGroupId: id, isDeleted: false } });
    //   if (usageCount > 0) throw new ConflictException(`Cannot disable: ${usageCount} subcategory record(s) reference this group`);
    await this.assertNotInUse(id, 'disable');

    mg.isActive  = false;
    mg.updatedBy = updatedBy;

    await this.mgRepo.save(mg);
    return this.toResponse(await this.loadWithRelations(mg.id, organizationId));
  }

  // ── Soft delete ───────────────────────────────────────────────────

  async remove(organizationId: string, id: string, deletedBy: string): Promise<void> {
    const mg = await this.findOrThrow(organizationId, id);

    if (mg.isSystem) {
      throw new ConflictException('System groups cannot be deleted');
    }

    // Pre-wired dependency guard:
    //   const usageCount = await this.materialSubcategoryRepo.count({ where: { materialGroupId: id, isDeleted: false } });
    //   if (usageCount > 0) throw new ConflictException(`Cannot delete: ${usageCount} subcategory record(s) reference this group`);
    await this.assertNotInUse(id, 'delete');

    mg.isDeleted = true;
    mg.deletedAt = new Date();
    mg.deletedBy = deletedBy;
    mg.isActive  = false;
    mg.updatedBy = deletedBy;

    await this.mgRepo.save(mg);
  }

  // ── Private helpers ───────────────────────────────────────────────

  private async findOrThrow(organizationId: string, id: string): Promise<MaterialGroup> {
    const mg = await this.mgRepo.findOne({
      where:     { id, organizationId, isDeleted: false },
      relations: { organization: true, materialCategory: true },
    });
    if (!mg) throw new NotFoundException('Material Group not found');
    return mg;
  }

  private async loadWithRelations(id: string, organizationId: string): Promise<MaterialGroup> {
    return this.mgRepo.findOne({
      where:     { id, organizationId },
      relations: { organization: true, materialCategory: true },
    });
  }

  private async validateCategory(organizationId: string, materialCategoryId: string): Promise<void> {
    const cat = await this.mcRepo.findOne({
      where: { id: materialCategoryId, organizationId, isDeleted: false },
    });
    if (!cat) {
      throw new NotFoundException(`Material Category not found: ${materialCategoryId}`);
    }
    if (!cat.isActive) {
      throw new BadRequestException(
        `Cannot create group under inactive category '${cat.name}'`,
      );
    }
  }

  // Retained as a safety net only — code is server-generated, so this can no
  // longer fail in practice. The unique index remains the real guarantee.
  private async assertUniqueCode(
    organizationId: string,
    materialCategoryId: string,
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.mgRepo.findOne({
      where: { organizationId, materialCategoryId, code, isDeleted: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `Material Group with code '${code}' already exists under this category`,
      );
    }
  }

  private async assertUniqueName(
    organizationId: string,
    materialCategoryId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.mgRepo.findOne({
      where: { organizationId, materialCategoryId, name, isDeleted: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `Material Group with name '${name}' already exists under this category`,
      );
    }
  }

  // Centralized dependency check — inject downstream repos here as the
  // hierarchy (Material Subcategory → Classification → Master) is built out.
  // Method signature is stable so callers (disable, remove) never change.
  private async assertNotInUse(_id: string, _operation: 'disable' | 'delete'): Promise<void> {
    // Future checks:
    //   materialSubcategoryRepo, materialClassificationRepo, materialMasterRepo
    // Example:
    //   const count = await this.materialSubcategoryRepo.count({ where: { materialGroupId: id, isDeleted: false } });
    //   if (count > 0) throw new ConflictException(`Cannot ${operation}: ${count} subcategory record(s) reference this group`);
  }

  // ── Response mapper ───────────────────────────────────────────────

  private toResponse(mg: MaterialGroup): MaterialGroupResponseDto {
    return {
      id:                   mg.id,
      dguid:                mg.dguid,
      organizationId:       mg.organizationId,
      organizationName:     mg.organization?.organizationName ?? '',
      organization:         {
        id:   mg.organizationId,
        name: mg.organization?.organizationName,
        code: mg.organization?.organizationCode,
      },
      materialCategoryId:   mg.materialCategoryId,
      materialCategoryCode: mg.materialCategory?.code ?? '',
      materialCategoryName: mg.materialCategory?.name ?? '',
      code:                 mg.code,
      name:                 mg.name,
      shortName:            mg.shortName,
      description:          mg.description,
      displayOrder:         mg.displayOrder,
      isSystem:             mg.isSystem,
      isActive:             mg.isActive,
      remarks:              mg.remarks,
      createdBy:            mg.createdBy,
      updatedBy:            mg.updatedBy,
      createdAt:            mg.createdAt,
      updatedAt:            mg.updatedAt,
    };
  }
}
