import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, LessThan, Repository, SelectQueryBuilder } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes, timingSafeEqual } from 'crypto';

import { Vendor }              from './entities/vendor.entity';
import { VendorContact }       from './entities/vendor-contact.entity';
import { VendorAddress }       from './entities/vendor-address.entity';
import { VendorBankAccount }   from './entities/vendor-bank-account.entity';
import { VendorCertification } from './entities/vendor-certification.entity';
import { VendorDocument }      from './entities/vendor-document.entity';
import { VendorMaterial }      from './entities/vendor-material.entity';
import { VendorTurnover }      from './entities/vendor-turnover.entity';
import { VendorEvaluation }    from './entities/vendor-evaluation.entity';
import { VendorPerformance }   from './entities/vendor-performance.entity';
import { VendorStatusChangeRequest } from './entities/vendor-status-change-request.entity';

import { IndustryCategory } from '../industry-category/entities/industry-category.entity';
import { Material }         from '../material/entities/material.entity';
import { User }             from '../user/entity/user.entity';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';
import { EmailService } from 'src/shared/email/email.service';
import { vendorStatusApprovalTemplate } from 'src/shared/email/templates/vendor-status-approval.template';

import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorQueryDto }  from './dto/vendor-query.dto';
import {
  VendorAddressResponseDto,
  VendorBankAccountResponseDto,
  VendorCertificationResponseDto,
  VendorContactResponseDto,
  VendorDocumentResponseDto,
  VendorDropdownDto,
  VendorEvaluationResponseDto,
  VendorListItemDto,
  VendorListResponseDto,
  VendorMaterialResponseDto,
  VendorPerformanceResponseDto,
  VendorResponseDto,
  VendorTurnoverResponseDto,
} from './dto/vendor-response.dto';
import {
  DecideVendorStatusChangeDto,
  RequestVendorStatusChangeDto,
  VendorStatusChangeAcceptedDto,
  VendorStatusChangeRequestResponseDto,
} from './dto/vendor-status-change.dto';

import { VendorStatus }              from './enums/vendor-status.enum';
import { PendingStatusChange }       from './enums/pending-status-change.enum';
import { StatusChangeRequestType }   from './enums/status-change-request-type.enum';
import { StatusChangeRequestStatus } from './enums/status-change-request-status.enum';
import { VendorCodeService } from './vendor-code.service';
import { VendorUsageValidationService } from './vendor-usage-validation.service';
import { MaterialCategory } from '../material-category/entities/material-category.entity';

const ALLOWED_SORT_FIELDS = new Set([
  'code', 'vendorName', 'tradeName', 'vendorStatus', 'vendorType',
  'vendorClassification', 'riskCategory', 'countryOfRegistration',
  'createdAt', 'updatedAt',
]);

// Roles permitted to see unmasked bank/IBAN/SWIFT values. Expressed here rather
// than in the controller so every read path is governed by one rule.
const SENSITIVE_DATA_ROLES = new Set(['SuperAdmin', 'OrganizationAdmin', 'FinanceAdmin']);

// Depth limit for the parent-company walk. Guards against a pre-existing cycle
// in data written before this validation existed.
const MAX_PARENT_DEPTH = 20;

// Roles that may approve a vendor blacklist / un-blacklist request, and that
// receive the notification email when no specific approver is nominated.
const APPROVER_ROLES = ['Manager', 'OrganizationAdmin', 'SuperAdmin'];

