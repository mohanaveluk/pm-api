import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { VendorType } from './entity/vendor-type.entity';
import {
  MasterCodeService,
  MasterSequenceKey,
} from 'src/common/services/master-code.service';
import { CreateVendorTypeDto } from './dto/create-vendor-type.dto';
import { UpdateVendorTypeDto } from './dto/update-vendor-type.dto';
import { VendorTypeQueryDto } from './dto/vendor-type-query.dto';
import { VendorTypeListResponseDto, VendorTypeResponseDto } from './dto/vendor-type-response.dto';

const ALLOWED_SORT_FIELDS = new Set(['name', 'code', 'displayOrder', 'createdAt']);

@Injectable()
export class VendorTypeService {
  constructor(
    @InjectRepository(VendorType)
    private readonly vtRepo: Repository<VendorType>,
    private readonly masterCodeService: MasterCodeService,
  ) {}

  async create(
    organizationId: string,
    dto: CreateVendorTypeDto,
    createdBy: string,
  ): Promise<VendorTypeResponseDto> {
    // code is server-generated: a per-organization sequence starting at 0001.
    // Generation and insert share one transaction, under a row lock on the
    // counter, so concurrent creates cannot be handed the same number.
    const saved = await this.masterCodeService.withGeneratedCode(
      organizationId,
      MasterSequenceKey.VENDOR_TYPE,
      async (code, queryRunner) => {
        const vt = queryRunner.manager.create(VendorType, {
          ...dto,
          dguid: uuidv4(),
          organizationId,
          code,
          isActive: dto.isActive ?? true,
          displayOrder: dto.displayOrder ?? 0,
          createdBy,
        });
        return queryRunner.manager.save(VendorType, vt);
      },
    ).catch(err => {
      if (err?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'A Vendor Type with this code already exists in your organization',
        );
      }
      throw err;
    });

    return this.toResponse(saved);
  }

  async findAll(
    organizationId: string,
    query: VendorTypeQueryDto,
  ): Promise<VendorTypeListResponseDto> {
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

    const [items, total] = await this.vtRepo.findAndCount({
      where,
      relations: {
        organization: true,
      },
      order: { [safeSortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map(v => this.toResponse(v)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(organizationId: string, id: string): Promise<VendorTypeResponseDto> {
    const vt = await this.findActiveOrThrow(organizationId, id);
    return this.toResponse(vt);
  }

  async findActive(organizationId: string): Promise<VendorTypeResponseDto[]> {
    const items = await this.vtRepo.find({
      where: { organizationId, isActive: true, isDeleted: false },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    return items.map(v => this.toResponse(v));
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateVendorTypeDto,
    updatedBy: string,
  ): Promise<VendorTypeResponseDto> {
    const vt = await this.findActiveOrThrow(organizationId, id);

    // code is server-generated and immutable — the DTO no longer carries it,
    // but guard here in case a caller bypasses DTO validation.
    if ((dto as any).code !== undefined) {
      throw new ConflictException('Vendor Type code is server-generated and cannot be changed');
    }

    Object.assign(vt, dto);
    vt.updatedBy = updatedBy;

    const saved = await this.vtRepo.save(vt);
    return this.toResponse(saved);
  }

  async remove(organizationId: string, id: string, deletedBy: string): Promise<void> {
    const vt = await this.findActiveOrThrow(organizationId, id);

    vt.isDeleted = true;
    vt.deletedAt = new Date();
    vt.deletedBy = deletedBy;
    vt.isActive = false;

    await this.vtRepo.save(vt);
  }

  // ── helpers ──────────────────────────────────────────────────────

  private async findActiveOrThrow(organizationId: string, id: string): Promise<VendorType> {
    const vt = await this.vtRepo.findOne({
      where: { id, organizationId, isDeleted: false },
    });
    if (!vt) throw new NotFoundException(`Vendor Type not found`);
    return vt;
  }

  // Retained as a safety net only — code is server-generated, so this can no
  // longer fail in practice. The unique index remains the real guarantee.
  private async assertUniqueCode(
    organizationId: string,
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.vtRepo.findOne({
      where: { organizationId, code, isDeleted: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Vendor Type code '${code}' already exists in this organization`);
    }
  }

  private toResponse(vt: VendorType): VendorTypeResponseDto {
    return {
      id:             vt.id,
      dguid:          vt.dguid,
      organizationId: vt.organizationId,
      // Optional-chained: create/update/findOne load the row without the
      // organization relation, so an unguarded dereference would throw.
      organizationName: vt.organization?.organizationName ?? '',
      organization:   { id: vt.organizationId, name: vt.organization?.organizationName },
      code:           vt.code,
      name:           vt.name,
      shortName:      vt.shortName,
      description:    vt.description,
      displayOrder:   vt.displayOrder,
      isActive:       vt.isActive,
      remarks:        vt.remarks,
      createdBy:      vt.createdBy,
      updatedBy:      vt.updatedBy,
      createdAt:      vt.createdAt,
      updatedAt:      vt.updatedAt,
    };
  }
}
