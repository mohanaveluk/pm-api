import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import * as ExcelJS from 'exceljs';

import { Material } from './entities/material.entity';
import { MaterialCategory } from '../material-category/entities/material-category.entity';
import { MaterialGroup } from '../material-group/entities/material-group.entity';
import { UnitOfMeasurement } from '../unit-of-measurement/entities/unit-of-measurement.entity';
import { MaterialStatus } from './enums/material-status.enum';
import { MaterialCodeService } from './material-code.service';

export const MATERIAL_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;
const MAX_REPORTED_ERRORS = 100;

// Source columns, keyed by their normalised header (lower-case, letters/digits only).
// Several spellings are accepted so a sheet exported from another system still maps.
const HEADER_ALIASES: Record<string, keyof RawImportRow> = {
  code: 'code',
  materialcode: 'code',
  shortdescription: 'shortDescription',
  materialname: 'shortDescription',
  name: 'shortDescription',
  longdescription: 'longDescription',
  description: 'longDescription',
  uom: 'uom',
  unitofmeasurement: 'uom',
  unitofmeasure: 'uom',
  materialcategory: 'category',
  category: 'category',
  materialgroup: 'group',
  group: 'group',
};

interface RawImportRow {
  row: number;
  code: string;
  shortDescription: string;
  longDescription: string;
  uom: string;
  category: string;
  group: string;
}

export interface MaterialImportRowError { row: number; message: string }

export interface MaterialImportResult {
  total: number;
  created: number;
  updated: number;
  items: { row: number; name: string; code: string; action: 'created' | 'updated' }[];
}

const norm = (v: string) => v.trim().toLowerCase();

// Reduces one word to a best-effort singular form so "Categories"/"Category",
// "Boxes"/"Box" and "Numbers"/"Number" compare equal. Deliberately simple
// (English suffix rules only) — good enough for master-data names, which
// are short, plain nouns, not a general stemmer.
function singularizeWord(word: string): string {
  if (word.length <= 3) return word;
  if (/ies$/.test(word)) return word.slice(0, -3) + 'y';
  if (/(ses|xes|zes|ches|shes)$/.test(word)) return word.slice(0, -2);
  if (/ss$/.test(word)) return word;
  if (/s$/.test(word)) return word.slice(0, -1);
  return word;
}

// Case- and plural-insensitive comparison key for Material Category, Material
// Group and UOM names: lower-cased, whitespace-collapsed, and its LAST word
// singularized — "Raw Materials" and "raw material" both canonicalise to the
// same key regardless of which side (the import file or our master data) is
// plural. Only the last word is singularized, matching how these names are
// actually pluralized ("Material Categories", not "Materials Category").
function canon(v: string): string {
  const words = norm(v).split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  words[words.length - 1] = singularizeWord(words[words.length - 1]);
  return words.join(' ');
}

@Injectable()
export class MaterialImportService {
  private readonly logger = new Logger(MaterialImportService.name);

  constructor(
    @InjectRepository(Material) private readonly materialRepo: Repository<Material>,
    @InjectRepository(MaterialCategory) private readonly categoryRepo: Repository<MaterialCategory>,
    @InjectRepository(MaterialGroup) private readonly groupRepo: Repository<MaterialGroup>,
    @InjectRepository(UnitOfMeasurement) private readonly uomRepo: Repository<UnitOfMeasurement>,
    private readonly dataSource: DataSource,
    private readonly codeService: MaterialCodeService,
  ) {}

