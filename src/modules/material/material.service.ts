import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { Material }         from './entities/material.entity';
import { MaterialCategory } from '../material-category/entities/material-category.entity';
import { MaterialGroup }    from '../material-group/entities/material-group.entity';
import { UnitOfMeasurement } from '../unit-of-measurement/entities/unit-of-measurement.entity';

import { CreateMaterialDto }  from './dto/create-material.dto';
import { UpdateMaterialDto }  from './dto/update-material.dto';
import { MaterialQueryDto }   from './dto/material-query.dto';
import {
  MaterialDropdownDto,
  MaterialListItemDto,
  MaterialListResponseDto,
  MaterialResponseDto,
} from './dto/material-response.dto';

import { MaterialStatus }   from './enums/material-status.enum';
import { MaterialCodeService } from './material-code.service';
import { MaterialUsageValidationService } from './material-usage-validation.service';
import { User } from '../user/entity/user.entity';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';

const ALLOWED_SORT_FIELDS = new Set([
  'code', 'shortDescription', 'status', 'criticalityLevel',
  'manufacturerName', 'createdAt', 'updatedAt',
]);

@Injectable()
export class MaterialService {
  private readonly logger = new Logger(MaterialService.name);

  constructor(
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    @InjectRepository(MaterialCategory)
    private readonly categoryRepo: Repository<MaterialCategory>,
    @InjectRepository(MaterialGroup)
    private readonly groupRepo: Repository<MaterialGroup>,
    @InjectRepository(UnitOfMeasurement)
    private readonly uomRepo: Repository<UnitOfMeasurement>,
    @InjectRepository(User)
    private userRepository: Repository<User>,    
    private readonly dataSource: DataSource,
    private readonly codeService: MaterialCodeService,
    private readonly usageValidation: MaterialUsageValidationService,
    private readonly cloudStorageService: CloudStorageService,
  ) {}

  // ── Dependency validators ─────────────────────────────────────────────

  private async validateCategory(organizationId: string, categoryId: string): Promise<MaterialCategory> {
    const cat = await this.categoryRepo.findOne({
      where: { id: categoryId, organizationId, isDeleted: false },
    });
    if (!cat) throw new NotFoundException(`Material category ${categoryId} not found in this organization`);
    if (!cat.isActive) throw new ConflictException(`Material category "${cat.name}" is inactive`);
    return cat;
  }

  private async validateGroup(organizationId: string, groupId: string, categoryId: string): Promise<MaterialGroup> {
    const grp = await this.groupRepo.findOne({
      where: { id: groupId, organizationId, materialCategoryId: categoryId, isDeleted: false },
    });
    if (!grp) throw new NotFoundException(
      `Material group ${groupId} not found (or does not belong to the specified category)`,
    );
    if (!grp.isActive) throw new ConflictException(`Material group "${grp.name}" is inactive`);
    return grp;
  }

  private async validateUom(organizationId: string, uomId: string): Promise<UnitOfMeasurement> {
    const uom = await this.uomRepo.findOne({
      where: { id: uomId, organizationId, isDeleted: false },
    });
    if (!uom) throw new NotFoundException(`Unit of measurement ${uomId} not found in this organization`);
    if (!uom.isActive) throw new ConflictException(`UOM "${uom.name}" is inactive`);
    return uom;
  }

