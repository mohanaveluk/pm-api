import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import {
  APPROVAL_DECISIONS, REVIEW_DECISIONS, RequisitionDecision,
} from '../enums/material-requisition.enums';

// Comments are required for every decision except a plain review / approval;
// the service enforces that (and also requires them from a reviewer who edited
// the requisition), so the message can name the decision.

export class ReviewRequisitionDto {
  @ApiProperty({ enum: REVIEW_DECISIONS, example: RequisitionDecision.REVIEWED })
  @IsIn(REVIEW_DECISIONS as RequisitionDecision[])
  decision: RequisitionDecision;

  @ApiPropertyOptional({
    example: 'Quantities checked against the MTO; ROS moved to match the construction schedule.',
    description: 'Required for Returned, Rejected and Cancelled, and when the reviewer edited the requisition.',
  })
  @IsOptional() @IsString() @MaxLength(4000)
  comments?: string;
}

export class ApproveRequisitionDto {
  @ApiProperty({ enum: APPROVAL_DECISIONS, example: RequisitionDecision.APPROVED })
  @IsIn(APPROVAL_DECISIONS as RequisitionDecision[])
  decision: RequisitionDecision;

  @ApiPropertyOptional({
    example: 'Approved within the CAPEX budget for this work package.',
    description: 'Required for Returned, Rejected and Cancelled.',
  })
  @IsOptional() @IsString() @MaxLength(4000)
  comments?: string;
}

/**
 * PUT /material-requisitions/:id/participants. Each list, when given, is the
 * complete set in order. Reviewers change until the requisition is reviewed,
 * approvers until it is approved.
 */
export class UpdateRequisitionParticipantsDto {
  @ApiPropertyOptional({ type: [String], description: 'Internal users who review it, in order' })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ArrayUnique() @IsUUID('all', { each: true })
  reviewerIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Internal users who approve it, in order' })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ArrayUnique() @IsUUID('all', { each: true })
  approverIds?: string[];
}