// Approval links stay valid for a week — long enough for a manager on leave,
// short enough that a leaked mailbox is not indefinitely exploitable.
const APPROVAL_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);

  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(VendorContact)
    private readonly contactRepo: Repository<VendorContact>,
    @InjectRepository(VendorAddress)
    private readonly addressRepo: Repository<VendorAddress>,
    @InjectRepository(VendorBankAccount)
    private readonly bankRepo: Repository<VendorBankAccount>,
    @InjectRepository(VendorCertification)
    private readonly certRepo: Repository<VendorCertification>,
    @InjectRepository(VendorDocument)
    private readonly documentRepo: Repository<VendorDocument>,
    @InjectRepository(VendorMaterial)
    private readonly vendorMaterialRepo: Repository<VendorMaterial>,
    @InjectRepository(VendorTurnover)
    private readonly turnoverRepo: Repository<VendorTurnover>,
    @InjectRepository(VendorEvaluation)
    private readonly evaluationRepo: Repository<VendorEvaluation>,
    @InjectRepository(VendorPerformance)
    private readonly performanceRepo: Repository<VendorPerformance>,
    @InjectRepository(VendorStatusChangeRequest)
    private readonly statusRequestRepo: Repository<VendorStatusChangeRequest>,
    @InjectRepository(IndustryCategory)
    private readonly industryCategoryRepo: Repository<IndustryCategory>,
    @InjectRepository(MaterialCategory)
    private readonly materialCategoryRepo: Repository<MaterialCategory>,
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly codeService: VendorCodeService,
    private readonly usageValidation: VendorUsageValidationService,
    private readonly cloudStorageService: CloudStorageService,
    private readonly emailService: EmailService,
  ) {}

  // ══ Dependency validators ═════════════════════════════════════════════

  // Industry Category must exist, belong to the caller's organization, be
  // active and not deleted. Its name supplies the vendor-code prefix.
  private async validateIndustryCategory(
    organizationId: string,
    industryCategoryId: string,
  ): Promise<IndustryCategory> {
    const category = await this.industryCategoryRepo.findOne({
      where: { id: industryCategoryId, organizationId, isDeleted: false },
    });
    if (!category) {
      throw new NotFoundException(
        `Industry Category ${industryCategoryId} not found in this organization`,
      );
    }
    if (!category.isActive) {
      throw new ConflictException(`Industry Category "${category.name}" is inactive`);
    }
    return category;
  }

  // Parent must exist in the same organization, must not be the vendor itself,
  // and must not already sit below the vendor in the hierarchy (cycle).
  private async validateParentCompany(
    organizationId: string,
    parentCompanyId: string,
    selfId?: string,
  ): Promise<Vendor> {
    if (selfId && parentCompanyId === selfId) {
      throw new UnprocessableEntityException('A vendor cannot be its own parent company');
    }

    const parent = await this.vendorRepo.findOne({
      where: { id: parentCompanyId, organizationId, isDeleted: false },
    });
    if (!parent) {
      throw new NotFoundException(`Parent vendor ${parentCompanyId} not found in this organization`);
    }

    // Walk up from the proposed parent. If we reach the vendor being edited,
    // the assignment would close a cycle:  A → B → C → A
    if (selfId) {
      let cursor = parent.parentCompanyId;
      let depth = 0;
      while (cursor && depth < MAX_PARENT_DEPTH) {
        if (cursor === selfId) {
          throw new UnprocessableEntityException(
            'Circular parent-company relationship detected: the selected parent is already a subsidiary of this vendor',
          );
        }
        const next = await this.vendorRepo.findOne({
          where: { id: cursor, organizationId },
          select: ['id', 'parentCompanyId'],
        });
        cursor = next?.parentCompanyId;
        depth++;
      }
      if (depth >= MAX_PARENT_DEPTH) {
        throw new UnprocessableEntityException(
          'Parent-company hierarchy exceeds the maximum supported depth',
        );
      }
    }

    return parent;
  }

  // Every material a vendor claims to supply must be a real, non-deleted
  // material in the same organization.
  private async validateMaterials(organizationId: string, materialIds: string[]): Promise<void> {
    if (!materialIds.length) return;

    const unique = [...new Set(materialIds)];
    if (unique.length !== materialIds.length) {
      throw new UnprocessableEntityException('Duplicate materialId entries in the materials list');
    }

    const found = await this.materialRepo.find({
      where: unique.map(id => ({ id, organizationId, isDeleted: false })),
      select: ['id'],
    });
    if (found.length !== unique.length) {
      const foundIds = new Set(found.map(m => m.id));
      const missing = unique.filter(id => !foundIds.has(id));
      throw new NotFoundException(
        `Material(s) not found in this organization: ${missing.join(', ')}`,
      );
    }
  }

  // ══ Duplicate protection ══════════════════════════════════════════════
  //
  // Scoped to the organization, and — for the statutory identifiers — to the
  // country of registration. A global group legitimately holds the same trade
  // name across jurisdictions, so a registration number is only a duplicate
  // when it collides within the same country.

  private async assertNoDuplicate(
    organizationId: string,
    dto: { vendorName?: string; countryOfRegistration?: string },
    statutory: { businessRegistrationNumber?: string; taxRegistrationNumber?: string },
    excludeId?: string,
  ): Promise<void> {
    if (dto.vendorName) {
      const qb = this.vendorRepo.createQueryBuilder('v')
        .where('v.organizationId = :organizationId', { organizationId })
        .andWhere('v.isDeleted = false')
        .andWhere('v.vendorName = :vendorName', { vendorName: dto.vendorName });
      if (excludeId) qb.andWhere('v.id != :excludeId', { excludeId });

      if (await qb.getExists()) {
        throw new ConflictException(`Vendor "${dto.vendorName}" already exists in this organization`);
      }
    }

    const checks: Array<[string, string, string]> = [];
    if (statutory.businessRegistrationNumber) {
      checks.push(['businessRegistrationNumber', statutory.businessRegistrationNumber, 'Business Registration Number']);
    }
    if (statutory.taxRegistrationNumber) {
      checks.push(['taxRegistrationNumber', statutory.taxRegistrationNumber, 'Tax Registration Number']);
    }

    for (const [column, value, label] of checks) {
      const qb = this.vendorRepo.createQueryBuilder('v')
        .where('v.organizationId = :organizationId', { organizationId })
        .andWhere('v.isDeleted = false')
        .andWhere(`v.${column} = :value`, { value });

      // Country-aware: the same identifier in a different country is not a clash.
      if (dto.countryOfRegistration) {
        qb.andWhere('v.countryOfRegistration = :country', { country: dto.countryOfRegistration });
      }
      if (excludeId) qb.andWhere('v.id != :excludeId', { excludeId });

      if (await qb.getExists()) {
        const where = dto.countryOfRegistration ? ` in ${dto.countryOfRegistration}` : '';
        throw new ConflictException(`A vendor with ${label} "${value}"${where} already exists`);
      }
    }
  }

  // ══ Sensitive-data access ═════════════════════════════════════════════

  canViewSensitive(role: string): boolean {
    return SENSITIVE_DATA_ROLES.has(role);
  }

  private assertCanViewSensitive(role: string): void {
    if (!this.canViewSensitive(role)) {
      throw new ForbiddenException(
        'You are not authorised to view unmasked vendor banking information',
      );
    }
  }

  // Shows only the last 4 characters. Returns null for empty input so the
  // response never carries a placeholder that looks like real data.
  private mask(value?: string): string | null {
    if (!value) return null;
    const last4 = value.slice(-4);
    return `${'*'.repeat(Math.max(value.length - 4, 4))}${last4}`;
  }

  // ══ Mappers ═══════════════════════════════════════════════════════════

  private toContactResponse(c: VendorContact): VendorContactResponseDto {
    return {
      id:             c.id,
      contactPerson:  c.contactPerson,
      designation:    c.designation,
      department:     c.department,
      email:          c.email,
      mobileNumber:   c.mobileNumber,
      landlineNumber: c.landlineNumber,
      isPrimary:      c.isPrimary,
      isActive:       c.isActive,
      remarks:        c.remarks,
    };
  }

  private toAddressResponse(a: VendorAddress): VendorAddressResponseDto {
    return {
      id:           a.id,
      addressType:  a.addressType,
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2,
      city:         a.city,
      state:        a.state,
      country:      a.country,
      postalCode:   a.postalCode,
      phoneNumber:  a.phoneNumber,
      email:        a.email,
      isPrimary:    a.isPrimary,
      isActive:     a.isActive,
    };
  }

  // reveal=true is only ever passed after assertCanViewSensitive() has run.
  private toBankResponse(b: VendorBankAccount, reveal: boolean): VendorBankAccountResponseDto {
    return {
      id:                     b.id,
      bankName:               b.bankName,
      branch:                 b.branch,
      accountHolderName:      b.accountHolderName,
      accountNumber:          reveal ? b.accountNumber : this.mask(b.accountNumberLast4 ? `********${b.accountNumberLast4}` : undefined),
      iban:                   reveal ? b.iban : undefined,
      swiftCode:              reveal ? b.swiftCode : undefined,
      currency:               b.currency,
      preferredPaymentMethod: b.preferredPaymentMethod,
      isPrimary:              b.isPrimary,
      isActive:               b.isActive,
      isMasked:               !reveal,
    };
  }

  private toCertificationResponse(c: VendorCertification): VendorCertificationResponseDto {
    const now = new Date();
    const expiry = c.expiryDate ? new Date(c.expiryDate) : null;
    const daysToExpiry = expiry
      ? Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000)
      : undefined;

    return {
      id:                   c.id,
      certificationName:    c.certificationName,
      certificateNumber:    c.certificateNumber,
      issuingAuthority:     c.issuingAuthority,
      issueDate:            c.issueDate,
      expiryDate:           c.expiryDate,
      documentUrl:          c.documentUrl,
      scopeOfCertification: c.scopeOfCertification,
      isActive:             c.isActive,
      isExpired:            expiry ? expiry.getTime() < now.getTime() : false,
      daysToExpiry,
    };
  }

  private toDocumentResponse(d: VendorDocument): VendorDocumentResponseDto {
    return {
      id:            d.id,
      documentType:  d.documentType,
      documentUrl:   d.documentUrl,
      fileName:      d.fileName,
      mimeType:      d.mimeType,
      fileSizeBytes: d.fileSizeBytes,
      version:       d.version,
      supersedesId:  d.supersedesId,
      effectiveFrom: d.effectiveFrom,
      effectiveTo:   d.effectiveTo,
      expiryDate:    d.expiryDate,
      isActive:      d.isActive,
      uploadedBy:    d.uploadedBy,
      uploadedAt:    d.uploadedAt,
    };
  }

  private toVendorMaterialResponse(vm: VendorMaterial): VendorMaterialResponseDto {
    return {
      id:                     vm.id,
      materialId:             vm.materialId,
      materialCode:           vm.material?.code,
      materialDescription:    vm.material?.shortDescription,
      vendorPartNumber:       vm.vendorPartNumber,
      manufacturerPartNumber: vm.manufacturerPartNumber,
      leadTimeDays:           vm.leadTimeDays,
      minimumOrderQuantity:   vm.minimumOrderQuantity,
      unitPrice:              vm.unitPrice,
      currency:               vm.currency,
      effectiveFrom:          vm.effectiveFrom,
      effectiveTo:            vm.effectiveTo,
      isPreferred:            vm.isPreferred,
      isActive:               vm.isActive,
    };
  }

  private toTurnoverResponse(t: VendorTurnover): VendorTurnoverResponseDto {
    return {
      id:                    t.id,
      financialYear:         t.financialYear,
      turnover:              t.turnover,
      currency:              t.currency,
      isAudited:             t.isAudited,
      financialStatementUrl: t.financialStatementUrl,
    };
  }

  private toListItem(v: Vendor): VendorListItemDto {
    return {
      id:                   v.id,
      dguid:                v.dguid,
      code:                 v.code,
      vendorName:           v.vendorName,
      tradeName:            v.tradeName,
      vendorType:           v.vendorType,
      vendorStatus:         v.vendorStatus,
      isActive:             v.isActive,
      industryCategoryId:   v.industryCategoryId,
      industryCategoryName: v.industryCategory?.name,
      productCategories:    v.productCategories,
      parentCompanyId:      v.parentCompanyId,
      parentCompanyName:    v.parentCompany?.vendorName,
      primaryContactPerson: v.primaryContactPerson,
      email:                v.email,
      mobileNumber:         v.mobileNumber,
      countryOfRegistration: v.countryOfRegistration,
      vendorClassification: v.vendorClassification,
      pendingStatusChange:  v.pendingStatusChange,
      riskCategory:         v.riskCategory,
      vendorEvaluationScore: v.vendorEvaluationScore,
      createdAt:            v.createdAt,
      updatedAt:            v.updatedAt,
    };
  }

  // ══ Query helpers ═════════════════════════════════════════════════════

  private applyFilters(qb: SelectQueryBuilder<Vendor>, query: VendorQueryDto): void {
    if (query.search) {
      // LOWER() on both sides gives predictable case-insensitive matching
      // regardless of the column collation.
      qb.andWhere(
        `(LOWER(v.code) LIKE :s
          OR LOWER(v.vendorName) LIKE :s
          OR LOWER(v.tradeName) LIKE :s
          OR LOWER(v.email) LIKE :s
          OR LOWER(v.businessRegistrationNumber) LIKE :s
          OR LOWER(v.taxRegistrationNumber) LIKE :s)`,
        { s: `%${query.search.toLowerCase()}%` },
      );
    }

    if (query.code)       qb.andWhere('LOWER(v.code) LIKE :code',   { code: `%${query.code.toLowerCase()}%` });
    if (query.vendorName) qb.andWhere('LOWER(v.vendorName) LIKE :vn', { vn: `%${query.vendorName.toLowerCase()}%` });
    if (query.email)      qb.andWhere('LOWER(v.email) LIKE :em',    { em: `%${query.email.toLowerCase()}%` });

    if (query.businessRegistrationNumber) {
      qb.andWhere('v.businessRegistrationNumber = :brn', { brn: query.businessRegistrationNumber });
    }
    if (query.taxRegistrationNumber) {
      qb.andWhere('v.taxRegistrationNumber = :trn', { trn: query.taxRegistrationNumber });
    }
    if (query.industryCategoryId)   qb.andWhere('v.industryCategoryId = :icId',  { icId: query.industryCategoryId });
    if (query.parentCompanyId)      qb.andWhere('v.parentCompanyId = :pcId',     { pcId: query.parentCompanyId });
    if (query.vendorType)           qb.andWhere('v.vendorType = :vType',         { vType: query.vendorType });
    if (query.vendorStatus)         qb.andWhere('v.vendorStatus = :vStatus',     { vStatus: query.vendorStatus });
    if (query.vendorClassification) qb.andWhere('v.vendorClassification = :vc',  { vc: query.vendorClassification });
    if (query.riskCategory)         qb.andWhere('v.riskCategory = :rc',          { rc: query.riskCategory });
    if (query.pendingStatusChange)  qb.andWhere('v.pendingStatusChange = :psc',  { psc: query.pendingStatusChange });
    if (query.countryOfRegistration) qb.andWhere('v.countryOfRegistration = :cor', { cor: query.countryOfRegistration });
    if (query.isActive !== undefined) qb.andWhere('v.isActive = :isActive',      { isActive: query.isActive });

    // Blacklisted vendors are hidden unless explicitly requested — they must
    // not leak into ordinary selection lists, RFQ pickers, or the AVL.
    // An explicit vendorStatus=BLACKLISTED filter is honoured on its own.
    if (!query.includeBlacklisted && query.vendorStatus !== VendorStatus.BLACKLISTED) {
      qb.andWhere('v.vendorStatus != :blacklisted', { blacklisted: VendorStatus.BLACKLISTED });
    }
  }

  // ══ Create ════════════════════════════════════════════════════════════

  async create(
    dto: CreateVendorDto,
    organizationId: string,
    userEmail: string,
  ): Promise<VendorResponseDto> {
    // Validate everything that can be checked without a transaction first, so
    // we never open one only to roll it straight back.
    const category = await this.validateIndustryCategory(organizationId, dto.industryCategoryId);

    if (dto.parentCompanyId) {
      await this.validateParentCompany(organizationId, dto.parentCompanyId);
    }

    await this.assertNoDuplicate(
      organizationId,
      { vendorName: dto.vendorName, countryOfRegistration: dto.countryOfRegistration },
      dto.statutory ?? {},
    );

    if (dto.materials?.length) {
      await this.validateMaterials(organizationId, dto.materials.map(m => m.materialId));
    }

    this.assertSinglePrimary(dto.contacts, 'contact');
    this.assertSinglePrimary(dto.bankAccounts, 'bank account');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const categoryPrefix = this.codeService.deriveCategoryPrefix(category.name);
      const code = await this.codeService.generateCode(queryRunner, organizationId, categoryPrefix);

      const vendorId = uuidv4();
      const primaryContact = dto.contacts?.find(c => c.isPrimary) ?? dto.contacts?.[0];

      const vendor = queryRunner.manager.create(Vendor, {
        ...this.flattenDto(dto),
        id:    vendorId,
        dguid: uuidv4(),
        organizationId,
        code,
        industryCategoryId: dto.industryCategoryId,

        // A newly created vendor is never automatically approved: it enters the
        // qualification pipeline and is unavailable to transactions until an
        // authorised user enables it.
        vendorStatus: VendorStatus.UNDER_EVALUATION,
        isActive:     false,

        // Mirror the primary contact onto the vendor for cheap list rendering.
        primaryContactPerson: dto.primaryContactPerson ?? primaryContact?.contactPerson,
        designation:          dto.designation          ?? primaryContact?.designation,
        email:                dto.email                ?? primaryContact?.email,
        mobileNumber:         dto.mobileNumber         ?? primaryContact?.mobileNumber,
        landlineNumber:       dto.landlineNumber       ?? primaryContact?.landlineNumber,

        createdBy: userEmail,
        updatedBy: userEmail,
      });

      await queryRunner.manager.save(Vendor, vendor);
      await this.saveChildren(queryRunner.manager, dto, vendorId, organizationId, userEmail);

      await queryRunner.commitTransaction();

      this.logger.log(`Vendor ${code} created in organization ${organizationId} by ${userEmail}`);
      return this.findOne(vendorId, organizationId, userEmail, /* role */ '');
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err?.code === 'ER_DUP_ENTRY') {
        // The counter lock makes a code collision effectively impossible; this
        // catches the child-table unique constraints (e.g. vendor+material).
        throw new ConflictException(
          'A conflicting vendor record already exists in your organization',
        );
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // Persists every child collection inside the caller's transaction, so a
  // failure anywhere leaves no partially-created vendor behind.
  private async saveChildren(
    manager: EntityManager,
    dto: CreateVendorDto,
    vendorId: string,
    organizationId: string,
    userEmail: string,
  ): Promise<void> {
    const base = { vendorId, organizationId, createdBy: userEmail, updatedBy: userEmail };

    if (dto.addresses?.length) {
      await manager.save(VendorAddress, dto.addresses.map(a =>
        manager.create(VendorAddress, { ...a, ...base, dguid: uuidv4() }),
      ));
    }

    if (dto.contacts?.length) {
      await manager.save(VendorContact, dto.contacts.map(c =>
        manager.create(VendorContact, { ...c, ...base, dguid: uuidv4() }),
      ));
    }

    if (dto.bankAccounts?.length) {
      await manager.save(VendorBankAccount, dto.bankAccounts.map(b =>
        manager.create(VendorBankAccount, {
          ...b,
          ...base,
          dguid: uuidv4(),
          // Persisted so masked views never need to select the full number.
          accountNumberLast4: b.accountNumber ? b.accountNumber.slice(-4) : null,
        }),
      ));
    }

    if (dto.certifications?.length) {
      await manager.save(VendorCertification, dto.certifications.map(c =>
        manager.create(VendorCertification, { ...c, ...base, dguid: uuidv4() }),
      ));
    }

    if (dto.documents?.length) {
      await manager.save(VendorDocument, dto.documents.map(d =>
        manager.create(VendorDocument, {
          ...d,
          ...base,
          dguid:      uuidv4(),
          version:    1,
          uploadedBy: userEmail,
          uploadedAt: new Date(),
        }),
      ));
    }

    if (dto.materials?.length) {
      await manager.save(VendorMaterial, dto.materials.map(m =>
        manager.create(VendorMaterial, { ...m, ...base, dguid: uuidv4() }),
      ));
    }

    if (dto.turnovers?.length) {
      await manager.save(VendorTurnover, dto.turnovers.map(t =>
        manager.create(VendorTurnover, { ...t, ...base, dguid: uuidv4() }),
      ));
    }
  }

  // Flattens the grouped optional sections onto the vendor row, mirroring
  // MaterialService.flattenDto.
  private flattenDto(dto: CreateVendorDto | UpdateVendorDto): Partial<Vendor> {
    const {
      statutory, commercial, technical, qualityHse, experience, logistics, evaluation,
      addresses, contacts, bankAccounts, certifications, documents, materials, turnovers,
      ...core
    } = dto as any;

    return {
      ...core,
      ...(statutory  ?? {}),
      ...(commercial ?? {}),
      ...(technical  ?? {}),
      ...(qualityHse ?? {}),
      ...(experience ?? {}),
      ...(logistics  ?? {}),
      ...(evaluation ?? {}),
    };
  }

  // A vendor with a status change awaiting approval is frozen for other
  // lifecycle operations, so an enable/disable/delete cannot race the pending
  // decision and leave the two out of step.
  private assertNoPendingStatusChange(vendor: Vendor, operation: string): void {
    if (!vendor.pendingStatusChange) return;
    const label = vendor.pendingStatusChange === PendingStatusChange.PENDING_BLACKLIST
      ? 'blacklist'
      : 'un-blacklist';
    throw new ConflictException(
      `Vendor cannot be ${operation}d while a ${label} request is awaiting manager approval. ` +
      'Resolve or cancel that request first.',
    );
  }

  private assertSinglePrimary(rows: Array<{ isPrimary?: boolean }> | undefined, label: string): void {
    if (!rows?.length) return;
    const primaries = rows.filter(r => r.isPrimary).length;
    if (primaries > 1) {
      throw new UnprocessableEntityException(`Only one ${label} may be marked as primary`);
    }
  }

  // ══ Read ══════════════════════════════════════════════════════════════

  async findAll(query: VendorQueryDto, organizationId: string): Promise<VendorListResponseDto> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = query;
    const safeSortBy = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : 'createdAt';

    const qb = this.vendorRepo.createQueryBuilder('v')
      .leftJoinAndSelect('v.industryCategory', 'industryCategory')
      .leftJoinAndSelect('v.parentCompany',    'parentCompany')
      .where('v.organizationId = :organizationId', { organizationId })
      .andWhere('v.isDeleted = false');

    this.applyFilters(qb, query);

    qb.orderBy(`v.${safeSortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items:      items.map(v => this.toListItem(v)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Dropdown feed. Returns only vendors that are genuinely selectable for new
  // transactions: ACTIVE business status AND isActive, never blacklisted.
  async findActive(
    organizationId: string,
    industryCategoryId?: string,
    vendorType?: string,
  ): Promise<VendorDropdownDto[]> {
    const qb = this.vendorRepo.createQueryBuilder('v')
      .where('v.organizationId = :organizationId', { organizationId })
      .andWhere('v.isDeleted = false')
      .andWhere('v.isActive = true')
      .andWhere('v.vendorStatus = :status', { status: VendorStatus.ACTIVE });

    //if (industryCategoryId) qb.andWhere('v.industryCategoryId = :icId', { icId: industryCategoryId });
    if (vendorType)         qb.andWhere('v.vendorType = :vType',        { vType: vendorType });

    qb.orderBy('v.vendorName', 'ASC');

    const items = await qb.getMany();
    return items.map(v => ({
      id:                   v.id,
      dguid:                v.dguid,
      code:                 v.code,
      vendorName:           v.vendorName,
      tradeName:            v.tradeName,
      vendorType:           v.vendorType,
      vendorStatus:         v.vendorStatus,
      vendorClassification: v.vendorClassification,
      industryCategoryId:   v.industryCategoryId,
    }));
  }

  async findOne(
    id: string,
    organizationId: string,
    _userEmail: string,
    role: string,
  ): Promise<VendorResponseDto> {
    const vendor = await this.findVendorOrThrow(id, organizationId, [
      'industryCategory', 'parentCompany',
    ]);

    const reveal = this.canViewSensitive(role);

    // Children are loaded separately so the bank query can opt into the
    // { select: false } columns only when the caller is authorised.
    const [contacts, addresses, banks, certs, docs, mats, turnovers] = await Promise.all([
      this.contactRepo.find({ where: { vendorId: id, organizationId, isDeleted: false }, order: { isPrimary: 'DESC', contactPerson: 'ASC' } }),
      this.addressRepo.find({ where: { vendorId: id, organizationId, isDeleted: false }, order: { isPrimary: 'DESC', addressType: 'ASC' } }),
      this.loadBankAccounts(id, organizationId, reveal),
      this.certRepo.find({ where: { vendorId: id, organizationId, isDeleted: false }, order: { expiryDate: 'ASC' } }),
      this.documentRepo.find({ where: { vendorId: id, organizationId, isDeleted: false }, order: { documentType: 'ASC', version: 'DESC' } }),
      this.vendorMaterialRepo.find({ where: { vendorId: id, organizationId, isDeleted: false }, relations: ['material'] }),
      this.turnoverRepo.find({ where: { vendorId: id, organizationId, isDeleted: false }, order: { financialYear: 'DESC' } }),
    ]);

    return {
      ...(vendor as unknown as VendorResponseDto),
      contacts:       contacts.map(c => this.toContactResponse(c)),
      addresses:      addresses.map(a => this.toAddressResponse(a)),
      bankAccounts:   banks.map(b => this.toBankResponse(b, reveal)),
      certifications: certs.map(c => this.toCertificationResponse(c)),
      documents:      docs.map(d => this.toDocumentResponse(d)),
      materials:      mats.map(m => this.toVendorMaterialResponse(m)),
      turnovers:      turnovers.map(t => this.toTurnoverResponse(t)),
    };
  }

  // The only place that adds the sensitive columns back into a SELECT.
  private async loadBankAccounts(
    vendorId: string,
    organizationId: string,
    reveal: boolean,
  ): Promise<VendorBankAccount[]> {
    const qb = this.bankRepo.createQueryBuilder('b')
      .where('b.vendorId = :vendorId', { vendorId })
      .andWhere('b.organizationId = :organizationId', { organizationId })
      .andWhere('b.isDeleted = false')
      .orderBy('b.isPrimary', 'DESC');

    if (reveal) {
      qb.addSelect(['b.accountNumber', 'b.iban', 'b.swiftCode']);
    }
    return qb.getMany();
  }

  // Central organization-ownership gate. Every read and write path goes
  // through here, so a vendor from another organization is indistinguishable
  // from one that does not exist.
  private async findVendorOrThrow(
    id: string,
    organizationId: string,
    relations: string[] = [],
  ): Promise<Vendor> {
    const vendor = await this.vendorRepo.findOne({
      where: { id, organizationId, isDeleted: false },
      relations,
    });
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  // ══ Sub-resource reads ════════════════════════════════════════════════

  async findContacts(id: string, organizationId: string): Promise<VendorContactResponseDto[]> {
    await this.findVendorOrThrow(id, organizationId);
    const rows = await this.contactRepo.find({
      where: { vendorId: id, organizationId, isDeleted: false },
      order: { isPrimary: 'DESC', contactPerson: 'ASC' },
    });
    return rows.map(c => this.toContactResponse(c));
  }

  async findAddresses(id: string, organizationId: string): Promise<VendorAddressResponseDto[]> {
    await this.findVendorOrThrow(id, organizationId);
    const rows = await this.addressRepo.find({
      where: { vendorId: id, organizationId, isDeleted: false },
      order: { isPrimary: 'DESC', addressType: 'ASC' },
    });
    return rows.map(a => this.toAddressResponse(a));
  }

  async findBankAccounts(
    id: string,
    organizationId: string,
    role: string,
    reveal: boolean,
  ): Promise<VendorBankAccountResponseDto[]> {
    await this.findVendorOrThrow(id, organizationId);
    if (reveal) this.assertCanViewSensitive(role);

    const rows = await this.loadBankAccounts(id, organizationId, reveal);
    return rows.map(b => this.toBankResponse(b, reveal));
  }

  async findCertifications(id: string, organizationId: string): Promise<VendorCertificationResponseDto[]> {
    await this.findVendorOrThrow(id, organizationId);
    const rows = await this.certRepo.find({
      where: { vendorId: id, organizationId, isDeleted: false },
      order: { expiryDate: 'ASC' },
    });
    return rows.map(c => this.toCertificationResponse(c));
  }

  async findDocuments(id: string, organizationId: string): Promise<VendorDocumentResponseDto[]> {
    await this.findVendorOrThrow(id, organizationId);
    const rows = await this.documentRepo.find({
      where: { vendorId: id, organizationId, isDeleted: false },
      order: { documentType: 'ASC', version: 'DESC' },
    });
    return rows.map(d => this.toDocumentResponse(d));
  }

  async findMaterials(id: string, organizationId: string): Promise<VendorMaterialResponseDto[]> {
    await this.findVendorOrThrow(id, organizationId);
    const rows = await this.vendorMaterialRepo.find({
      where: { vendorId: id, organizationId, isDeleted: false },
      relations: ['material'],
    });
    return rows.map(m => this.toVendorMaterialResponse(m));
  }

  async findPerformance(id: string, organizationId: string): Promise<VendorPerformanceResponseDto[]> {
    await this.findVendorOrThrow(id, organizationId);
    return this.performanceRepo.find({
      where: { vendorId: id, organizationId },
      order: { evaluatedAt: 'DESC' },
    }) as unknown as Promise<VendorPerformanceResponseDto[]>;
  }

  async findEvaluations(id: string, organizationId: string): Promise<VendorEvaluationResponseDto[]> {
    await this.findVendorOrThrow(id, organizationId);
    return this.evaluationRepo.find({
      where: { vendorId: id, organizationId },
      order: { evaluatedAt: 'DESC' },
    }) as unknown as Promise<VendorEvaluationResponseDto[]>;
  }

  // ══ Update ════════════════════════════════════════════════════════════

  async update(
    id: string,
    dto: UpdateVendorDto,
    organizationId: string,
    userEmail: string,
    role: string,
  ): Promise<VendorResponseDto> {
    const vendor = await this.findVendorOrThrow(id, organizationId);

    // code is server-generated; reject any attempt to move it even though the
    // DTO never declares it.
    if ((dto as any).code !== undefined) {
      throw new ConflictException('Vendor code is server-generated and cannot be changed');
    }
    // industryCategoryId is omitted by UpdateVendorDto — the issued code
    // encodes the category prefix, so re-pointing it would desynchronise them.
    if ((dto as any).industryCategoryId !== undefined) {
      throw new ConflictException(
        'Industry Category cannot be changed after the vendor code has been issued',
      );
    }
    // Business status moves only through the dedicated endpoints.
    if ((dto as any).vendorStatus !== undefined) {
      throw new ConflictException(
        'Vendor status must be changed via the enable, disable, or blacklist endpoints',
      );
    }

    if (dto.parentCompanyId) {
      await this.validateParentCompany(organizationId, dto.parentCompanyId, id);
    }

    const nameChanged = dto.vendorName && dto.vendorName !== vendor.vendorName;
    if (nameChanged || dto.statutory) {
      await this.assertNoDuplicate(
        organizationId,
        {
          vendorName: nameChanged ? dto.vendorName : undefined,
          countryOfRegistration: dto.countryOfRegistration ?? vendor.countryOfRegistration,
        },
        dto.statutory ?? {},
        id,
      );
    }

    // Scalars and child collections move together, so a half-applied update
    // cannot leave the vendor's addresses out of step with its own columns.
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const flat = this.flattenDto(dto);
      Object.assign(vendor, { ...flat, updatedBy: userEmail });
      await queryRunner.manager.save(Vendor, vendor);

      await this.replaceChildren(queryRunner.manager, dto, id, organizationId, userEmail);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return this.findOne(id, organizationId, userEmail, role);
  }

  // Replaces the child collections an update actually carried.
  //
  // Only collections PRESENT on the DTO are touched: a partial update that
  // omits `documents` leaves the existing documents alone, rather than wiping
  // rows the caller never mentioned. A collection that is present replaces the
  // previous set wholesale — the client sends the complete list it wants.
  //
  // Superseded rows are soft-deleted rather than removed, so the history that
  // procurement and audit rely on survives the edit.
  private async replaceChildren(
    manager: EntityManager,
    dto: UpdateVendorDto,
    vendorId: string,
    organizationId: string,
    userEmail: string,
  ): Promise<void> {
    const collections: [any, keyof UpdateVendorDto][] = [
      [VendorAddress,       'addresses'],
      [VendorContact,       'contacts'],
      [VendorBankAccount,   'bankAccounts'],
      [VendorCertification, 'certifications'],
      [VendorDocument,      'documents'],
      [VendorTurnover,      'turnovers'],
    ];

    const touched = collections.filter(([, key]) => dto[key] !== undefined);
    if (!touched.length) return;

    for (const [entity, key] of touched) {
      await manager.update(
        entity,
        { vendorId, organizationId, isDeleted: false },
        { isDeleted: true, deletedAt: new Date(), deletedBy: userEmail },
      );
    }

    // saveChildren only inserts the keys it is given, so handing it a DTO
    // narrowed to the touched collections reuses the create path exactly.
    const inserts = Object.fromEntries(touched.map(([, key]) => [key, dto[key]]));
    await this.saveChildren(
      manager,
      inserts as unknown as CreateVendorDto,
      vendorId,
      organizationId,
      userEmail,
    );
  }

  // ══ Lifecycle transitions ═════════════════════════════════════════════

  // Makes the vendor selectable for new transactions. Blacklisted vendors
  // cannot be enabled without being un-blacklisted first.
  async enable(
    id: string,
    organizationId: string,
    userEmail: string,
    role: string,
  ): Promise<VendorResponseDto> {
    const vendor = await this.findVendorOrThrow(id, organizationId);

    if (vendor.vendorStatus === VendorStatus.BLACKLISTED) {
      throw new ConflictException(
        'A blacklisted vendor cannot be enabled. Remove the blacklisting first.',
      );
    }
    this.assertNoPendingStatusChange(vendor, 'enable');
    if (vendor.isActive && vendor.vendorStatus === VendorStatus.ACTIVE) {
      throw new ConflictException('Vendor is already active');
    }

    vendor.vendorStatus = VendorStatus.ACTIVE;
    vendor.isActive     = true;
    vendor.updatedBy    = userEmail;
    await this.vendorRepo.save(vendor);

    this.logger.log(`Vendor ${vendor.code} enabled by ${userEmail}`);
    return this.findOne(id, organizationId, userEmail, role);
  }

  // Deactivation is deliberately NOT blocked by transactional history: a
  // vendor with historical purchase orders can still be taken out of service.
  // The history stays intact and resolvable.
  async disable(
    id: string,
    organizationId: string,
    userEmail: string,
    role: string,
  ): Promise<VendorResponseDto> {
    const vendor = await this.findVendorOrThrow(id, organizationId);

    if (!vendor.isActive && vendor.vendorStatus === VendorStatus.INACTIVE) {
      throw new ConflictException('Vendor is already inactive');
    }
    if (vendor.vendorStatus === VendorStatus.BLACKLISTED) {
      throw new ConflictException('Vendor is blacklisted and already excluded from new transactions');
    }
    this.assertNoPendingStatusChange(vendor, 'disable');

    vendor.vendorStatus = VendorStatus.INACTIVE;
    vendor.isActive     = false;
    vendor.updatedBy    = userEmail;
    await this.vendorRepo.save(vendor);

    this.logger.log(`Vendor ${vendor.code} disabled by ${userEmail}`);
    return this.findOne(id, organizationId, userEmail, role);
  }

  // ══ Blacklist / un-blacklist — maker–checker ══════════════════════════
  //
  // Neither operation applies immediately. The requester raises it, the vendor
  // is marked PENDING_BLACKLIST / PENDING_UNBLACKLIST, and a manager is emailed
  // an approval link. vendorStatus and isActive only move once the decision is
  // recorded, so a rejected request needs no compensating update and a single
  // person can never blacklist a vendor on their own.

  // Raises a blacklist request. Blacklisting is a business decision, not a
  // deletion: the record and all its transactional history stay intact.
  async requestBlacklist(
    id: string,
    organizationId: string,
    dto: RequestVendorStatusChangeDto,
    userEmail: string,
  ): Promise<VendorStatusChangeAcceptedDto> {
    const vendor = await this.findVendorOrThrow(id, organizationId);

    if (vendor.vendorStatus === VendorStatus.BLACKLISTED) {
      throw new ConflictException('Vendor is already blacklisted');
    }
    return this.raiseStatusChangeRequest(
      vendor, organizationId, StatusChangeRequestType.BLACKLIST, dto, userEmail,
    );
  }

  // Raises a request to lift a blacklisting. On approval the vendor returns to
  // UNDER_EVALUATION rather than straight to ACTIVE — re-qualification stays a
  // deliberate second step.
  async requestRemoveBlacklist(
    id: string,
    organizationId: string,
    dto: RequestVendorStatusChangeDto,
    userEmail: string,
  ): Promise<VendorStatusChangeAcceptedDto> {
    const vendor = await this.findVendorOrThrow(id, organizationId);

    if (vendor.vendorStatus !== VendorStatus.BLACKLISTED) {
      throw new ConflictException('Vendor is not blacklisted');
    }
    return this.raiseStatusChangeRequest(
      vendor, organizationId, StatusChangeRequestType.UNBLACKLIST, dto, userEmail,
    );
  }

  private async raiseStatusChangeRequest(
    vendor: Vendor,
    organizationId: string,
    requestType: StatusChangeRequestType,
    dto: RequestVendorStatusChangeDto,
    userEmail: string,
  ): Promise<VendorStatusChangeAcceptedDto> {
    if (vendor.pendingStatusChange) {
      throw new ConflictException(
        `A ${vendor.pendingStatusChange === PendingStatusChange.PENDING_BLACKLIST ? 'blacklist' : 'un-blacklist'} ` +
        'request is already awaiting approval for this vendor',
      );
    }
    if (!dto.reason?.trim()) {
      throw new BadRequestException('A reason is required when requesting a vendor status change');
    }

    const approvers = await this.resolveApprovers(organizationId, dto.approverUserId);
    if (!approvers.length) {
      throw new UnprocessableEntityException(
        'No active approver (Manager / OrganizationAdmin / SuperAdmin) is available in this organization to review the request',
      );
    }

    // 32 random bytes — the token is the approval credential and must not be
    // guessable. Only the hex string in the email can satisfy it.
    const token = randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + APPROVAL_TOKEN_TTL_MS);

    const pending = requestType === StatusChangeRequestType.BLACKLIST
      ? PendingStatusChange.PENDING_BLACKLIST
      : PendingStatusChange.PENDING_UNBLACKLIST;

    const request = await this.dataSource.transaction(async manager => {
      const created = manager.create(VendorStatusChangeRequest, {
        id:    uuidv4(),
        dguid: uuidv4(),
        organizationId,
        vendorId:    vendor.id,
        requestType,
        status:      StatusChangeRequestStatus.PENDING,
        reason:      dto.reason.trim(),
        requestedBy: userEmail,
        requestedAt: now,
        notifiedApprovers: approvers.map(a => a.email),
        approverUserId:    dto.approverUserId ?? null,
        approvalToken:     token,
        tokenExpiresAt:    expiresAt,
        // Snapshot so a rejection restores the exact prior state.
        previousVendorStatus: vendor.vendorStatus,
        previousIsActive:     vendor.isActive,
        createdBy: userEmail,
        updatedBy: userEmail,
      });
      await manager.save(VendorStatusChangeRequest, created);

      // Only the pending marker moves now; the settled status is untouched.
      vendor.pendingStatusChange          = pending;
      vendor.pendingStatusChangeRequestId = created.id;
      vendor.updatedBy                    = userEmail;
      await manager.save(Vendor, vendor);

      return created;
    });

    const notificationSent = await this.sendApprovalEmail(request, vendor, approvers, token);

    this.logger.log(
      `Vendor ${vendor.code} ${requestType} requested by ${userEmail}; ` +
      `${approvers.length} approver(s) notified (delivered=${notificationSent})`,
    );

    return {
      request: this.toStatusRequestResponse(request, vendor),
      notificationSent,
      approversNotified: approvers.length,
    };
  }

  // Resolves who may approve. A nominated approver must hold an approver role
  // in the same organization; otherwise every active approver is notified.
  private async resolveApprovers(
    organizationId: string,
    approverUserId?: string,
  ): Promise<Array<{ id: string; email: string; name: string }>> {
    const qb = this.userRepository.createQueryBuilder('u')
      .leftJoinAndSelect('u.role', 'role')
      .where('u.organizationId = :organizationId', { organizationId })
      .andWhere('u.is_deleted = false')
      .andWhere('u.is_active = 1')
      .andWhere('role.name IN (:...roles)', { roles: APPROVER_ROLES });

    if (approverUserId) qb.andWhere('u.id = :approverUserId', { approverUserId });

    const users = await qb.getMany();

    if (approverUserId && !users.length) {
      throw new NotFoundException(
        `Approver ${approverUserId} not found in this organization, or does not hold an approver role`,
      );
    }

    return users
      .filter(u => !!u.email)
      .map(u => ({
        id:    u.id,
        email: u.email,
        name:  [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email,
      }));
  }

  // The link lands on the application, where the approver signs in and confirms.
  // A bare GET-to-approve URL is deliberately avoided: mail scanners and
  // link-preview crawlers pre-fetch URLs, which would approve requests nobody
  // clicked. The token authorises the decision; the JWT proves who made it.
  private async sendApprovalEmail(
    request: VendorStatusChangeRequest,
    vendor: Vendor,
    approvers: Array<{ email: string }>,
    token: string,
  ): Promise<boolean> {
    const approvalLink =
      `${process.env.FRONTEND_URL}/vendors/status-approval` +
      `?requestId=${request.id}&token=${token}`;

    try {
      // Never log the token or the composed link.
      return await this.emailService.sendEmail({
        to: approvers.map(a => a.email),
        subject:
          request.requestType === StatusChangeRequestType.BLACKLIST
            ? `Approval required: blacklist vendor ${vendor.code} — ${vendor.vendorName}`
            : `Approval required: remove blacklist for vendor ${vendor.code} — ${vendor.vendorName}`,
        html: vendorStatusApprovalTemplate({
          approvalLink,
          vendorCode:  vendor.code,
          vendorName:  vendor.vendorName,
          action:      request.requestType === StatusChangeRequestType.BLACKLIST ? 'BLACKLIST' : 'UNBLACKLIST',
          reason:      request.reason,
          requestedBy: request.requestedBy,
          requestedAt: request.requestedAt,
          expiresAt:   request.tokenExpiresAt,
        }),
      });
    } catch (err) {
      // A mail outage must not roll back a persisted request — the approver can
      // still act from the pending-requests screen.
      this.logger.error(
        `Approval email for vendor ${vendor.code} could not be sent: ${err?.message ?? 'unknown error'}`,
      );
      return false;
    }
  }

  // ══ Approval decisions ════════════════════════════════════════════════

  async approveStatusChange(
    requestId: string,
    organizationId: string,
    dto: DecideVendorStatusChangeDto,
    userEmail: string,
    role: string,
  ): Promise<VendorResponseDto> {
    const request = await this.loadPendingRequestOrThrow(requestId, organizationId, dto.token);
    const vendor  = await this.findVendorOrThrow(request.vendorId, organizationId);

    // The maker cannot be the checker.
    if (request.requestedBy?.toLowerCase() === userEmail?.toLowerCase()) {
      throw new ForbiddenException(
        'The user who raised the request cannot approve it. A different manager must review it.',
      );
    }

    const now = new Date();
    await this.dataSource.transaction(async manager => {
      if (request.requestType === StatusChangeRequestType.BLACKLIST) {
        vendor.vendorStatus    = VendorStatus.BLACKLISTED;
        vendor.isActive        = false;
        vendor.blacklistReason = request.reason;
        vendor.blacklistedAt   = now;
        vendor.blacklistedBy   = request.requestedBy;
      } else {
        // Back to re-qualification, not straight to ACTIVE. The blacklisting
        // reason and timestamps are retained as history.
        vendor.vendorStatus = VendorStatus.UNDER_EVALUATION;
        vendor.isActive     = false;
      }

      vendor.pendingStatusChange          = null;
      vendor.pendingStatusChangeRequestId = null;
      vendor.updatedBy                    = userEmail;
      await manager.save(Vendor, vendor);

      await manager.update(VendorStatusChangeRequest, { id: request.id }, {
        status:           StatusChangeRequestStatus.APPROVED,
        decidedBy:        userEmail,
        decidedAt:        now,
        decisionComments: dto.comments ?? null,
        approvalToken:    null, // single use — burn it
        updatedBy:        userEmail,
      });
    });

    this.logger.warn(
      `Vendor ${vendor.code} ${request.requestType} request approved by ${userEmail} ` +
      `(raised by ${request.requestedBy})`,
    );
    return this.findOne(vendor.id, organizationId, userEmail, role);
  }

  async rejectStatusChange(
    requestId: string,
    organizationId: string,
    dto: DecideVendorStatusChangeDto,
    userEmail: string,
    role: string,
  ): Promise<VendorResponseDto> {
    const request = await this.loadPendingRequestOrThrow(requestId, organizationId, dto.token);
    const vendor  = await this.findVendorOrThrow(request.vendorId, organizationId);

    if (request.requestedBy?.toLowerCase() === userEmail?.toLowerCase()) {
      throw new ForbiddenException(
        'The user who raised the request cannot reject it. Cancel it instead.',
      );
    }

    const now = new Date();
    await this.dataSource.transaction(async manager => {
      // Nothing to undo — the settled status never moved. Just clear the flag.
      vendor.pendingStatusChange          = null;
      vendor.pendingStatusChangeRequestId = null;
      vendor.updatedBy                    = userEmail;
      await manager.save(Vendor, vendor);

      await manager.update(VendorStatusChangeRequest, { id: request.id }, {
        status:           StatusChangeRequestStatus.REJECTED,
        decidedBy:        userEmail,
        decidedAt:        now,
        decisionComments: dto.comments ?? null,
        approvalToken:    null,
        updatedBy:        userEmail,
      });
    });

    this.logger.log(`Vendor ${vendor.code} ${request.requestType} request rejected by ${userEmail}`);
    return this.findOne(vendor.id, organizationId, userEmail, role);
  }

  // Lets the requester withdraw their own request without a manager decision.
  async cancelStatusChange(
    requestId: string,
    organizationId: string,
    userEmail: string,
    role: string,
  ): Promise<VendorResponseDto> {
    const request = await this.statusRequestRepo.findOne({
      where: { id: requestId, organizationId, status: StatusChangeRequestStatus.PENDING },
    });
    if (!request) throw new NotFoundException('Pending status change request not found');

    if (request.requestedBy?.toLowerCase() !== userEmail?.toLowerCase()) {
      throw new ForbiddenException('Only the user who raised the request may cancel it');
    }

    const vendor = await this.findVendorOrThrow(request.vendorId, organizationId);

    await this.dataSource.transaction(async manager => {
      vendor.pendingStatusChange          = null;
      vendor.pendingStatusChangeRequestId = null;
      vendor.updatedBy                    = userEmail;
      await manager.save(Vendor, vendor);

      await manager.update(VendorStatusChangeRequest, { id: request.id }, {
        status:        StatusChangeRequestStatus.CANCELLED,
        decidedBy:     userEmail,
        decidedAt:     new Date(),
        approvalToken: null,
        updatedBy:     userEmail,
      });
    });

    return this.findOne(vendor.id, organizationId, userEmail, role);
  }

  // Loads a PENDING request and verifies the emailed token. Token comparison is
  // constant-time so a mismatch cannot be narrowed down by timing.
  private async loadPendingRequestOrThrow(
    requestId: string,
    organizationId: string,
    token: string,
  ): Promise<VendorStatusChangeRequest> {
    const request = await this.statusRequestRepo.createQueryBuilder('r')
      .addSelect('r.approvalToken')
      .where('r.id = :requestId', { requestId })
      .andWhere('r.organizationId = :organizationId', { organizationId })
      .getOne();

    if (!request) throw new NotFoundException('Status change request not found');

    if (request.status !== StatusChangeRequestStatus.PENDING) {
      throw new ConflictException(
        `This request has already been ${request.status.toLowerCase()} and cannot be actioned again`,
      );
    }
    if (request.tokenExpiresAt && request.tokenExpiresAt.getTime() < Date.now()) {
      throw new ConflictException(
        'The approval link has expired. Ask the requester to raise the request again.',
      );
    }
    if (!this.tokensMatch(request.approvalToken, token)) {
      throw new ForbiddenException('Invalid approval token');
    }
    return request;
  }

  private tokensMatch(expected?: string, supplied?: string): boolean {
    if (!expected || !supplied) return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(supplied);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  // ══ Status-request reads ══════════════════════════════════════════════

  async findStatusChangeRequests(
    id: string,
    organizationId: string,
  ): Promise<VendorStatusChangeRequestResponseDto[]> {
    const vendor = await this.findVendorOrThrow(id, organizationId);
    const rows = await this.statusRequestRepo.find({
      where: { vendorId: id, organizationId },
      order: { requestedAt: 'DESC' },
    });
    return rows.map(r => this.toStatusRequestResponse(r, vendor));
  }

  // Approver inbox: every pending request across the organization.
  async findPendingStatusChangeRequests(
    organizationId: string,
  ): Promise<VendorStatusChangeRequestResponseDto[]> {
    const rows = await this.statusRequestRepo.find({
      where: { organizationId, status: StatusChangeRequestStatus.PENDING },
      relations: ['vendor'],
      order: { requestedAt: 'ASC' },
    });
    return rows.map(r => this.toStatusRequestResponse(r, r.vendor));
  }

  // Marks requests whose approval window has elapsed and releases the vendors.
  // Safe to call from a scheduled job; no-op when nothing has expired.
  async expireStaleStatusChangeRequests(): Promise<number> {
    const stale = await this.statusRequestRepo.find({
      where: {
        status: StatusChangeRequestStatus.PENDING,
        tokenExpiresAt: LessThan(new Date()),
      },
    });
    if (!stale.length) return 0;

    await this.dataSource.transaction(async manager => {
      await manager.update(
        VendorStatusChangeRequest,
        { id: In(stale.map(r => r.id)) },
        { status: StatusChangeRequestStatus.EXPIRED, approvalToken: null },
      );
      await manager.update(
        Vendor,
        { pendingStatusChangeRequestId: In(stale.map(r => r.id)) },
        { pendingStatusChange: null, pendingStatusChangeRequestId: null },
      );
    });

    this.logger.log(`Expired ${stale.length} stale vendor status change request(s)`);
    return stale.length;
  }

  // approvalToken is deliberately never mapped into the response.
  private toStatusRequestResponse(
    r: VendorStatusChangeRequest,
    vendor?: Vendor,
  ): VendorStatusChangeRequestResponseDto {
    return {
      id:                r.id,
      vendorId:          r.vendorId,
      vendorCode:        vendor?.code,
      vendorName:        vendor?.vendorName,
      requestType:       r.requestType,
      status:            r.status,
      reason:            r.reason,
      requestedBy:       r.requestedBy,
      requestedAt:       r.requestedAt,
      notifiedApprovers: r.notifiedApprovers,
      approverUserId:    r.approverUserId,
      tokenExpiresAt:    r.tokenExpiresAt,
      decidedBy:         r.decidedBy,
      decidedAt:         r.decidedAt,
      decisionComments:  r.decisionComments,
      createdAt:         r.createdAt,
    };
  }

  // ══ Soft delete ═══════════════════════════════════════════════════════

  // Deletion is stricter than for ordinary master data. A vendor referenced by
  // any transactional record is never removed — those documents must stay
  // resolvable for audit, tax, and contractual reasons. Disable or blacklist
  // it instead.
  async remove(id: string, organizationId: string, userEmail: string): Promise<void> {
    const vendor = await this.findVendorOrThrow(id, organizationId);

    this.assertNoPendingStatusChange(vendor, 'delete');

    const dependencies = await this.usageValidation.describeDependencies(id);
    if (dependencies.length) {
      throw new ConflictException(
        `Vendor cannot be deleted because it is referenced by existing ${dependencies.join(', ')} record(s). ` +
        'Disable or blacklist the vendor instead.',
      );
    }

    // Child vendors would be orphaned by the delete.
    const childCount = await this.vendorRepo.count({
      where: { parentCompanyId: id, organizationId, isDeleted: false },
    });
    if (childCount > 0) {
      throw new ConflictException(
        `Vendor cannot be deleted because ${childCount} subsidiary vendor(s) reference it as parent company`,
      );
    }

    const now = new Date();
    await this.dataSource.transaction(async manager => {
      vendor.isDeleted    = true;
      vendor.deletedAt    = now;
      vendor.deletedBy    = userEmail;
      vendor.isActive     = false;
      vendor.vendorStatus = VendorStatus.INACTIVE;
      vendor.updatedBy    = userEmail;
      await manager.save(Vendor, vendor);

      // Cascade the soft delete to owned child records. Append-only history
      // (evaluations, performance) is deliberately left untouched.
      const softDeletePatch = { isDeleted: true, deletedAt: now, deletedBy: userEmail };
      const scope = { vendorId: id, organizationId, isDeleted: false };
      await Promise.all([
        manager.update(VendorContact,       scope, softDeletePatch),
        manager.update(VendorAddress,       scope, softDeletePatch),
        manager.update(VendorBankAccount,   scope, softDeletePatch),
        manager.update(VendorCertification, scope, softDeletePatch),
        manager.update(VendorDocument,      scope, softDeletePatch),
        manager.update(VendorMaterial,      scope, softDeletePatch),
        manager.update(VendorTurnover,      scope, softDeletePatch),
      ]);
    });

    this.logger.log(`Vendor ${vendor.code} soft-deleted by ${userEmail}`);
  }

  // ══ Document upload ═══════════════════════════════════════════════════

  // Mirrors MaterialService.uploadMaterialSpecificationDocument: the binary
  // goes to cloud storage and only the URL is retained in the domain.
  async uploadVendorDocument(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ message: string; url: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.cloudStorageService.isFileValid(file);

    const folder = `pm/vendor/${user.id}`;
    const url = await this.cloudStorageService.uploadFile(file, folder);

    return { message: 'Vendor document uploaded successfully', url };
  }
}