  private assertNotInUse(_material: Material): void {
    // Stub: downstream modules will inject usage checks here
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private flattenDto(dto: CreateMaterialDto | UpdateMaterialDto): Partial<Material> {
    const { technicalSpec, procurement, inventory, quality, accounting, safety, logistics, documents, ...core } = dto as any;
    return {
      ...core,
      ...(technicalSpec  ?? {}),
      ...(procurement    ?? {}),
      ...(inventory      ?? {}),
      ...(quality        ?? {}),
      ...(accounting     ?? {}),
      ...(safety         ?? {}),
      ...(logistics      ?? {}),
      ...(documents      ?? {}),
    };
  }

  private toListItem(m: Material): MaterialListItemDto {
    return {
      id:               m.id,
      dguid:            m.dguid,
      code:             m.code,
      shortDescription: m.shortDescription,
      longDescription:  m.longDescription,
      materialCategoryId: m.materialCategoryId,
      materialGroupId:    m.materialGroupId,
      unitOfMeasurementId: m.unitOfMeasurementId,
      status:           m.status,
      criticalityLevel: m.criticalityLevel,
      isSystem:         m.isSystem,
      isStockItem:      m.isStockItem,
      isSerialized:     m.isSerialized,
      isBatchManaged:   m.isBatchManaged,
      manufacturerName: m.manufacturerName,
      modelPartNumber:  m.modelPartNumber,
      createdAt:        m.createdAt,
      updatedAt:        m.updatedAt,
      materialCategoryName: (m as any).materialCategory?.name,
      materialGroupName:    (m as any).materialGroup?.name,
      uomSymbol:            (m as any).unitOfMeasurement?.symbol,
    };
  }

  private applySearchFilter(
    qb: SelectQueryBuilder<Material>,
    query: MaterialQueryDto,
  ): void {
    if (query.search) {
      qb.andWhere(
        '(m.shortDescription LIKE :s OR m.code LIKE :s OR m.manufacturerName LIKE :s)',
        { s: `%${query.search}%` },
      );
    }
    if (query.materialCategoryId) qb.andWhere('m.materialCategoryId = :catId',  { catId: query.materialCategoryId });
    if (query.materialGroupId)    qb.andWhere('m.materialGroupId = :grpId',      { grpId: query.materialGroupId });
    if (query.unitOfMeasurementId) qb.andWhere('m.unitOfMeasurementId = :uomId', { uomId: query.unitOfMeasurementId });
    if (query.status)             qb.andWhere('m.status = :status',              { status: query.status });
    if (query.criticalityLevel)   qb.andWhere('m.criticalityLevel = :cl',        { cl: query.criticalityLevel });
    if (query.isStockItem !== undefined) qb.andWhere('m.isStockItem = :si',      { si: query.isStockItem });
    if (query.isSystem !== undefined)    qb.andWhere('m.isSystem = :sys',        { sys: query.isSystem });
    if (query.manufacturerName)   qb.andWhere('m.manufacturerName LIKE :mfr',    { mfr: `%${query.manufacturerName}%` });
  }

  // ── CRUD ──────────────────────────────────────────────────────────────

  async create(
    dto: CreateMaterialDto,
    organizationId: string,
    userEmail: string,
  ): Promise<MaterialResponseDto> {
    const [cat] = await Promise.all([
      this.validateCategory(organizationId, dto.materialCategoryId),
    ]);
    await this.validateGroup(organizationId, dto.materialGroupId, dto.materialCategoryId);
    await this.validateUom(organizationId, dto.unitOfMeasurementId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const categoryPrefix = this.codeService.deriveCategoryPrefix(cat.name);
      const code = await this.codeService.generateCode(queryRunner, organizationId, categoryPrefix);

      const flat = this.flattenDto(dto);
      const material = queryRunner.manager.create(Material, {
        ...flat,
        id:             uuidv4(),
        dguid:          uuidv4(),
        organizationId,
        code,
        status:         MaterialStatus.ACTIVE,
        createdBy:      userEmail,
        updatedBy:      userEmail,
      });

      await queryRunner.manager.save(Material, material);
      await queryRunner.commitTransaction();

      return this.findOne(material.id, organizationId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('A material with this code already exists in your organization');
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    query: MaterialQueryDto,
    organizationId: string,
  ): Promise<MaterialListResponseDto> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = query;
    const safeSortBy = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : 'createdAt';

    const qb = this.materialRepo.createQueryBuilder('m')
      .leftJoinAndSelect('m.materialCategory', 'materialCategory')
      .leftJoinAndSelect('m.materialGroup',    'materialGroup')
      .leftJoinAndSelect('m.unitOfMeasurement','unitOfMeasurement')
      .where('m.organizationId = :organizationId', { organizationId })
      .andWhere('m.isDeleted = false');

    this.applySearchFilter(qb, query);

    qb.orderBy(`m.${safeSortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      data:       items.map(m => this.toListItem(m)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, organizationId: string): Promise<MaterialResponseDto> {
    const m = await this.materialRepo.findOne({
      where:     { id, organizationId, isDeleted: false },
      relations: ['materialCategory', 'materialGroup', 'unitOfMeasurement'],
    });
    if (!m) throw new NotFoundException(`Material ${id} not found`);
    return m as unknown as MaterialResponseDto;
  }

  async findActive(
    organizationId: string,
    materialCategoryId?: string,
    materialGroupId?: string,
  ): Promise<MaterialDropdownDto[]> {
    const where: any = { organizationId, status: MaterialStatus.ACTIVE, isDeleted: false };
    if (materialCategoryId) where.materialCategoryId = materialCategoryId;
    if (materialGroupId)    where.materialGroupId    = materialGroupId;

    const items = await this.materialRepo.find({
      where,
      select: ['id', 'dguid', 'code', 'shortDescription', 'unitOfMeasurementId', 'status', 'criticalityLevel', 'isStockItem'],
      order:  { shortDescription: 'ASC' },
    });
    return items as MaterialDropdownDto[];
  }

  async update(
    id: string,
    dto: UpdateMaterialDto,
    organizationId: string,
    userEmail: string,
  ): Promise<MaterialResponseDto> {
    const material = await this.materialRepo.findOne({
      where: { id, organizationId, isDeleted: false },
    });
    if (!material) throw new NotFoundException(`Material ${id} not found`);

    // code is immutable
    if ((dto as any).code !== undefined) {
      throw new ConflictException('Material code is server-generated and cannot be changed');
    }

    // If FK references are changing, validate them
    const catId = dto.materialCategoryId ?? material.materialCategoryId;
    const grpId = dto.materialGroupId    ?? material.materialGroupId;
    if (dto.materialCategoryId || dto.materialGroupId) {
      await this.validateCategory(organizationId, catId);
      await this.validateGroup(organizationId, grpId, catId);
    }
    if (dto.unitOfMeasurementId) {
      await this.validateUom(organizationId, dto.unitOfMeasurementId);
    }

    const flat = this.flattenDto(dto);
    Object.assign(material, { ...flat, updatedBy: userEmail });
    await this.materialRepo.save(material);
    return this.findOne(id, organizationId);
  }

  async enable(id: string, organizationId: string, userEmail: string): Promise<MaterialResponseDto> {
    const material = await this.materialRepo.findOne({
      where: { id, organizationId, isDeleted: false },
    });
    if (!material) throw new NotFoundException(`Material ${id} not found`);
    if (material.status === MaterialStatus.ACTIVE) {
      throw new ConflictException('Material is already active');
    }

    material.status    = MaterialStatus.ACTIVE;
    material.updatedBy = userEmail;
    await this.materialRepo.save(material);
    return this.findOne(id, organizationId);
  }

  async disable(id: string, organizationId: string, userEmail: string): Promise<MaterialResponseDto> {
    const material = await this.materialRepo.findOne({
      where: { id, organizationId, isDeleted: false },
    });
    if (!material) throw new NotFoundException(`Material ${id} not found`);
    if (material.isSystem) throw new ConflictException('System materials cannot be disabled');
    if (material.status === MaterialStatus.INACTIVE) {
      throw new ConflictException('Material is already inactive');
    }

    material.status    = MaterialStatus.INACTIVE;
    material.updatedBy = userEmail;
    await this.materialRepo.save(material);
    return this.findOne(id, organizationId);
  }

  async obsolete(id: string, organizationId: string, userEmail: string): Promise<MaterialResponseDto> {
    const material = await this.materialRepo.findOne({
      where: { id, organizationId, isDeleted: false },
    });
    if (!material) throw new NotFoundException(`Material ${id} not found`);
    if (material.isSystem) throw new ConflictException('System materials cannot be marked obsolete');
    if (material.status === MaterialStatus.OBSOLETE) {
      throw new ConflictException('Material is already marked obsolete');
    }

    material.status    = MaterialStatus.OBSOLETE;
    material.updatedBy = userEmail;
    await this.materialRepo.save(material);
    return this.findOne(id, organizationId);
  }

  async remove(id: string, organizationId: string, userEmail: string): Promise<void> {
    const material = await this.materialRepo.findOne({
      where: { id, organizationId, isDeleted: false },
    });
    if (!material) throw new NotFoundException(`Material ${id} not found`);
    if (material.isSystem) throw new ConflictException('System materials cannot be deleted');

    this.assertNotInUse(material);

    material.isDeleted = true;
    material.deletedAt = new Date();
    material.deletedBy = userEmail;
    material.status    = MaterialStatus.INACTIVE;
    material.updatedBy = userEmail;
    await this.materialRepo.save(material);
  }

  async uploadMaterialSpecificationDocument(userId: string, file: Express.Multer.File): Promise<{ message: string; url: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });
    if (!user) throw new NotFoundException('User not found');

    await this.cloudStorageService.isFileValid(file);

    const folder = `pm/material/${user.id}`;
    const url = await this.cloudStorageService.uploadFile(file, folder);

    return { message: 'Material Specification document uploaded successfully', url };
  }  
}
