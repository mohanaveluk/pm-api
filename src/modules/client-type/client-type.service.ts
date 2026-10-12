import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ClientType } from './entity/client-type.entity';
import {
  MasterCodeService,
  MasterSequenceKey,
} from 'src/common/services/master-code.service';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { CreateClientTypeDto } from './dto/create-client-type.dto';
import { UpdateClientTypeDto } from './dto/update-client-type.dto';
import { ClientTypeQueryDto } from './dto/client-type-query.dto';
import { ClientTypeListResponseDto, ClientTypeResponseDto } from './dto/client-type-response.dto';

const ALLOWED_SORT_FIELDS = new Set(['name', 'code', 'displayOrder', 'createdAt']);

// Seeded the first time an organization uses the master (see ensureDefaults).
export const DEFAULT_CLIENT_TYPES: ReadonlyArray<{ name: string; shortName: string; description: string }> = [
  { name: 'Owner',          shortName: 'OWN',  description: 'The organization that owns the asset or the project' },
  { name: 'Operator',       shortName: 'OPR',  description: 'Operates the asset on behalf of, or as, the owner' },
  { name: 'EPC Contractor', shortName: 'EPC',  description: 'Engineering, procurement and construction contractor' },
  { name: 'Consultant',     shortName: 'CON',  description: 'Engineering or project management consultant' },
  { name: 'Government',     shortName: 'GOV',  description: 'Government or public-sector organization' },
  { name: 'Other',          shortName: 'OTH',  description: 'Any other organization the company works with' },
];

@Injectable()
export class ClientTypeService {
  constructor(
    @InjectRepository(ClientType)
    private readonly ctRepo: Repository<ClientType>,
    private readonly masterCodeService: MasterCodeService,
    private readonly logger: CustomLoggerService,
  ) {}

  async create(
    organizationId: string,
    dto: CreateClientTypeDto,
    createdBy: string,
  ): Promise<ClientTypeResponseDto> {
    // code is server-generated: a per-organization sequence starting at 0001.
    // Generation and insert share one transaction, under a row lock on the
    // counter, so concurrent creates cannot be handed the same number.
    const saved = await this.masterCodeService.withGeneratedCode(
      organizationId,
      MasterSequenceKey.CLIENT_TYPE,
      async (code, queryRunner) => {
        const ct = queryRunner.manager.create(ClientType, {
          ...dto,
          dguid: uuidv4(),
          organizationId,
          code,
          isActive: dto.isActive ?? true,
          displayOrder: dto.displayOrder ?? 0,
          createdBy,
        });
        return queryRunner.manager.save(ClientType, ct);
      },
    ).catch(err => {
      this.logger.error(
        `Failed to create client type "${dto.name}" in organization ${organizationId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
      if (err?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'A Client Type with this code already exists in your organization',
        );
      }
      throw err;
    });

    return this.toResponse(saved);
  }

  async findAll(
    organizationId: string,
    query: ClientTypeQueryDto,
  ): Promise<ClientTypeListResponseDto> {
    await this.ensureDefaults(organizationId);

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

    const [items, total] = await this.ctRepo.findAndCount({
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

  async findOne(organizationId: string, id: string): Promise<ClientTypeResponseDto> {
    const ct = await this.findActiveOrThrow(organizationId, id);
    return this.toResponse(ct);
  }

  async findActive(organizationId: string): Promise<ClientTypeResponseDto[]> {
    await this.ensureDefaults(organizationId);

    const items = await this.ctRepo.find({
      where: { organizationId, isActive: true, isDeleted: false },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    return items.map(v => this.toResponse(v));
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateClientTypeDto,
    updatedBy: string,
  ): Promise<ClientTypeResponseDto> {
    const ct = await this.findActiveOrThrow(organizationId, id);

    // code is server-generated and immutable — the DTO no longer carries it,
    // but guard here in case a caller bypasses DTO validation.
    if ((dto as any).code !== undefined) {
      throw new ConflictException('Client Type code is server-generated and cannot be changed');
    }

    Object.assign(ct, dto);
    ct.updatedBy = updatedBy;

    try {
      const saved = await this.ctRepo.save(ct);
      return this.toResponse(saved);
    } catch (err) {
      this.logger.error(
        `Failed to update client type ${id} in organization ${organizationId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  async remove(organizationId: string, id: string, deletedBy: string): Promise<void> {
    const ct = await this.findActiveOrThrow(organizationId, id);

    ct.isDeleted = true;
    ct.deletedAt = new Date();
    ct.deletedBy = deletedBy;
    ct.isActive = false;

    await this.ctRepo.save(ct);
  }

  // Seeds the default classifications the first time an organization uses the
  // master, so Client Master works out of the box. Soft-deleted rows count: an
  // organization that removed them all has made a choice we must not undo.
  async ensureDefaults(organizationId: string): Promise<void> {
    if ((await this.ctRepo.count({ where: { organizationId } })) > 0) return;

    try {
      await this.masterCodeService.withGeneratedCode(
        organizationId,
        MasterSequenceKey.CLIENT_TYPE,
        async (firstCode, queryRunner) => {
          // The counter row is locked by now, so a concurrent first use waits
          // here and then sees the rows this transaction inserted.
          const existing = await queryRunner.manager.count(ClientType, { where: { organizationId } });
          if (existing > 0) return;

          let code = firstCode;
          for (const [index, def] of DEFAULT_CLIENT_TYPES.entries()) {
            if (index > 0) {
              code = await this.masterCodeService.generateCode(
                queryRunner, organizationId, MasterSequenceKey.CLIENT_TYPE,
              );
            }
            await queryRunner.manager.save(
              ClientType,
              queryRunner.manager.create(ClientType, {
                dguid: uuidv4(),
                organizationId,
                code,
                name: def.name,
                shortName: def.shortName,
                description: def.description,
                displayOrder: index + 1,
                isActive: true,
                createdBy: 'system',
              }),
            );
          }
        },
      );
    } catch (err) {
      // Seeding is a convenience — it must never fail the read that triggered it.
      this.logger.error(
        `Failed to seed default client types for organization ${organizationId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  // ── helpers ──────────────────────────────────────────────────────

  private async findActiveOrThrow(organizationId: string, id: string): Promise<ClientType> {
    const ct = await this.ctRepo.findOne({
      where: { id, organizationId, isDeleted: false },
    });
    if (!ct) throw new NotFoundException(`Client Type not found`);
    return ct;
  }

  // Retained as a safety net only — code is server-generated, so this can no
  // longer fail in practice. The unique index remains the real guarantee.
  private async assertUniqueCode(
    organizationId: string,
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.ctRepo.findOne({
      where: { organizationId, code, isDeleted: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Client Type code '${code}' already exists in this organization`);
    }
  }

  private toResponse(ct: ClientType): ClientTypeResponseDto {
    return {
      id:             ct.id,
      dguid:          ct.dguid,
      organizationId: ct.organizationId,
      // Optional-chained: create/update/findOne load the row without the
      // organization relation, so an unguarded dereference would throw.
      organizationName: ct.organization?.organizationName ?? '',
      organization:   { id: ct.organizationId, name: ct.organization?.organizationName },
      code:           ct.code,
      name:           ct.name,
      shortName:      ct.shortName,
      description:    ct.description,
      displayOrder:   ct.displayOrder,
      isActive:       ct.isActive,
      remarks:        ct.remarks,
      createdBy:      ct.createdBy,
      updatedBy:      ct.updatedBy,
      createdAt:      ct.createdAt,
      updatedAt:      ct.updatedAt,
    };
  }
}
