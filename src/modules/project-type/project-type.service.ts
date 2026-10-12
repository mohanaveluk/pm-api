import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ProjectType } from './entity/project-type.entity';
import {
  MasterCodeService,
  MasterSequenceKey,
} from 'src/common/services/master-code.service';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { CreateProjectTypeDto } from './dto/create-project-type.dto';
import { UpdateProjectTypeDto } from './dto/update-project-type.dto';
import { ProjectTypeQueryDto } from './dto/project-type-query.dto';
import { ProjectTypeListResponseDto, ProjectTypeResponseDto } from './dto/project-type-response.dto';

const ALLOWED_SORT_FIELDS = new Set(['name', 'code', 'displayOrder', 'createdAt']);

@Injectable()
export class ProjectTypeService {
  constructor(
    @InjectRepository(ProjectType)
    private readonly ptRepo: Repository<ProjectType>,
    private readonly masterCodeService: MasterCodeService,
    private readonly logger: CustomLoggerService,
  ) {}

  async create(
    organizationId: string,
    dto: CreateProjectTypeDto,
    createdBy: string,
  ): Promise<ProjectTypeResponseDto> {
    // code is server-generated: a per-organization sequence starting at 0001.
    // Generation and insert share one transaction, under a row lock on the
    // counter, so concurrent creates cannot be handed the same number.
    const saved = await this.masterCodeService.withGeneratedCode(
      organizationId,
      MasterSequenceKey.PROJECT_TYPE,
      async (code, queryRunner) => {
        const pt = queryRunner.manager.create(ProjectType, {
          ...dto,
          dguid: uuidv4(),
          organizationId,
          code,
          isActive: dto.isActive ?? true,
          displayOrder: dto.displayOrder ?? 0,
          createdBy,
        });
        return queryRunner.manager.save(ProjectType, pt);
      },
    ).catch(err => {
      this.logger.error(
        `Failed to create project type "${dto.name}" in organization ${organizationId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
      if (err?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'A Project Type with this code already exists in your organization',
        );
      }
      throw err;
    });

    return this.toResponse(saved);
  }

  async findAll(
    organizationId: string,
    query: ProjectTypeQueryDto,
  ): Promise<ProjectTypeListResponseDto> {
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

    const [items, total] = await this.ptRepo.findAndCount({
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

  async findOne(organizationId: string, id: string): Promise<ProjectTypeResponseDto> {
    const pt = await this.findActiveOrThrow(organizationId, id);
    return this.toResponse(pt);
  }

  async findActive(organizationId: string): Promise<ProjectTypeResponseDto[]> {
    const items = await this.ptRepo.find({
      where: { organizationId, isActive: true, isDeleted: false },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    return items.map(v => this.toResponse(v));
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateProjectTypeDto,
    updatedBy: string,
  ): Promise<ProjectTypeResponseDto> {
    const pt = await this.findActiveOrThrow(organizationId, id);

    // code is server-generated and immutable — the DTO no longer carries it,
    // but guard here in case a caller bypasses DTO validation.
    if ((dto as any).code !== undefined) {
      throw new ConflictException('Project Type code is server-generated and cannot be changed');
    }

    Object.assign(pt, dto);
    pt.updatedBy = updatedBy;

    try {
      const saved = await this.ptRepo.save(pt);
      return this.toResponse(saved);
    } catch (err) {
      this.logger.error(
        `Failed to update project type ${id} in organization ${organizationId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  async remove(organizationId: string, id: string, deletedBy: string): Promise<void> {
    const pt = await this.findActiveOrThrow(organizationId, id);

    pt.isDeleted = true;
    pt.deletedAt = new Date();
    pt.deletedBy = deletedBy;
    pt.isActive = false;

    await this.ptRepo.save(pt);
  }

  // ── helpers ──────────────────────────────────────────────────────

  private async findActiveOrThrow(organizationId: string, id: string): Promise<ProjectType> {
    const pt = await this.ptRepo.findOne({
      where: { id, organizationId, isDeleted: false },
    });
    if (!pt) throw new NotFoundException(`Project Type not found`);
    return pt;
  }

  // Retained as a safety net only — code is server-generated, so this can no
  // longer fail in practice. The unique index remains the real guarantee.
  private async assertUniqueCode(
    organizationId: string,
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.ptRepo.findOne({
      where: { organizationId, code, isDeleted: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Project Type code '${code}' already exists in this organization`);
    }
  }

  private toResponse(pt: ProjectType): ProjectTypeResponseDto {
    return {
      id:             pt.id,
      dguid:          pt.dguid,
      organizationId: pt.organizationId,
      // Optional-chained: create/update/findOne load the row without the
      // organization relation, so an unguarded dereference would throw.
      organizationName: pt.organization?.organizationName ?? '',
      organization:   { id: pt.organizationId, name: pt.organization?.organizationName },
      code:           pt.code,
      name:           pt.name,
      shortName:      pt.shortName,
      description:    pt.description,
      displayOrder:   pt.displayOrder,
      isActive:       pt.isActive,
      remarks:        pt.remarks,
      createdBy:      pt.createdBy,
      updatedBy:      pt.updatedBy,
      createdAt:      pt.createdAt,
      updatedAt:      pt.updatedAt,
    };
  }
}
