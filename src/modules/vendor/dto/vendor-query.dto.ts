import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min,
} from 'class-validator';

import { VendorType }           from '../enums/vendor-type.enum';
import { VendorStatus }         from '../enums/vendor-status.enum';
import { VendorClassification } from '../enums/vendor-classification.enum';
import { RiskCategory }         from '../enums/risk-category.enum';
import { PendingStatusChange }  from '../enums/pending-status-change.enum';

const trim = ({ value }) => (typeof value === 'string' ? value.trim() : value);

export class VendorQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'vendorName',
    enum: ['code', 'vendorName', 'tradeName', 'vendorStatus', 'vendorType', 'vendorClassification', 'createdAt', 'updatedAt'],
  })
  @IsOptional() @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], example: 'DESC' })
  @IsOptional() @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    example: 'engineering',
    description:
      'Case-insensitive search across code, vendorName, tradeName, email, ' +
      'businessRegistrationNumber, and taxRegistrationNumber',
  })
  @IsOptional() @IsString() @Transform(trim)
  search?: string;

  // ── Targeted filters ──────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'CIV000001' })
  @IsOptional() @IsString() @Transform(trim)
  code?: string;

  @ApiPropertyOptional({ example: 'ABC Engineering' })
  @IsOptional() @IsString() @Transform(trim)
  vendorName?: string;

  @ApiPropertyOptional({ example: 'contact@vendor.example' })
  @IsOptional() @IsString() @Transform(trim)
  email?: string;

  @ApiPropertyOptional({ example: 'CN-1234567' })
  @IsOptional() @IsString() @Transform(trim)
  businessRegistrationNumber?: string;

  @ApiPropertyOptional({ example: '100123456700003' })
  @IsOptional() @IsString() @Transform(trim)
  taxRegistrationNumber?: string;

  @ApiPropertyOptional({ example: 'uuid-of-industry-category' })
  @IsOptional() @IsUUID()
  industryCategoryId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-parent-vendor' })
  @IsOptional() @IsUUID()
  parentCompanyId?: string;

  @ApiPropertyOptional({ enum: VendorType })
  @IsOptional() @IsEnum(VendorType)
  vendorType?: VendorType;

  @ApiPropertyOptional({ enum: VendorStatus, description: 'Business status' })
  @IsOptional() @IsEnum(VendorStatus)
  vendorStatus?: VendorStatus;

  @ApiPropertyOptional({ enum: VendorClassification, description: 'AVL standing' })
  @IsOptional() @IsEnum(VendorClassification)
  vendorClassification?: VendorClassification;

  @ApiPropertyOptional({ enum: RiskCategory })
  @IsOptional() @IsEnum(RiskCategory)
  riskCategory?: RiskCategory;

  @ApiPropertyOptional({
    enum: PendingStatusChange,
    description: "Find vendors whose blacklist/un-blacklist request is awaiting approval",
  })
  @IsOptional() @IsEnum(PendingStatusChange)
  pendingStatusChange?: PendingStatusChange;

  @ApiPropertyOptional({ example: 'AE', description: 'ISO 3166-1 alpha-2' })
  @IsOptional() @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  countryOfRegistration?: string;

  @ApiPropertyOptional({ example: true, description: 'Technical availability flag, not business status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: false,
    description:
      'Include BLACKLISTED vendors in the result. Defaults to false so blacklisted ' +
      'vendors never leak into ordinary selection lists.',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeBlacklisted?: boolean = false;
}
