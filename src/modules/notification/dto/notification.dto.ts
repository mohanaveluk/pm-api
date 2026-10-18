import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { NotificationCategory } from '../enums/notification.enums';

const toBoolean = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : value === true || value === 'true';

export class NotificationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Only unread notifications' })
  @IsOptional() @Transform(toBoolean) @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ description: 'Archived notifications instead of the active ones' })
  @IsOptional() @Transform(toBoolean) @IsBoolean()
  archived?: boolean;

  @ApiPropertyOptional({ enum: NotificationCategory })
  @IsOptional() @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiPropertyOptional({ description: 'Search the title, message, who did it, type and tracking id' })
  @IsOptional() @IsString() @MaxLength(200)
  search?: string;
}

export class NotificationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: NotificationCategory }) category: string;
  @ApiProperty({ example: 'REVIEW_MATERIAL_REQUISITION' }) type: string;
  @ApiProperty() title: string;
  @ApiProperty() message: string;
  @ApiProperty({ example: 'info' }) severity: string;
  @ApiPropertyOptional() link: string | null;
  @ApiProperty() sourceType: string;
  @ApiPropertyOptional() referenceType: string | null;
  @ApiPropertyOptional() referenceId: string | null;
  @ApiPropertyOptional() trackingId: string | null;
  @ApiPropertyOptional() actorName: string | null;
  @ApiPropertyOptional() metadata: Record<string, any> | null;
  @ApiProperty() occurredAt: Date;
  @ApiProperty() isRead: boolean;
  @ApiPropertyOptional() readAt: Date | null;
  @ApiProperty() isArchived: boolean;
}

/** One notification with what it points at: an email's content, a workflow step's details. */
export class NotificationDetailDto extends NotificationResponseDto {
  @ApiPropertyOptional({ description: 'For an email: the HTML that was sent (secrets redacted)' })
  emailHtml: string | null;
  @ApiPropertyOptional() emailSubject: string | null;
  @ApiPropertyOptional() emailFrom: string | null;
  @ApiPropertyOptional() emailTo: string | null;
  @ApiPropertyOptional() emailCc: string | null;
  @ApiPropertyOptional({ example: 'SENT' }) emailStatus: string | null;
}

export class NotificationListDto {
  @ApiProperty({ type: [NotificationResponseDto] }) items: NotificationResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
  @ApiProperty({ description: 'Unread (active) notifications of the user, regardless of filters' })
  unreadCount: number;
}

export class NotificationCountDto {
  @ApiProperty() unread: number;
}
