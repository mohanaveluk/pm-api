import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import * as ExcelJS from 'exceljs';

import { Vendor } from './entities/vendor.entity';
import { VendorType } from '../vendor-type/entity/vendor-type.entity';
import { MaterialCategory } from '../material-category/entities/material-category.entity';
import { IndustryCategory } from '../industry-category/entities/industry-category.entity';
import { VendorStatus } from './enums/vendor-status.enum';
import { VendorCodeService } from './vendor-code.service';
import {
  MasterCodeService,
  MasterSequenceKey,
} from 'src/common/services/master-code.service';
import { CustomLoggerService } from '../logger/custom-logger.service';

export const VENDOR_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;
const MAX_REPORTED_ERRORS = 100;

// Used whenever a row's Vendor Type column is blank. Deliberately a single,
// deterministic choice — see the header comment on resolveVendorType().
const DEFAULT_VENDOR_TYPE_NAME = 'Supplier';

// Source columns, keyed by their normalised header (lower-case, letters/digits only).
// Several spellings are accepted so a sheet exported from another system still maps.
const HEADER_ALIASES: Record<string, keyof RawImportRow> = {
  code: 'code',
  vendorcode: 'code',
  vendorname: 'vendorName',
  name: 'vendorName',
  vendortype: 'vendorType',
  type: 'vendorType',
  materialcategory: 'materialCategory',
  category: 'materialCategory',
  contactdetails: 'contactDetails',
  contact: 'contactDetails',
  contactperson: 'contactDetails',
};

interface RawImportRow {
  row: number;
  code: string;
  vendorName: string;
  vendorType: string;
  materialCategory: string;
  contactDetails: string;
}

export interface VendorImportRowError { row: number; message: string }

export interface VendorImportResult {
  total: number;
  created: number;
  updated: number;
  vendorTypesCreated: string[];
  items: { row: number; name: string; code: string; action: 'created' | 'updated' }[];
}

const norm = (v: string) => v.trim().toLowerCase();

// Reduces one word to a best-effort singular form so "Suppliers"/"Supplier"
// and "Categories"/"Category" compare equal — mirrors MaterialImportService's
// canon(), duplicated deliberately rather than shared, the same way
// VendorCodeService/MaterialCodeService are kept as parallel, independent
// implementations in this codebase.
function singularizeWord(word: string): string {
  if (word.length <= 3) return word;
  if (/ies$/.test(word)) return word.slice(0, -3) + 'y';
  if (/(ses|xes|zes|ches|shes)$/.test(word)) return word.slice(0, -2);
  if (/ss$/.test(word)) return word;
  if (/s$/.test(word)) return word.slice(0, -1);
  return word;
}

// Case- and plural-insensitive comparison key: lower-cased, whitespace-
// collapsed, last word singularized. "Raw Materials" and "raw material" (or
// "Suppliers" / "supplier") both canonicalise to the same key.
function canon(v: string): string {
  const words = norm(v).split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  words[words.length - 1] = singularizeWord(words[words.length - 1]);
  return words.join(' ');
}

interface PlannedRow {
  row: number;
  vendorName: string;
  contactDetails: string;
  materialCategoryId: string;
  vendorTypeName: string;
  vendorTypeId?: string;      // set once resolved/created in the transaction
}

@Injectable()
export class VendorImportService {
  constructor(
    @InjectRepository(Vendor) private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(VendorType) private readonly vendorTypeRepo: Repository<VendorType>,
    @InjectRepository(MaterialCategory) private readonly categoryRepo: Repository<MaterialCategory>,
    @InjectRepository(IndustryCategory) private readonly industryCategoryRepo: Repository<IndustryCategory>,
    private readonly dataSource: DataSource,
    private readonly vendorCodeService: VendorCodeService,
    private readonly masterCodeService: MasterCodeService,
    private readonly logger: CustomLoggerService,
  ) {}

