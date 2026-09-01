import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsNumber, IsOptional, IsString, Length, Max, Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

import { EvaluationStage }      from '../enums/evaluation-stage.enum';
import { EvaluationDecision }   from '../enums/evaluation-decision.enum';
import { RiskCategory }         from '../enums/risk-category.enum';
import { VendorClassification } from '../enums/vendor-classification.enum';

const trim = ({ value }) => (typeof value === 'string' ? value.trim() : value);

// ── Input ──────────────────────────────────────────────────────────────────

/**
 * Appends one row to the append-only vendor_evaluations trail
 * (vendor-evaluation.entity.ts) — this is the write side of the read-only
 * GET /vendors/:id/evaluations endpoint, which the entity's own comment
 * flags as "the integration point for a future workflow engine". This DTO is
 * that integration: no new entity, no new vendor status — APPROVED/REJECTED/
 * RETURNED/ON_HOLD were already modelled and simply had nothing writing to
 * them yet.
 */
export class AddVendorEvaluationDto {
  @ApiProperty({
    enum: EvaluationStage,
    example: EvaluationStage.TECHNICAL,
    description: 'Which part of the qualification chain this decision belongs to',
  })
  @IsEnum(EvaluationStage)
  stage: EvaluationStage;

  @ApiProperty({
    enum: EvaluationDecision,
    example: EvaluationDecision.APPROVED,
    description:
      'APPROVED on any stage rolls the score/classification up onto the vendor; APPROVED ' +
      'additionally activates the vendor the same way PATCH /vendors/:id/enable does. ' +
      'REJECTED and RETURNED require `comments` and leave the vendor at its current status ' +
      '— the decision itself is the record of what happened, not a new vendorStatus value.',
  })
  @IsEnum(EvaluationDecision)
  decision: EvaluationDecision;

  @ApiPropertyOptional({ example: 82.5, description: 'This stage\'s score, 0–100' })
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100)
  score?: number;

  @ApiPropertyOptional({ example: 'AVL-2026-0031' })
  @IsOptional() @IsString() @Length(1, 100) @Transform(trim)
  referenceNumber?: string;

  @ApiPropertyOptional({
    example: 'Please provide the latest ISO 9001 certificate.',
    description: 'Required when decision is REJECTED or RETURNED — see the service-level check.',
  })
  @IsOptional() @IsString() @Transform(trim)
  comments?: string;

  @ApiPropertyOptional({
    enum: RiskCategory,
    description: 'Rolls up onto the vendor\'s current riskCategory when supplied',
  })
  @IsOptional() @IsEnum(RiskCategory)
  riskCategory?: RiskCategory;

  @ApiPropertyOptional({
    enum: VendorClassification,
    description: 'Rolls up onto the vendor\'s current vendorClassification (AVL standing) when supplied',
  })
  @IsOptional() @IsEnum(VendorClassification)
  vendorClassification?: VendorClassification;
}
