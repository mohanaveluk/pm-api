import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { Material }         from './entities/material.entity';
import { MaterialDocument } from './entities/material-document.entity';
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

import {
  AddMaterialDocumentDto,
  MaterialDocumentInputDto,
  MaterialDocumentQueryDto,
  MaterialDocumentResponseDto,
} from './dto/material-document.dto';

import { MaterialStatus }   from './enums/material-status.enum';
import {
  MaterialDocumentType,
  SINGLETON_DOCUMENT_TYPES,
} from './enums/material-document-type.enum';
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
    @InjectRepository(MaterialDocument)
    private readonly documentRepo: Repository<MaterialDocument>,
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

  // ── Purchase-order lock ───────────────────────────────────────────────
  //
  // Once a material is on an issued and confirmed PO its master data is frozen:
  // the specification the supplier priced must not move underneath the order.
  // Documents are the deliberate exception — see addDocument().

  // Fields frozen once a purchase order has been issued. These two carry the
  // description the supplier quoted and is manufacturing against, so they must
  // not move underneath the order. Everything else on the material stays
  // editable — lead times, storage, pricing, and quality data all legitimately
  // change after an order is placed.
  private static readonly PO_LOCKED_FIELDS = ['shortDescription', 'longDescription'] as const;

  // Removes the frozen fields from an update payload when the material is
  // locked, and reports which ones were dropped.
  //
  // Silently ignoring beats rejecting the whole request here: a client editing
  // an unrelated field (say a storage location) usually round-trips the full
  // record, so a 409 on an untouched description would block edits the lock is
  // not meant to prevent. The response carries the unchanged values, so a
  // client that did try to change them can see it did not take.
  private stripPoLockedFields(material: Material, dto: UpdateMaterialDto): string[] {
    if (!material.isPurchaseOrderIssued) return [];

    const skipped: string[] = [];
    for (const field of MaterialService.PO_LOCKED_FIELDS) {
      const supplied = (dto as Record<string, any>)[field];
      // Only report a genuine change attempt — a client resending the current
      // value is a no-op, not something worth logging.
      if (supplied !== undefined && supplied !== material[field]) {
        skipped.push(field);
      }
      delete (dto as Record<string, any>)[field];
    }
    return skipped;
  }

  private assertNotPoLocked(material: Material, operation: string): void {
    if (!material.isPurchaseOrderIssued) return;
    const ref = material.purchaseOrderReference
      ? ` (purchase order ${material.purchaseOrderReference})`
      : '';
    throw new ConflictException(
      `Material ${material.code} cannot be ${operation} because a purchase order has been ` +
      `issued against it${ref}. Documents may still be added as new versions; ` +
      'to change the specification, clone the material instead.',
    );
  }

  // Integration point for the future Purchase Order module: called when an
  // order carrying this material is issued and confirmed. Idempotent — a second
  // PO against an already-locked material is a no-op, so the ORIGINAL locking
  // reference and timestamp are preserved.
  async markPurchaseOrderIssued(
    id: string,
    organizationId: string,
    purchaseOrderReference: string,
    userEmail: string,
  ): Promise<MaterialResponseDto> {
    const material = await this.materialRepo.findOne({
      where: { id, organizationId, isDeleted: false },
    });
    if (!material) throw new NotFoundException(`Material ${id} not found`);

    if (!material.isPurchaseOrderIssued) {
      material.isPurchaseOrderIssued  = true;
      material.purchaseOrderIssuedAt  = new Date();
      material.purchaseOrderReference = purchaseOrderReference;
      material.purchaseOrderIssuedBy  = userEmail;
      material.updatedBy              = userEmail;
      await this.materialRepo.save(material);
      this.logger.log(
        `Material ${material.code} locked by purchase order ${purchaseOrderReference}`,
      );
    }

    return this.findOne(id, organizationId);
  }

  // ══ Documents ═════════════════════════════════════════════════════════

  // Normalises both accepted input shapes into one list of rows to insert:
  // the legacy flat `documents` section (one URL per column, photos[] fanned
  // out) and the newer `documentList` array. Both land in material_documents,
  // so there is exactly one source of truth regardless of which shape a client
  // sends.
  private normaliseDocumentInput(
    dto: CreateMaterialDto | UpdateMaterialDto,
  ): MaterialDocumentInputDto[] {
    const rows: MaterialDocumentInputDto[] = [];

    const legacy = (dto as CreateMaterialDto).documents;
    if (legacy) {
      const columnToType: Array<[keyof typeof legacy, MaterialDocumentType]> = [
        ['datasheetUrl',              MaterialDocumentType.DATASHEET],
        ['drawingSketchUrl',          MaterialDocumentType.DRAWING_SKETCH],
        ['technicalSpecSheetUrl',     MaterialDocumentType.TECHNICAL_SPEC_SHEET],
        ['qualityCertificatesUrl',    MaterialDocumentType.QUALITY_CERTIFICATE],
        ['complianceCertificatesUrl', MaterialDocumentType.COMPLIANCE_CERTIFICATE],
        ['vendorQuotationUrl',        MaterialDocumentType.VENDOR_QUOTATION],
        ['inspectionReportsUrl',      MaterialDocumentType.INSPECTION_REPORT],
      ];
      for (const [column, documentType] of columnToType) {
        const url = legacy[column] as string | undefined;
        if (url) rows.push({ documentType, documentUrl: url });
      }
      for (const url of legacy.photos ?? []) {
        if (url) rows.push({ documentType: MaterialDocumentType.PHOTO, documentUrl: url });
      }
    }

    rows.push(...((dto as CreateMaterialDto).documentList ?? []));
    return rows;
  }

  // Inserts document rows for a material inside the caller's transaction.
  // Every row starts its own chain at version 1.
  private async saveDocuments(
    manager: EntityManager,
    inputs: MaterialDocumentInputDto[],
    materialId: string,
    organizationId: string,
    userEmail: string,
  ): Promise<void> {
    if (!inputs.length) return;

    const now = new Date();
    const rows = inputs.map(input => manager.create(MaterialDocument, {
      ...input,
      id:    uuidv4(),
      dguid: uuidv4(),
      materialId,
      organizationId,
      version:    1,
      isActive:   true,
      uploadedBy: userEmail,
      uploadedAt: now,
      createdBy:  userEmail,
      updatedBy:  userEmail,
    }));
    await manager.save(MaterialDocument, rows);
  }

  // Keeps the deprecated flat URL columns on the material in step with the
  // current active document of each type, so existing consumers of the detail
  // response keep working while material_documents is the source of truth.
  private async syncLegacyDocumentColumns(
    manager: EntityManager,
    materialId: string,
    organizationId: string,
  ): Promise<void> {
    const active = await manager.find(MaterialDocument, {
      where: { materialId, organizationId, isActive: true, isDeleted: false },
      order: { createdAt: 'ASC' },
    });

    const latestOf = (type: MaterialDocumentType): string =>
      active.filter(d => d.documentType === type).slice(-1)[0]?.documentUrl ?? null;

    await manager.update(Material, { id: materialId, organizationId }, {
      datasheetUrl:              latestOf(MaterialDocumentType.DATASHEET),
      drawingSketchUrl:          latestOf(MaterialDocumentType.DRAWING_SKETCH),
      technicalSpecSheetUrl:     latestOf(MaterialDocumentType.TECHNICAL_SPEC_SHEET),
      qualityCertificatesUrl:    latestOf(MaterialDocumentType.QUALITY_CERTIFICATE),
      complianceCertificatesUrl: latestOf(MaterialDocumentType.COMPLIANCE_CERTIFICATE),
      vendorQuotationUrl:        latestOf(MaterialDocumentType.VENDOR_QUOTATION),
      inspectionReportsUrl:      latestOf(MaterialDocumentType.INSPECTION_REPORT),
      photos: active
        .filter(d => d.documentType === MaterialDocumentType.PHOTO)
        .map(d => d.documentUrl),
    });
  }

  // Adds a document to an existing material.
  //
  // This is the ONE mutation that stays open after a purchase order locks the
  // material: certificates, inspection reports, and revised drawings keep
  // arriving through fabrication and delivery long after the order is placed,
  // and refusing them would push that paperwork out of the system entirely.
  // Nothing is overwritten — a revision is an additional row.
  async addDocument(
    id: string,
    dto: AddMaterialDocumentDto,
    organizationId: string,
    userEmail: string,
  ): Promise<MaterialDocumentResponseDto> {
    const material = await this.materialRepo.findOne({
      where: { id, organizationId, isDeleted: false },
    });
    if (!material) throw new NotFoundException(`Material ${id} not found`);
    // No assertNotPoLocked here — by design.

    return this.dataSource.transaction(async manager => {
      const document = await this.appendDocumentRow(manager, dto, material, userEmail);
      await this.syncLegacyDocumentColumns(manager, id, organizationId);

      this.logger.log(
        `Document ${dto.documentType} v${document.version} added to material ` +
        `${material.code} by ${userEmail}`,
      );
      return this.toDocumentResponse(document);
    });
  }

  // Blocks replacing or deleting a document that predates a purchase-order
  // lock — the supplier was priced against exactly that file. Deliberately
  // narrower than assertNotPoLocked, which freezes the whole record: this
  // checks the ONE document in play, so paperwork filed after the lock (a
  // revised drawing, a mill certificate that only arrives during fabrication)
  // stays fully editable, and adding a brand-new document is never affected by
  // either check.
  private assertDocumentNotFrozen(
    material: Material,
    document: MaterialDocument,
    operation: string,
  ): void {
    if (!material.isPurchaseOrderIssued) return;
    // Flag set but no timestamp (legacy or seeded data): fail closed — the
    // record says an order exists, so the document is treated as predating it.
    if (material.purchaseOrderIssuedAt &&
        document.createdAt.getTime() > material.purchaseOrderIssuedAt.getTime()) return;

    const ref = material.purchaseOrderReference
      ? ` (purchase order ${material.purchaseOrderReference})`
      : '';
    throw new ConflictException(
      `This document predates the purchase order issued against material ${material.code}` +
      `${ref} and cannot be ${operation}. File a new document instead.`,
    );
  }

  // Inserts one document row, resolving its place in a version chain.
  // Shared by addDocument() and update(), so both behave identically.
  private async appendDocumentRow(
    manager: EntityManager,
    dto: AddMaterialDocumentDto,
    material: Material,
    userEmail: string,
  ): Promise<MaterialDocument> {
    const materialId     = material.id;
    const organizationId = material.organizationId;

    let version: number;
    let supersedesId: string = null;

    if (dto.supersedesId) {
      const previous = await manager.findOne(MaterialDocument, {
        where: { id: dto.supersedesId, materialId, organizationId, isDeleted: false },
      });
      if (!previous) {
        throw new NotFoundException(`Document ${dto.supersedesId} not found on this material`);
      }
      if (previous.documentType !== dto.documentType) {
        throw new UnprocessableEntityException(
          `A ${dto.documentType} cannot supersede a ${previous.documentType} document`,
        );
      }
      if (!previous.isActive) {
        throw new ConflictException(
          'That document has already been superseded. Supersede the current version instead.',
        );
      }
      if (this.isDocumentFrozen(material, previous)) {
        // The target predates the purchase order, so it stays active and
        // untouched — it is the document the PO was priced against. Filing a
        // document is never refused, so this upload lands as an independent
        // row alongside it (supersedesId stays null: nothing was replaced),
        // exactly as the auto-supersede branch below does.
        version = await this.nextVersionForType(manager, materialId, organizationId, dto.documentType);
      } else {
        version      = Number(previous.version) + 1;
        supersedesId = previous.id;

        // Retain the superseded row; only its currency flag changes.
        previous.isActive  = false;
        previous.updatedBy = userEmail;
        await manager.save(MaterialDocument, previous);
      }
    } else if (SINGLETON_DOCUMENT_TYPES.has(dto.documentType)) {
      // Types that hold one current document at a time auto-supersede, so a
      // client need not know the previous row's id to replace a datasheet.
      const current = await manager.findOne(MaterialDocument, {
        where: {
          materialId, organizationId, documentType: dto.documentType,
          isActive: true, isDeleted: false,
        },
        order: { version: 'DESC' },
      });
      if (current && !this.isDocumentFrozen(material, current)) {
        version      = Number(current.version) + 1;
        supersedesId = current.id;
        current.isActive  = false;
        current.updatedBy = userEmail;
        await manager.save(MaterialDocument, current);
      } else {
        // Either nothing filed yet, or the current version is frozen by a PO
        // lock. A frozen row is left untouched — still active, still the one
        // the PO was priced against — and this upload becomes an independent
        // row alongside it (supersedesId stays null: nothing is being
        // replaced) rather than superseding it. This is the one place a
        // "singleton" type can end up with two active rows. Either way the
        // version number CONTINUES this type's sequence rather than
        // restarting at 1, so numbering never repeats for a given type.
        version = await this.nextVersionForType(manager, materialId, organizationId, dto.documentType);
      }
    } else {
      // Multi-instance types (certificates, inspection reports, photos, …)
      // never auto-supersede — several may be active side by side — but their
      // version numbers still continue one running sequence per type rather
      // than every independent upload claiming "version 1".
      version = await this.nextVersionForType(manager, materialId, organizationId, dto.documentType);
    }

    const now = new Date();
    const document = manager.create(MaterialDocument, {
      ...dto,
      id:    uuidv4(),
      dguid: uuidv4(),
      materialId,
      organizationId,
      version,
      supersedesId,
      isActive:   true,
      uploadedBy: userEmail,
      uploadedAt: now,
      createdBy:  userEmail,
      updatedBy:  userEmail,
    });
    await manager.save(MaterialDocument, document);
    return document;
  }

  // Non-throwing companion to assertDocumentNotFrozen, for the call sites on
  // the POST path that must branch on the answer rather than reject: filing a
  // document is never refused, whatever the lock says.
  private isDocumentFrozen(material: Material, document: MaterialDocument): boolean {
    if (!material.isPurchaseOrderIssued) return false;
    // Flag set but no timestamp: fail closed, matching assertDocumentNotFrozen.
    if (!material.purchaseOrderIssuedAt) return true;
    return document.createdAt.getTime() <= material.purchaseOrderIssuedAt.getTime();
  }

  // Highest version number ever used by ANY row of this type on this
  // material — active, superseded, or soft-deleted — plus one. `isDeleted` is
  // a plain boolean column here, not a TypeORM soft-delete, so leaving it out
  // of the where-clause means deleted rows are still counted: version numbers
  // must never repeat for a (material, documentType) pair, even after one is
  // removed. Returns 1 when nothing has been filed under this type yet.
  private async nextVersionForType(
    manager: EntityManager,
    materialId: string,
    organizationId: string,
    documentType: MaterialDocumentType,
  ): Promise<number> {
    const latest = await manager.findOne(MaterialDocument, {
      where: { materialId, organizationId, documentType },
      order: { version: 'DESC' },
    });
    return latest ? Number(latest.version) + 1 : 1;
  }

  async findDocuments(
    id: string,
    organizationId: string,
    query: MaterialDocumentQueryDto = {},
  ): Promise<MaterialDocumentResponseDto[]> {
    const material = await this.materialRepo.findOne({
      where: { id, organizationId, isDeleted: false },
      select: ['id'],
    });
    if (!material) throw new NotFoundException(`Material ${id} not found`);

    const where: Record<string, any> = { materialId: id, organizationId, isDeleted: false };
    if (query.documentType) where.documentType = query.documentType;
    // Superseded versions are hidden unless explicitly requested.
    if (!query.includeSuperseded) where.isActive = true;

    const rows = await this.documentRepo.find({
      where,
      order: { documentType: 'ASC', version: 'DESC' },
    });
    return rows.map(d => this.toDocumentResponse(d));
  }

  // Soft-deletes a document. Refused outright once the material is PO-locked:
  // the document set behind an issued order is part of the contractual record.
  async removeDocument(
    id: string,
    documentId: string,
    organizationId: string,
    userEmail: string,
  ): Promise<void> {
    const material = await this.materialRepo.findOne({
      where: { id, organizationId, isDeleted: false },
    });
    if (!material) throw new NotFoundException(`Material ${id} not found`);

    const document = await this.documentRepo.findOne({
      where: { id: documentId, materialId: id, organizationId, isDeleted: false },
    });
    if (!document) throw new NotFoundException(`Document ${documentId} not found on this material`);

    // Per-document check, not the whole-record assertNotPoLocked: a document
    // filed after the lock stays deletable even though the rest of the record
    // is frozen.
    this.assertDocumentNotFrozen(material, document, 'deleted');

    await this.dataSource.transaction(async manager => {
      document.isDeleted = true;
      document.deletedAt = new Date();
      document.deletedBy = userEmail;
      document.isActive  = false;
      document.updatedBy = userEmail;
      await manager.save(MaterialDocument, document);

      await this.syncLegacyDocumentColumns(manager, id, organizationId);
    });
  }

  // One-time migration of the legacy flat URL columns into material_documents.
  // Idempotent: a material that already has document rows is skipped, so it is
  // safe to re-run. Returns how many materials were backfilled.
  async backfillLegacyDocuments(organizationId: string, userEmail: string): Promise<{
    materialsScanned: number;
    materialsBackfilled: number;
    documentsCreated: number;
  }> {
    const materials = await this.materialRepo.find({
      where: { organizationId, isDeleted: false },
    });

    let materialsBackfilled = 0;
    let documentsCreated = 0;

    for (const material of materials) {
      const existing = await this.documentRepo.count({
        where: { materialId: material.id, organizationId },
      });
      if (existing > 0) continue;

      const inputs = this.normaliseDocumentInput({
        documents: {
          datasheetUrl:              material.datasheetUrl,
          drawingSketchUrl:          material.drawingSketchUrl,
          technicalSpecSheetUrl:     material.technicalSpecSheetUrl,
          qualityCertificatesUrl:    material.qualityCertificatesUrl,
          complianceCertificatesUrl: material.complianceCertificatesUrl,
          vendorQuotationUrl:        material.vendorQuotationUrl,
          inspectionReportsUrl:      material.inspectionReportsUrl,
          photos:                    material.photos,
        },
      } as CreateMaterialDto);

      if (!inputs.length) continue;

      await this.dataSource.transaction(async manager => {
        const now = new Date();
        const rows = inputs.map(input => manager.create(MaterialDocument, {
          ...input,
          id:    uuidv4(),
          dguid: uuidv4(),
          materialId:     material.id,
          organizationId,
          version:    1,
          isActive:   true,
          isMigrated: true,
          uploadedBy: material.createdBy ?? userEmail,
          uploadedAt: material.createdAt ?? now,
          createdBy:  userEmail,
          updatedBy:  userEmail,
        }));
        await manager.save(MaterialDocument, rows);
        documentsCreated += rows.length;
      });
      materialsBackfilled++;
    }

    this.logger.log(
      `Backfill complete: ${materialsBackfilled}/${materials.length} materials, ` +
      `${documentsCreated} document(s) created`,
    );
    return { materialsScanned: materials.length, materialsBackfilled, documentsCreated };
  }

  private toDocumentResponse(d: MaterialDocument): MaterialDocumentResponseDto {
    const now = new Date();
    const expiry = d.expiryDate ? new Date(d.expiryDate) : null;

    return {
      id:            d.id,
      dguid:         d.dguid,
      materialId:    d.materialId,
      documentType:  d.documentType,
      documentUrl:   d.documentUrl,
      fileName:      d.fileName,
      mimeType:      d.mimeType,
      fileSizeBytes: d.fileSizeBytes,
      title:         d.title,
      version:       Number(d.version),
      supersedesId:  d.supersedesId,
      effectiveFrom: d.effectiveFrom,
      effectiveTo:   d.effectiveTo,
      expiryDate:    d.expiryDate,
      isActive:      d.isActive,
      isExpired:     expiry ? expiry.getTime() < now.getTime() : false,
      daysToExpiry:  expiry
        ? Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000)
        : undefined,
      isMigrated:    d.isMigrated,
      remarks:       d.remarks,
      uploadedBy:    d.uploadedBy,
      uploadedAt:    d.uploadedAt,
      createdAt:     d.createdAt,
      updatedAt:     d.updatedAt,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private flattenDto(dto: CreateMaterialDto | UpdateMaterialDto): Partial<Material> {
    const { technicalSpec, procurement, inventory, quality, accounting, safety, logistics, documents, documentList, ...core } = dto as any;
    return {
      ...core,
      ...(technicalSpec  ?? {}),
      ...(procurement    ?? {}),
      ...(inventory      ?? {}),
      ...(quality        ?? {}),
      ...(accounting     ?? {}),
      ...(safety         ?? {}),
      ...(logistics      ?? {}),
      // documents/documentList are intentionally NOT spread here — they are
      // persisted to material_documents and projected back onto the legacy
      // columns by syncLegacyDocumentColumns().
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
      isPurchaseOrderIssued: m.isPurchaseOrderIssued,
      manufacturerName: m.manufacturerName,
      modelPartNumber:  m.modelPartNumber,
      createdAt:        m.createdAt,
      updatedAt:        m.updatedAt,
      documents:        (m.documents ?? []).map(d => this.toDocumentResponse(d)),
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

      // Documents go to material_documents, never to the flat columns. Both
      // input shapes are normalised into the same rows.
      const documentInputs = this.normaliseDocumentInput(dto);
      await this.saveDocuments(
        queryRunner.manager, documentInputs, material.id, organizationId, userEmail,
      );
      if (documentInputs.length) {
        await this.syncLegacyDocumentColumns(queryRunner.manager, material.id, organizationId);
      }

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

  // Clones an existing material. Everything is copied verbatim except the
  // identity fields: a fresh id and dguid are minted, and a new code is issued
  // as the next sequence in the SAME category — so a clone of RAW000007 becomes
  // RAW000008 (or whatever the counter is next at).
  //
  // Reuses the same locked-counter path as create(), so a clone racing another
  // create or clone can never duplicate a code.
  async clone(
    id: string,
    organizationId: string,
    userEmail: string,
  ): Promise<MaterialResponseDto> {
    // Load WITHOUT relations: the copy must carry only FK columns, never the
    // loaded parent entities, which TypeORM would otherwise try to re-persist.
    const source = await this.materialRepo.findOne({
      where: { id, organizationId, isDeleted: false },
    });
    if (!source) throw new NotFoundException(`Material ${id} not found`);

    // Same validation as create(): a new material must not be created under a
    // category, group, or UOM that has since been deactivated.
    const cat = await this.validateCategory(organizationId, source.materialCategoryId);
    await this.validateGroup(organizationId, source.materialGroupId, source.materialCategoryId);
    await this.validateUom(organizationId, source.unitOfMeasurementId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const categoryPrefix = this.codeService.deriveCategoryPrefix(cat.name);
      const code = await this.codeService.generateCode(queryRunner, organizationId, categoryPrefix);

      // Strip identity, soft-delete, and audit fields; everything else is
      // carried over unchanged.
      const {
        id: _id,
        dguid: _dguid,
        code: _code,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        createdBy: _createdBy,
        updatedBy: _updatedBy,
        isDeleted: _isDeleted,
        deletedAt: _deletedAt,
        deletedBy: _deletedBy,
        // Never copied: the clone is a NEW material that no purchase order has
        // been issued against. Inheriting the lock would produce a record that
        // is frozen from birth for an order it was never on — and cloning is
        // precisely the supported escape hatch for changing a locked spec.
        isPurchaseOrderIssued:  _poIssued,
        purchaseOrderIssuedAt:  _poIssuedAt,
        purchaseOrderReference: _poRef,
        purchaseOrderIssuedBy:  _poBy,
        ...copyable
      } = source;

      const cloneId = uuidv4();
      const clone = queryRunner.manager.create(Material, {
        ...copyable,
        id:             cloneId,
        dguid:          uuidv4(),
        organizationId,
        code,
        isPurchaseOrderIssued:  false,
        purchaseOrderIssuedAt:  null,
        purchaseOrderReference: null,
        purchaseOrderIssuedBy:  null,
        isDeleted:      false,
        deletedAt:      null,
        deletedBy:      null,
        createdBy:      userEmail,
        updatedBy:      userEmail,
      });

      await queryRunner.manager.save(Material, clone);

      // Copy the document register across, each row re-keyed and restarted at
      // version 1 — the clone owns its own chains rather than referencing the
      // source's version history.
      const sourceDocuments = await queryRunner.manager.find(MaterialDocument, {
        where: { materialId: id, organizationId, isDeleted: false, isActive: true },
      });
      if (sourceDocuments.length) {
        const now = new Date();
        await queryRunner.manager.save(MaterialDocument, sourceDocuments.map(d =>
          queryRunner.manager.create(MaterialDocument, {
            documentType:  d.documentType,
            documentUrl:   d.documentUrl,
            fileName:      d.fileName,
            mimeType:      d.mimeType,
            fileSizeBytes: d.fileSizeBytes,
            title:         d.title,
            effectiveFrom: d.effectiveFrom,
            effectiveTo:   d.effectiveTo,
            expiryDate:    d.expiryDate,
            remarks:       d.remarks,
            id:    uuidv4(),
            dguid: uuidv4(),
            materialId: cloneId,
            organizationId,
            version:      1,
            supersedesId: null,
            isActive:     true,
            uploadedBy:   userEmail,
            uploadedAt:   now,
            createdBy:    userEmail,
            updatedBy:    userEmail,
          }),
        ));
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Material ${source.code} cloned to ${code} by ${userEmail}`);
      return this.findOne(cloneId, organizationId);
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
      // Current documents only — superseded and deleted rows stay out of the
      // list payload. The join condition lives here rather than in a WHERE so
      // a material with no documents is still returned.
      .leftJoinAndSelect(
        'm.documents', 'documents',
        'documents.isDeleted = false AND documents.isActive = true',
      )
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

    // Documents are loaded separately rather than through `relations` so the
    // superseded and soft-deleted rows can be filtered out — a relations array
    // cannot carry a condition. The detail view shows current versions; the
    // full history is available from GET /materials/:id/documents.
    const documents = await this.documentRepo.find({
      where: { materialId: id, organizationId, isDeleted: false, isActive: true },
      order: { documentType: 'ASC', version: 'DESC' },
    });

    return {
      ...(m as unknown as MaterialResponseDto),
      documents: documents.map(d => this.toDocumentResponse(d)),
    };
  }

  async findActive(
    organizationId: string,
    materialCategoryId?: string,
    materialGroupId?: string,
  ): Promise<MaterialDropdownDto[]> {
    const qb = this.materialRepo.createQueryBuilder('m')
      .select([
        'm.id', 'm.dguid', 'm.code', 'm.shortDescription', 'm.unitOfMeasurementId',
        'm.status', 'm.criticalityLevel', 'm.isStockItem', 'm.isPurchaseOrderIssued',
      ])
      // Same filtered join as findAll — current documents only.
      .leftJoinAndSelect(
        'm.documents', 'documents',
        'documents.isDeleted = false AND documents.isActive = true',
      )
      .where('m.organizationId = :organizationId', { organizationId })
      .andWhere('m.isDeleted = false')
      .andWhere('m.status = :status', { status: MaterialStatus.ACTIVE });

    if (materialCategoryId) qb.andWhere('m.materialCategoryId = :catId', { catId: materialCategoryId });
    if (materialGroupId)    qb.andWhere('m.materialGroupId = :grpId',    { grpId: materialGroupId });

    const items = await qb.orderBy('m.shortDescription', 'ASC').getMany();

    return items.map(m => ({
      id:                  m.id,
      dguid:               m.dguid,
      code:                m.code,
      shortDescription:    m.shortDescription,
      unitOfMeasurementId: m.unitOfMeasurementId,
      status:              m.status,
      criticalityLevel:    m.criticalityLevel,
      isStockItem:         m.isStockItem,
      isPurchaseOrderIssued: m.isPurchaseOrderIssued,
      documents: (m.documents ?? []).map(d => this.toDocumentResponse(d)),
    }));
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

    const documentInputs = this.normaliseDocumentInput(dto);

    // Fields frozen by an issued purchase order are dropped from the payload
    // rather than rejecting the whole request — see stripPoLockedFields().
    const skippedFields = this.stripPoLockedFields(material, dto);

    await this.dataSource.transaction(async manager => {
      // flattenDto strips the document sections, so the deprecated flat URL
      // columns are never written directly from an update payload — they are
      // re-derived from material_documents below.
      const flat = this.flattenDto(dto);
      Object.assign(material, { ...flat, updatedBy: userEmail });
      await manager.save(Material, material);

      if (documentInputs.length) {
        // Documents supplied on update are ADDED, not swapped in: each becomes
        // a new row, superseding the current version of its type where that
        // type holds only one. Nothing already filed is discarded.
        for (const input of documentInputs) {
          await this.appendDocumentRow(manager, input, material, userEmail);
        }
        await this.syncLegacyDocumentColumns(manager, id, organizationId);
      }
    });

    if (skippedFields.length) {
      this.logger.log(
        `Material ${material.code} is purchase-order locked; ignored update to ` +
        `${skippedFields.join(', ')} (requested by ${userEmail})`,
      );
    }

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

    this.assertNotPoLocked(material, 'deleted');
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