  // Entry point: parse, validate everything, then write in ONE transaction.
  // Any validation problem (reported for all rows at once) or any failure while
  // writing leaves the tables exactly as they were.
  async import(
    file: Express.Multer.File,
    organizationId: string,
    userEmail: string,
  ): Promise<MaterialImportResult> {
    if (!file?.buffer?.length) throw new BadRequestException('No file provided, or the file is empty');
    if (file.size > MATERIAL_IMPORT_MAX_BYTES) {
      throw new BadRequestException('File too large. The maximum size is 5 MB.');
    }

    const raw = await this.parse(file);
    if (!raw.length) throw new BadRequestException('The file contains no material rows');
    if (raw.length > MAX_ROWS) {
      throw new BadRequestException(`The file has ${raw.length} rows; the maximum per import is ${MAX_ROWS}`);
    }

    const plan = await this.validate(raw, organizationId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const result: MaterialImportResult = { total: plan.length, created: 0, updated: 0, items: [] };

      for (const p of plan) {
        if (p.existing) {
          const m = p.existing;
          m.materialCategoryId = p.categoryId;
          m.materialGroupId = p.groupId;
          m.unitOfMeasurementId = p.uomId;
          // A purchase-order-locked material keeps the description the supplier priced.
          if (!m.isPurchaseOrderIssued) m.longDescription = p.longDescription || null;
          m.updatedBy = userEmail;
          await queryRunner.manager.save(Material, m);
          result.updated++;
          result.items.push({ row: p.row, name: p.name, code: m.code, action: 'updated' });
        } else {
          const prefix = this.codeService.deriveCategoryPrefix(p.categoryName);
          const code = await this.codeService.generateCode(queryRunner, organizationId, prefix);
          const material = queryRunner.manager.create(Material, {
            id: uuidv4(),
            dguid: uuidv4(),
            organizationId,
            code,
            materialCategoryId: p.categoryId,
            materialGroupId: p.groupId,
            unitOfMeasurementId: p.uomId,
            shortDescription: p.name,
            longDescription: p.longDescription || null,
            status: MaterialStatus.ACTIVE,
            createdBy: userEmail,
            updatedBy: userEmail,
          } as Partial<Material>);
          await queryRunner.manager.save(Material, material);
          result.created++;
          result.items.push({ row: p.row, name: p.name, code, action: 'created' });
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log(
        `Material import by ${userEmail}: ${result.created} created, ${result.updated} updated`,
      );
      return result;
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Material import rolled back: ${err?.message}`);
      throw new InternalServerErrorException(
        `Import failed and every change was rolled back. ${err?.message ?? ''}`.trim(),
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ── Validation & id resolution ───────────────────────────────────────

  private async validate(raw: RawImportRow[], organizationId: string) {
    const [categories, groups, uoms, existing] = await Promise.all([
      this.categoryRepo.find({ where: { organizationId, isDeleted: false } }),
      this.groupRepo.find({ where: { organizationId, isDeleted: false } }),
      this.uomRepo.find({ where: { organizationId, isDeleted: false } }),
      this.materialRepo.find({ where: { organizationId, isDeleted: false } }),
    ]);

    // First match wins if two names canonicalise to the same key (e.g. two
    // categories differing only by singular/plural) — an unlikely enough
    // clash in real master data that failing loudly here isn't worth it.
    const categoryByName = new Map<string, MaterialCategory>();
    for (const c of categories) {
      const key = canon(c.name);
      if (key && !categoryByName.has(key)) categoryByName.set(key, c);
    }
    const uomByKey = new Map<string, UnitOfMeasurement>();
    for (const u of uoms) {
      for (const key of [u.code, u.name, u.symbol, u.shortName]) {
        if (!key) continue;
        const k = canon(key);
        if (k && !uomByKey.has(k)) uomByKey.set(k, u);
      }
    }
    const existingByName = new Map(existing.map(m => [norm(m.shortDescription), m]));

    const errors: MaterialImportRowError[] = [];
    const seenNames = new Map<string, number>();
    const plan: Array<{
      row: number; name: string; longDescription: string;
      categoryId: string; categoryName: string; groupId: string; uomId: string;
      existing?: Material;
    }> = [];

    for (const r of raw) {
      const rowErrors: string[] = [];
      if (!r.shortDescription) rowErrors.push('Short Description is required');
      else if (r.shortDescription.length > 500) rowErrors.push('Short Description exceeds 500 characters');
      if (!r.uom) rowErrors.push('UOM is required');
      if (!r.category) rowErrors.push('Material Category is required');
      if (!r.group) rowErrors.push('Material Group is required');

      const key = norm(r.shortDescription);
      if (key) {
        const first = seenNames.get(key);
        if (first) rowErrors.push(`Duplicate material name in the file (first seen on row ${first})`);
        else seenNames.set(key, r.row);
      }

      const category = r.category ? categoryByName.get(canon(r.category)) : undefined;
      if (r.category && !category) rowErrors.push(`Material Category "${r.category}" not found`);
      else if (category && !category.isActive) rowErrors.push(`Material Category "${r.category}" is inactive`);

      // A group belongs to one category, so it is looked up within the resolved category.
      const group = category && r.group
        ? groups.find(g => g.materialCategoryId === category.id && canon(g.name) === canon(r.group))
        : undefined;
      if (category && r.group && !group) {
        rowErrors.push(`Material Group "${r.group}" not found in category "${category.name}"`);
      } else if (group && !group.isActive) rowErrors.push(`Material Group "${r.group}" is inactive`);

      const uom = r.uom ? uomByKey.get(canon(r.uom)) : undefined;
      if (r.uom && !uom) rowErrors.push(`UOM "${r.uom}" not found`);
      else if (uom && !uom.isActive) rowErrors.push(`UOM "${r.uom}" is inactive`);

      if (rowErrors.length) {
        errors.push({ row: r.row, message: rowErrors.join('; ') });
        continue;
      }
      plan.push({
        row: r.row,
        name: r.shortDescription,
        longDescription: r.longDescription,
        categoryId: category!.id,
        categoryName: category!.name,
        groupId: group!.id,
        uomId: uom!.id,
        existing: existingByName.get(key),
      });
    }

    if (errors.length) {
      throw new UnprocessableEntityException({
        message: `${errors.length} row(s) failed validation. Nothing was imported.`,
        errors: errors.slice(0, MAX_REPORTED_ERRORS),
        totalErrors: errors.length,
      });
    }
    return plan;
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
    const list = Array.isArray(data) ? data : (data?.materials ?? data?.items ?? data?.data);
    if (!Array.isArray(list)) {
      throw new BadRequestException('JSON must be an array of materials (or { "materials": [...] })');
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
    const missing = ['shortDescription', 'uom', 'category', 'group']
      .filter(f => !fields.has(f as keyof RawImportRow));
    if (!headerRow || missing.length) {
      throw new BadRequestException(
        'Header row not recognised. Expected columns: Code, Short Description, Long Description, ' +
        'UOM, Material Category, Material Group.',
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
      if (r.code || r.shortDescription || r.longDescription || r.uom || r.category || r.group) rows.push(r);
    });
    return rows;
  }

  private emptyRow(row: number): RawImportRow {
    return { row, code: '', shortDescription: '', longDescription: '', uom: '', category: '', group: '' };
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
