import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsISO31661Alpha2,
  IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Length, Matches, Max, Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

import { VendorProjectRole }   from '../enums/vendor-project-role.enum';
import { VendorProjectStatus } from '../enums/vendor-project-status.enum';

const trim = ({ value }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

const PHONE_REGEX = /^\+?[0-9\s\-().]{6,20}$/;
const URL_OPTIONS = { require_protocol: true, require_tld: true, protocols: ['http', 'https'] };

// ── Input ──────────────────────────────────────────────────────────────────

export class VendorProjectExperienceDto {
  @ApiProperty({ example: 'Jubail Refinery Expansion — Package 3' })
  @IsString() @IsNotEmpty() @Length(2, 255) @Transform(trim)
  projectName?: string;

  @ApiPropertyOptional({
    example: 'Saudi Aramco',
    description: 'End client. The distinct set of these replaces the deprecated majorClients[].',
  })
  @IsOptional() @IsString() @Length(1, 255) @Transform(trim)
  clientName?: string;

  @ApiPropertyOptional({ example: 'Refinery revamp packages, 3 x offshore platform modules' })
  @IsOptional() @IsString() @Transform(trim)
  projectExperience?: string;

  @ApiPropertyOptional({ example: 'PO-2023-0451, PO-2024-0912' })
  @IsOptional() @IsString() @Transform(trim)
  pastPoContractReferences?: string;

  @ApiPropertyOptional({ example: 'No prior blacklisting declared' })
  @IsOptional() @IsString() @Transform(trim)
  blacklistingHistory?: string;

  @ApiPropertyOptional({ example: 'Eng. A. Rahman' })
  @IsOptional() @IsString() @Length(1, 255) @Transform(trim)
  clientContactPerson?: string;

  @ApiPropertyOptional({ example: 'projects@client.example' })
  @IsOptional() @IsString() @Length(1, 255) @Transform(trim)
  clientContactEmail?: string;

  @ApiPropertyOptional({ example: '+966 13 340 1234' })
  @IsOptional() @IsString()
  @Matches(PHONE_REGEX, { message: 'clientContactPhone must be a valid international phone number' })
  @Transform(trim)
  clientContactPhone?: string;

  @ApiPropertyOptional({ example: 'Jubail Industrial City' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  projectLocation?: string;

  @ApiPropertyOptional({ example: 'SA', description: 'ISO 3166-1 alpha-2' })
  @IsOptional() @IsISO31661Alpha2() @Transform(upper)
  country?: string;

  // ── Scope & role ──────────────────────────────────────────────────

  @ApiPropertyOptional({ enum: VendorProjectRole, example: VendorProjectRole.SUBCONTRACTOR })
  @IsOptional() @IsEnum(VendorProjectRole)
  projectRole?: VendorProjectRole;

  @ApiPropertyOptional({ example: 'Fabrication and erection of 4,200 MT of piping spools' })
  @IsOptional() @IsString() @Transform(trim)
  scopeOfWork?: string;

  @ApiPropertyOptional({ example: 'Oil & Gas — Downstream' })
  @IsOptional() @IsString() @Length(1, 255) @Transform(trim)
  sector?: string;

  @ApiPropertyOptional({ type: [String], example: ['Automated SAW welding', 'Radiographic testing'] })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true })
  technologiesUsed?: string[];

  // ── Timeline ──────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: '2023-01-15' })
  @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-11-30' })
  @IsOptional() @IsDateString()
  completionDate?: string;

  @ApiPropertyOptional({ enum: VendorProjectStatus, example: VendorProjectStatus.COMPLETED })
  @IsOptional() @IsEnum(VendorProjectStatus)
  projectStatus?: VendorProjectStatus;

  @ApiPropertyOptional({ example: 100, description: 'Percent complete (0–100)' })
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100)
  completionPercentage?: number;

  // ── Commercial ────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 12500000.0, description: 'Stored as DECIMAL(18,4) — never floating point' })
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0)
  contractValue?: number;

  @ApiPropertyOptional({ example: 'USD', description: 'ISO 4217' })
  @IsOptional() @IsString() @Length(3, 10) @Transform(upper)
  currency?: string;

  @ApiPropertyOptional({ example: 'CT-2023-0091', description: 'Replaces part of the deprecated pastPoContractReferences' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  contractReference?: string;

  @ApiPropertyOptional({ example: 'PO-2023-0451' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  purchaseOrderReference?: string;

  // ── Outcome ───────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  completedOnTime?: boolean;

  @ApiPropertyOptional({ example: 4.5, description: 'Client rating 0–100 (or 0–5, per your convention)' })
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100)
  clientPerformanceRating?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the vendor was blacklisted on THIS project — replaces the deprecated blacklistingHistory blob',
  })
  @IsOptional() @IsBoolean()
  wasBlacklisted?: boolean;

  @ApiPropertyOptional({ example: 'Barred for 12 months following repeated NCRs; reinstated 2025-03.' })
  @IsOptional() @IsString() @Transform(trim)
  blacklistingRemarks?: string;

  @ApiPropertyOptional({ example: 'Delivered 3 weeks ahead of schedule with zero LTI' })
  @IsOptional() @IsString() @Transform(trim)
  keyAchievements?: string;

  @ApiPropertyOptional({ example: 'Material shortage in Q2 2023 mitigated by alternate sourcing' })
  @IsOptional() @IsString() @Transform(trim)
  challengesFaced?: string;

  // ── Evidence ──────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'https://storage.example.com/certs/completion-jubail.pdf' })
  @IsOptional() @IsUrl(URL_OPTIONS) @Length(1, 1000) @Transform(trim)
  completionCertificateUrl?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/refs/aramco-letter.pdf' })
  @IsOptional() @IsUrl(URL_OPTIONS) @Length(1, 1000) @Transform(trim)
  referenceLetterUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true })
  supportingDocumentUrls?: string[];

  // ── Display ───────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: 'Flagship reference for downstream work' })
  @IsOptional() @IsString() @Transform(trim)
  remarks?: string;

  // NOTE: isVerified / verifiedBy / verifiedAt are absent by design — a vendor
  // cannot mark its own claims as verified. Use PATCH
  // /vendors/:id/project-experiences/:experienceId/verify.
}

