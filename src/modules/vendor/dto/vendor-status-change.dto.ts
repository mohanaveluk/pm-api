import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { Transform } from 'class-transformer';

import { StatusChangeRequestType }   from '../enums/status-change-request-type.enum';
import { StatusChangeRequestStatus } from '../enums/status-change-request-status.enum';

const trim = ({ value }) => (typeof value === 'string' ? value.trim() : value);

// ── Raise a request ────────────────────────────────────────────────────────

export class RequestVendorStatusChangeDto {
  @ApiProperty({
    example: 'Repeated quality non-conformances on PO-2025-0912',
    description: 'Mandatory justification. Included verbatim in the approval email and retained in the audit trail.',
  })
  @IsString() @IsNotEmpty() @Length(5, 2000) @Transform(trim)
  reason: string;

  @ApiPropertyOptional({
    example: 'uuid-of-approving-manager',
    description:
      'Route the request to one specific manager. When omitted, every active ' +
      'manager/administrator in the organization is notified.',
  })
  @IsOptional() @IsUUID()
  approverUserId?: string;
}

// ── Record a decision ──────────────────────────────────────────────────────

export class DecideVendorStatusChangeDto {
  @ApiProperty({
    example: 'a3f1c9e2b7d84a6f9c1e5b8d2f7a4c6e9b1d3f5a7c9e2b4d6f8a1c3e5b7d9f2a',
    description: 'Single-use approval token from the notification email. Expires after 7 days.',
  })
  @IsString() @IsNotEmpty() @Length(32, 128) @Transform(trim)
  token: string;

  @ApiPropertyOptional({ example: 'Confirmed with the QA/QC lead; proceeding with the blacklisting.' })
  @IsOptional() @IsString() @Length(1, 2000) @Transform(trim)
  comments?: string;
}

// ── Responses ──────────────────────────────────────────────────────────────

export class VendorStatusChangeRequestResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() vendorId: string;
  @ApiPropertyOptional({ example: 'CIV000001' }) vendorCode?: string;
  @ApiPropertyOptional({ example: 'ABC Engineering LLC' }) vendorName?: string;
  @ApiProperty({ enum: StatusChangeRequestType }) requestType: StatusChangeRequestType;
  @ApiProperty({ enum: StatusChangeRequestStatus }) status: StatusChangeRequestStatus;
  @ApiProperty() reason: string;
  @ApiProperty() requestedBy: string;
  @ApiProperty() requestedAt: Date;
  @ApiPropertyOptional({ type: [String], description: 'Approver addresses the notification was sent to' })
  notifiedApprovers?: string[];
  @ApiPropertyOptional() approverUserId?: string;
  @ApiPropertyOptional() tokenExpiresAt?: Date;
  @ApiPropertyOptional() decidedBy?: string;
  @ApiPropertyOptional() decidedAt?: Date;
  @ApiPropertyOptional() decisionComments?: string;
  @ApiProperty() createdAt: Date;

  // The approval token is never serialised into any response — it exists only
  // in the notification email.
}

export class VendorStatusChangeAcceptedDto {
  @ApiProperty({ description: 'The pending request that was created' })
  request: VendorStatusChangeRequestResponseDto;

  @ApiProperty({
    example: true,
    description: 'False when the approval email could not be delivered — the request still stands.',
  })
  notificationSent: boolean;

  @ApiProperty({
    example: 2,
    description: 'How many approvers were notified',
  })
  approversNotified: number;
}
