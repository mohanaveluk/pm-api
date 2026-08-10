import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UnitOfMeasurement } from './entities/unit-of-measurement.entity';
import { CreateUnitOfMeasurementDto } from './dto/create-unit-of-measurement.dto';
import { UpdateUnitOfMeasurementDto } from './dto/update-unit-of-measurement.dto';
import { UnitOfMeasurementQueryDto } from './dto/unit-of-measurement-query.dto';
import {
  UnitOfMeasurementResponseDto,
  UnitOfMeasurementDropdownDto,
  UnitOfMeasurementListResponseDto,
} from './dto/unit-of-measurement-response.dto';
import { UomType } from './enums/uom-type.enum';

const ALLOWED_SORT_FIELDS = new Set(['name', 'code', 'uomType', 'displayOrder', 'createdAt']);

@Injectable()
export class UnitOfMeasurementService {
  constructor(
    @InjectRepository(UnitOfMeasurement)
    private readonly uomRepo: Repository<UnitOfMeasurement>,
  ) {}

  // ── Create ────────────────────────────────────────────────────────

  async create(
    organizationId: string,
    dto: CreateUnitOfMeasurementDto,
    createdBy: string,
  ): Promise<UnitOfMeasurementResponseDto> {
    await this.assertUniqueCode(organizationId, dto.code);
    await this.assertUniqueName(organizationId, dto.name);

    const uom = this.uomRepo.create({
      ...dto,
      dguid:        uuidv4(),
      organizationId,
      uomType:      dto.uomType      ?? UomType.OTHER,
      isActive:     dto.isActive     ?? true,
      displayOrder: dto.displayOrder ?? 0,
      createdBy,
    });

    const saved = await this.uomRepo.save(uom);
    return this.toResponse(await this.loadWithOrg(saved.id, organizationId));
  }

  // ── Find all (paginated) ──────────────────────────────────────────

