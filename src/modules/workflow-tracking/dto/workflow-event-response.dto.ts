import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowAction, WorkflowEntityType } from '../enums/workflow-tracking.enums';

export class WorkflowEventResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'TRK-2026-0001' }) trackingId: string;
  @ApiProperty({ enum: WorkflowEntityType }) entityType: WorkflowEntityType;
  @ApiProperty() entityId: string;
  @ApiPropertyOptional({ example: 'MR-0001' }) entityReference: string | null;
  @ApiProperty({ enum: WorkflowAction }) action: WorkflowAction;
  @ApiPropertyOptional() fromStatus: string | null;
  @ApiPropertyOptional() toStatus: string | null;
  @ApiPropertyOptional() round: number | null;
  @ApiPropertyOptional() actorId: string | null;
  @ApiPropertyOptional() actorName: string | null;
  @ApiPropertyOptional() actorEmail: string | null;
  @ApiPropertyOptional() comments: string | null;
  @ApiPropertyOptional() metadata: Record<string, unknown> | null;
  @ApiProperty() createdAt: Date;
}

/** One document of the workflow, with its latest known status. */
export class WorkflowDocumentDto {
  @ApiProperty({ enum: WorkflowEntityType }) entityType: WorkflowEntityType;
  @ApiProperty() entityId: string;
  @ApiPropertyOptional() entityReference: string | null;
  @ApiPropertyOptional() status: string | null;
  @ApiProperty() firstSeenAt: Date;
  @ApiProperty() lastUpdatedAt: Date;
}

export class WorkflowTimelineDto {
  @ApiProperty({ example: 'TRK-2026-0001' }) trackingId: string;
  @ApiProperty({ type: [WorkflowDocumentDto] }) documents: WorkflowDocumentDto[];
  @ApiProperty({ type: [WorkflowEventResponseDto] }) events: WorkflowEventResponseDto[];
}