// ── Verification input ─────────────────────────────────────────────────────

export class VerifyProjectExperienceDto {
  @ApiPropertyOptional({ example: 'Confirmed by phone with the client project manager on 2026-03-04.' })
  @IsOptional() @IsString() @Length(1, 2000) @Transform(trim)
  verificationRemarks?: string;
}

// ── Output ─────────────────────────────────────────────────────────────────

export class VendorProjectExperienceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() dguid: string;
  @ApiProperty() vendorId: string;
  @ApiPropertyOptional() projectName: string;
  @ApiPropertyOptional() clientName?: string;
  @ApiPropertyOptional() projectExperience?: string;
  @ApiPropertyOptional() pastPoContractReferences?: string;
  @ApiPropertyOptional() blacklistingHistory?: string;

  @ApiPropertyOptional() clientContactPerson?: string;
  @ApiPropertyOptional() clientContactEmail?: string;
  @ApiPropertyOptional() clientContactPhone?: string;
  @ApiPropertyOptional() projectLocation?: string;
  @ApiPropertyOptional() country?: string;

  @ApiPropertyOptional({ enum: VendorProjectRole }) projectRole?: VendorProjectRole;
  @ApiPropertyOptional() scopeOfWork?: string;
  @ApiPropertyOptional() sector?: string;
  @ApiPropertyOptional({ type: [String] }) technologiesUsed?: string[];

  @ApiPropertyOptional() startDate?: Date;
  @ApiPropertyOptional() completionDate?: Date;
  @ApiPropertyOptional({ enum: VendorProjectStatus }) projectStatus?: VendorProjectStatus;
  @ApiPropertyOptional() completionPercentage?: number;
  @ApiPropertyOptional({ description: 'Derived: whole months between start and completion' })
  durationMonths?: number;

  @ApiPropertyOptional() contractValue?: number;
  @ApiPropertyOptional() currency?: string;
  @ApiPropertyOptional() contractReference?: string;
  @ApiPropertyOptional() purchaseOrderReference?: string;

  @ApiProperty() completedOnTime: boolean;
  @ApiPropertyOptional() clientPerformanceRating?: number;
  @ApiProperty() wasBlacklisted: boolean;
  @ApiPropertyOptional() blacklistingRemarks?: string;
  @ApiPropertyOptional() keyAchievements?: string;
  @ApiPropertyOptional() challengesFaced?: string;

  @ApiPropertyOptional() completionCertificateUrl?: string;
  @ApiPropertyOptional() referenceLetterUrl?: string;
  @ApiPropertyOptional({ type: [String] }) supportingDocumentUrls?: string[];

  @ApiProperty({ description: 'Confirmed by procurement — unverified claims should not carry evaluation weight' })
  isVerified: boolean;
  @ApiPropertyOptional() verifiedBy?: string;
  @ApiPropertyOptional() verifiedAt?: Date;
  @ApiPropertyOptional() verificationRemarks?: string;

  @ApiProperty() displayOrder: number;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() remarks?: string;

  @ApiPropertyOptional() createdBy?: string;
  @ApiPropertyOptional() updatedBy?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