  async findAll(
    organizationId: string,
    query: UnitOfMeasurementQueryDto,
  ): Promise<UnitOfMeasurementListResponseDto> {
    const {
      search, uomType, isActive,
      page = 1, limit = 20,
      sortBy = 'displayOrder', sortOrder = 'ASC',
    } = query;

    const safeSortBy = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : 'displayOrder';
    const base: Record<string, any> = { organizationId, isDeleted: false };

    if (uomType !== undefined) base.uomType = uomType;

    const where: Record<string, any>[] = search
      ? [
          { ...base, name:      ILike(`%${search}%`) },
          { ...base, code:      ILike(`%${search}%`) },
          { ...base, symbol:    ILike(`%${search}%`) },
          { ...base, shortName: ILike(`%${search}%`) },
        ]
      : [{ ...base }];

    if (isActive !== undefined) where.forEach(w => (w.isActive = isActive));

    const [items, total] = await this.uomRepo.findAndCount({
      where,
      relations: { organization: true },
      order:     { [safeSortBy]: sortOrder },
      skip:      (page - 1) * limit,
      take:      limit,
    });

    return {
      items:      items.map(u => this.toResponse(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Find one by ID ────────────────────────────────────────────────

  async findOne(organizationId: string, id: string): Promise<UnitOfMeasurementResponseDto> {
    const uom = await this.findActiveOrThrow(organizationId, id);
    return this.toResponse(uom);
  }

  // ── Find active (dropdown) ────────────────────────────────────────
  // Accepts an optional uomType to scope the list to a measurement family —
  // the primary use case for cascading dropdowns in Material Master / PR forms.

  async findActive(
    organizationId: string,
    uomType?: UomType,
  ): Promise<UnitOfMeasurementDropdownDto[]> {
    const where: Record<string, any> = { organizationId, isActive: true, isDeleted: false };
    if (uomType !== undefined) where.uomType = uomType;

    const items = await this.uomRepo.find({
      where,
      order: { displayOrder: 'ASC', name: 'ASC' },
      select: ['id', 'code', 'name', 'symbol', 'shortName', 'uomType', 'displayOrder'],
    });

    return items.map(u => ({
      id:           u.id,
      code:         u.code,
      name:         u.name,
      symbol:       u.symbol,
      shortName:    u.shortName,
      uomType:      u.uomType,
      displayOrder: u.displayOrder,
    }));
  }

  // ── Update ────────────────────────────────────────────────────────

  async update(
    organizationId: string,
    id: string,
    dto: UpdateUnitOfMeasurementDto,
    updatedBy: string,
  ): Promise<UnitOfMeasurementResponseDto> {
    const uom = await this.findActiveOrThrow(organizationId, id);

    // code is immutable — OmitType already blocks it; guard here as defence-in-depth.
    if ((dto as any).code !== undefined) {
      throw new ConflictException('UOM code cannot be changed after creation');
    }

    if (dto.name && dto.name !== uom.name) {
      await this.assertUniqueName(organizationId, dto.name, id);
    }

    Object.assign(uom, dto);
    uom.updatedBy = updatedBy;

    await this.uomRepo.save(uom);
    return this.toResponse(await this.loadWithOrg(uom.id, organizationId));
  }

  // ── Soft delete ───────────────────────────────────────────────────

  async remove(organizationId: string, id: string, deletedBy: string): Promise<void> {
    const uom = await this.findActiveOrThrow(organizationId, id);

    // Pre-wired dependency guard — plug in downstream counts when
    // Material Master / PR / PO modules exist:
    //   const usageCount = await this.materialMasterRepo.count({ where: { purchaseUomId: id, isDeleted: false } });
    //   if (usageCount > 0) throw new ConflictException(`Cannot delete: ${usageCount} Material Master record(s) reference this UOM`);
    await this.assertNotInUse(id);

    uom.isDeleted = true;
    uom.deletedAt = new Date();
    uom.deletedBy = deletedBy;
    uom.isActive  = false;
    uom.updatedBy = deletedBy;

    await this.uomRepo.save(uom);
  }

  // ── Private helpers ───────────────────────────────────────────────

  private async findActiveOrThrow(organizationId: string, id: string): Promise<UnitOfMeasurement> {
    const uom = await this.uomRepo.findOne({
      where:     { id, organizationId, isDeleted: false },
      relations: { organization: true },
    });
    if (!uom) throw new NotFoundException('Unit of Measurement not found');
    return uom;
  }

  private async loadWithOrg(id: string, organizationId: string): Promise<UnitOfMeasurement> {
    return this.uomRepo.findOne({
      where:     { id, organizationId },
      relations: { organization: true },
    });
  }

  private async assertUniqueCode(
    organizationId: string,
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.uomRepo.findOne({
      where: { organizationId, code, isDeleted: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`UOM with code '${code}' already exists in this organization`);
    }
  }

  private async assertUniqueName(
    organizationId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.uomRepo.findOne({
      where: { organizationId, name, isDeleted: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`UOM with name '${name}' already exists in this organization`);
    }
  }

  // Centralized dependency check — inject downstream repositories here
  // as the Material Master hierarchy is built out.
  private async assertNotInUse(_id: string): Promise<void> {
    // Future checks (purchaseUomId, stockUomId, consumptionUomId columns):
    //   materialMasterRepo, purchaseRequisitionRepo, rfqRepo, poRepo, inventoryRepo
    // Example:
    //   const count = await this.materialMasterRepo.count({ where: { purchaseUomId: id, isDeleted: false } });
    //   if (count > 0) throw new ConflictException(`Cannot delete: ${count} Material Master record(s) reference this UOM`);
  }

  // ── Response mapper ───────────────────────────────────────────────

  private toResponse(uom: UnitOfMeasurement): UnitOfMeasurementResponseDto {
    return {
      id:               uom.id,
      dguid:            uom.dguid,
      organizationId:   uom.organizationId,
      organizationName: uom.organization?.organizationName ?? '',
      organization:     {
        id:   uom.organizationId,
        name: uom.organization?.organizationName,
        code: uom.organization?.organizationCode,
      },
      code:             uom.code,
      name:             uom.name,
      symbol:           uom.symbol,
      shortName:        uom.shortName,
      description:      uom.description,
      uomType:          uom.uomType,
      displayOrder:     uom.displayOrder,
      isActive:         uom.isActive,
      remarks:          uom.remarks,
      createdBy:        uom.createdBy,
      updatedBy:        uom.updatedBy,
      createdAt:        uom.createdAt,
      updatedAt:        uom.updatedAt,
    };
  }
}