  // Entry point: parse, validate everything, then write in ONE transaction.
  // Any validation problem (reported for all rows at once) or any failure
  // while writing — including a vendor type created along the way — leaves
  // every table exactly as it was.
  async import(
    file: Express.Multer.File,
    organizationId: string,
    userEmail: string,
  ): Promise<VendorImportResult> {
    if (!file?.buffer?.length) throw new BadRequestException('No file provided, or the file is empty');
    if (file.size > VENDOR_IMPORT_MAX_BYTES) {
      throw new BadRequestException('File too large. The maximum size is 5 MB.');
    }

    const raw = await this.parse(file);
    if (!raw.length) throw new BadRequestException('The file contains no vendor rows');
    if (raw.length > MAX_ROWS) {
      throw new BadRequestException(`The file has ${raw.length} rows; the maximum per import is ${MAX_ROWS}`);
    }

    const { plan, newVendorTypeNames } = await this.validate(raw, organizationId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // Types missing from the org are created once each, inside this same
      // transaction, so a later failure rolls them back along with everything else.
      const createdTypeIds = new Map<string, string>(); // canon(name) -> id
      const vendorTypesCreated: string[] = [];
      for (const name of newVendorTypeNames) {
        const code = await this.masterCodeService.generateCode(
          queryRunner, organizationId, MasterSequenceKey.VENDOR_TYPE,
        );
        const vt = queryRunner.manager.create(VendorType, {
          id: uuidv4(),
          dguid: uuidv4(),
          organizationId,
          code,
          name,
          isActive: true,
          displayOrder: 0,
          createdBy: userEmail,
          updatedBy: userEmail,
        });
        await queryRunner.manager.save(VendorType, vt);
        createdTypeIds.set(canon(name), vt.id);
        vendorTypesCreated.push(name);
      }
      for (const p of plan) {
        if (!p.vendorTypeId) p.vendorTypeId = createdTypeIds.get(canon(p.vendorTypeName));
        if (!p.vendorTypeId) {
          // Defensive only — validate() guarantees every row resolves or is queued above.
          throw new Error(`Unable to resolve Vendor Type "${p.vendorTypeName}" for row ${p.row}`);
        }
      }

      // The default Industry Category (lowest displayOrder) mirrors the
      // create-vendor form's own fallback — the column isn't part of this
      // import's field list, but the DB happily accepts null if none exists.
      const defaultIndustryCategoryId = await this.defaultIndustryCategoryId(queryRunner, organizationId);

      // Existing vendors, re-read now that every row's vendorTypeId is known,
      // so the vendorName + vendorType + materialCategory match is exact.
      const existingVendors = await queryRunner.manager.find(Vendor, {
        where: { organizationId, isDeleted: false },
      });

      const result: VendorImportResult = {
        total: plan.length, created: 0, updated: 0, vendorTypesCreated, items: [],
      };

      for (const p of plan) {
        const existing = existingVendors.find(v =>
          canon(v.vendorName) === canon(p.vendorName) &&
          v.vendorTypeId === p.vendorTypeId &&
          (v.productCategories ?? [])[0] === p.materialCategoryId,
        );

        if (existing) {
          existing.vendorTypeId = p.vendorTypeId!;
          existing.productCategories = [p.materialCategoryId];
          if (p.contactDetails) existing.primaryContactPerson = p.contactDetails;
          existing.updatedBy = userEmail;
          await queryRunner.manager.save(Vendor, existing);
          result.updated++;
          result.items.push({ row: p.row, name: p.vendorName, code: existing.code, action: 'updated' });
        } else {
          const prefix = this.vendorCodeService.deriveCategoryPrefix(p.vendorTypeName);
          const code = await this.vendorCodeService.generateCode(queryRunner, organizationId, prefix);
          const vendor = queryRunner.manager.create(Vendor, {
            id: uuidv4(),
            dguid: uuidv4(),
            organizationId,
            code,
            vendorName: p.vendorName,
            vendorTypeId: p.vendorTypeId,
            industryCategoryId: defaultIndustryCategoryId,
            productCategories: [p.materialCategoryId],
            primaryContactPerson: p.contactDetails || undefined,
            vendorStatus: VendorStatus.UNDER_EVALUATION,
            isActive: false,
            createdBy: userEmail,
            updatedBy: userEmail,
          } as Partial<Vendor>);
          await queryRunner.manager.save(Vendor, vendor);
          result.created++;
          result.items.push({ row: p.row, name: p.vendorName, code, action: 'created' });
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log(
        `Vendor import by ${userEmail}: ${result.created} created, ${result.updated} updated, ` +
        `${vendorTypesCreated.length} vendor type(s) created`,
      );
      return result;
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Vendor import rolled back for organization ${organizationId} by ${userEmail}: ${err?.message}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw new InternalServerErrorException(
        `Import failed and every change was rolled back. ${err?.message ?? ''}`.trim(),
      );
    } finally {
      await queryRunner.release();
    }
  }

  private async defaultIndustryCategoryId(queryRunner: QueryRunner, organizationId: string): Promise<string | null> {
    const category = await queryRunner.manager.findOne(IndustryCategory, {
      where: { organizationId, isActive: true, isDeleted: false },
      order: { displayOrder: 'ASC' },
    });
    return category?.id ?? null;
  }

  // ── Validation & id resolution ───────────────────────────────────────

  private async validate(raw: RawImportRow[], organizationId: string) {
    const [vendorTypes, categories, existing] = await Promise.all([
      this.vendorTypeRepo.find({ where: { organizationId, isDeleted: false } }),
      this.categoryRepo.find({ where: { organizationId, isDeleted: false } }),
      this.vendorRepo.find({ where: { organizationId, isDeleted: false } }),
    ]);

    const vendorTypeByName = new Map<string, VendorType>();
    for (const t of vendorTypes) {
      const key = canon(t.name);
      if (key && !vendorTypeByName.has(key)) vendorTypeByName.set(key, t);
    }
    const categoryByName = new Map<string, MaterialCategory>();
    for (const c of categories) {
      const key = canon(c.name);
      if (key && !categoryByName.has(key)) categoryByName.set(key, c);
    }

    const errors: VendorImportRowError[] = [];
    const seenKeys = new Map<string, number>();
    const newVendorTypeNames = new Map<string, string>(); // canon -> original-cased name to create
    const plan: PlannedRow[] = [];

    for (const r of raw) {
      const rowErrors: string[] = [];
      if (!r.vendorName) rowErrors.push('Vendor Name is required');
      else if (r.vendorName.length > 255) rowErrors.push('Vendor Name exceeds 255 characters');
      if (!r.materialCategory) rowErrors.push('Material Category is required');

      const category = r.materialCategory ? categoryByName.get(canon(r.materialCategory)) : undefined;
      if (r.materialCategory && !category) rowErrors.push(`Material Category "${r.materialCategory}" not found`);
      else if (category && !category.isActive) rowErrors.push(`Material Category "${r.materialCategory}" is inactive`);

      // Blank Vendor Type falls back to the configured default; both paths
      // are matched case-/plural-insensitively against existing types, and a
      // genuine miss is queued for creation rather than treated as an error.
      const typeNameRaw = r.vendorType || DEFAULT_VENDOR_TYPE_NAME;
      const existingType = vendorTypeByName.get(canon(typeNameRaw));
      if (existingType && !existingType.isActive) {
        rowErrors.push(`Vendor Type "${typeNameRaw}" is inactive`);
      }
      if (!existingType) {
        const key = canon(typeNameRaw);
        if (!newVendorTypeNames.has(key)) newVendorTypeNames.set(key, typeNameRaw);
      }

      if (rowErrors.length) {
        errors.push({ row: r.row, message: rowErrors.join('; ') });
        continue;
      }

      const identityKey = `${canon(r.vendorName)}|${canon(typeNameRaw)}|${category!.id}`;
      const firstRow = seenKeys.get(identityKey);
      if (firstRow) {
        errors.push({
          row: r.row,
          message: `Duplicate Vendor Name + Vendor Type + Material Category combination in the file (first seen on row ${firstRow})`,
        });
        continue;
      }
      seenKeys.set(identityKey, r.row);

      plan.push({
        row: r.row,
        vendorName: r.vendorName,
        contactDetails: r.contactDetails,
        materialCategoryId: category!.id,
        vendorTypeName: typeNameRaw,
        vendorTypeId: existingType?.id,
      });
    }

    if (errors.length) {
      throw new UnprocessableEntityException({
        message: `${errors.length} row(s) failed validation. Nothing was imported.`,
        errors: errors.slice(0, MAX_REPORTED_ERRORS),
        totalErrors: errors.length,
      });
    }
    return { plan, newVendorTypeNames: [...newVendorTypeNames.values()] };
  }

  // ── File readers ─────────────────────────────────────────────────────

  private async parse(file: Express.Multer.File): Promise<RawImportRow[]> {
    const name = (file.originalname ?? '').toLowerCase();
    try {
      if (name.endsWith('.xlsx')) return await this.readXlsx(file.buffer);
      if (name.endsWith('.csv')) return await this.readCsv(file.buffer);
      if (name.endsWith('.json')) return this.readJson(file.buffer);
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Unable to read the file: ${err?.message ?? 'unsupported or corrupt file'}`);
    }
    throw new BadRequestException('Unsupported file type. Use .xlsx, .csv or .json');
  }

  private async readXlsx(buffer: Buffer): Promise<RawImportRow[]> {
    const workbook = new ExcelJS.Workbook();
    // The buffer is streamed in and released once loaded; nothing stays open.
    const stream = Readable.from(buffer);
    try {
      await workbook.xlsx.read(stream);
    } finally {
      stream.destroy();
    }
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('The workbook has no sheets');
    return this.fromSheet(sheet);
  }

  private async readCsv(buffer: Buffer): Promise<RawImportRow[]> {
    const workbook = new ExcelJS.Workbook();
    const stream = Readable.from(buffer);
    try {
      await workbook.csv.read(stream);
    } finally {
      stream.destroy();
    }
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('The CSV file is empty');
    return this.fromSheet(sheet);
  }

  private readJson(buffer: Buffer): RawImportRow[] {
    let data: any;
    try {
      data = JSON.parse(buffer.toString('utf8').replace(/^﻿/, ''));
    } catch {
      throw new BadRequestException('The JSON file is not valid JSON');
    }
    const list = Array.isArray(data) ? data : (data?.vendors ?? data?.items ?? data?.data);
    if (!Array.isArray(list)) {
      throw new BadRequestException('JSON must be an array of vendors (or { "vendors": [...] })');
    }
    return list.map((item, i) => {
      const row = this.emptyRow(i + 1);
      for (const [k, v] of Object.entries(item ?? {})) {
        const field = HEADER_ALIASES[k.toLowerCase().replace(/[^a-z0-9]/g, '')];
        if (field && field !== 'row') (row as any)[field] = this.cellText(v);
      }
      return row;
    });
  }

  private fromSheet(sheet: ExcelJS.Worksheet): RawImportRow[] {
    const columnField = new Map<number, keyof RawImportRow>();
    let headerRow = 0;

    // The header is the first non-empty row that names at least one known column.
    sheet.eachRow((row, rowNumber) => {
      if (headerRow) return;
      const found = new Map<number, keyof RawImportRow>();
      row.eachCell((cell, col) => {
        const field = HEADER_ALIASES[this.cellText(cell.value).toLowerCase().replace(/[^a-z0-9]/g, '')];
        if (field) found.set(col, field);
      });
      if (found.size) {
        headerRow = rowNumber;
        found.forEach((f, c) => columnField.set(c, f));
      }
    });

    const fields = new Set(columnField.values());
    const missing = ['vendorName', 'materialCategory']
      .filter(f => !fields.has(f as keyof RawImportRow));
    if (!headerRow || missing.length) {
      throw new BadRequestException(
        'Header row not recognised. Expected columns: Vendor Code, Vendor Name, Vendor Type, ' +
        'Material Category, Contact details.',
      );
    }

    const rows: RawImportRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRow) return;
      const r = this.emptyRow(rowNumber);
      columnField.forEach((field, col) => {
        (r as any)[field] = this.cellText(row.getCell(col).value);
      });
      // Fully blank rows (trailing formatting) are skipped, not errors.
      if (r.code || r.vendorName || r.vendorType || r.materialCategory || r.contactDetails) rows.push(r);
    });
    return rows;
  }

  private emptyRow(row: number): RawImportRow {
    return { row, code: '', vendorName: '', vendorType: '', materialCategory: '', contactDetails: '' };
  }

  // Flattens every cell shape ExcelJS can return (plain, rich text, hyperlink,
  // formula result, date, number) to trimmed text.
  private cellText(v: unknown): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (v instanceof Date) return v.toISOString();
    const o = v as any;
    if (Array.isArray(o.richText)) return o.richText.map((t: any) => t.text).join('').trim();
    if (o.result !== undefined) return this.cellText(o.result);
    if (o.text !== undefined) return this.cellText(o.text);
    return String(v).trim();
  }
}
