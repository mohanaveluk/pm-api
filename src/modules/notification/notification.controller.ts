import {
  Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';
import { NotificationService } from './notification.service';
import {
  NotificationCountDto, NotificationDetailDto, NotificationListDto, NotificationQueryDto,
  NotificationResponseDto,
} from './dto/notification.dto';

// Every route works on the signed-in user's own notifications only — any
// authenticated user may call them; no role is required.
@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'My notifications, newest first (filter by unread, category, archived, text)' })
  @ApiResponse({ status: 200, type: NotificationListDto })
  async list(@Query() query: NotificationQueryDto, @Request() req: any): Promise<ResponseDto<NotificationListDto>> {
    return ResponseDto.success(await this.service.list(req.user.userId, query));
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'How many unread notifications I have (for the bell badge)' })
  @ApiResponse({ status: 200, type: NotificationCountDto })
  async unreadCount(@Request() req: any): Promise<ResponseDto<NotificationCountDto>> {
    return ResponseDto.success({ unread: await this.service.unreadCount(req.user.userId) });
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all my notifications read' })
  async markAllRead(@Request() req: any): Promise<ResponseDto<{ updated: number }>> {
    return ResponseDto.success({ updated: await this.service.markAllRead(req.user.userId) });
  }

  @Post('backfill')
  @HttpCode(HttpStatus.OK)
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @ApiOperation({
    summary: 'Create notifications for emails and workflow steps recorded before notifications existed',
    description: 'For the caller\'s organization (all organizations for a SuperAdmin). Safe to run again.',
  })
  async backfill(@Request() req: any): Promise<ResponseDto<{ emails: number; workflow: number }>> {
    const org = req.user.role === 'SuperAdmin' ? null : req.user.organizationId;
    return ResponseDto.success(await this.service.backfill(org));
  }

  @Get(':id')
  @ApiOperation({ summary: 'One of my notifications, with the email content when it came from an email' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: NotificationDetailDto })
  async detail(@Param('id') id: string, @Request() req: any): Promise<ResponseDto<NotificationDetailDto>> {
    return ResponseDto.success(await this.service.detail(req.user.userId, id));
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark read' })
  async read(@Param('id') id: string, @Request() req: any): Promise<ResponseDto<NotificationResponseDto>> {
    return ResponseDto.success(await this.service.setRead(req.user.userId, id, true));
  }

  @Patch(':id/unread')
  @ApiOperation({ summary: 'Mark unread' })
  async unread(@Param('id') id: string, @Request() req: any): Promise<ResponseDto<NotificationResponseDto>> {
    return ResponseDto.success(await this.service.setRead(req.user.userId, id, false));
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive' })
  async archive(@Param('id') id: string, @Request() req: any): Promise<ResponseDto<NotificationResponseDto>> {
    return ResponseDto.success(await this.service.setArchived(req.user.userId, id, true));
  }

  @Patch(':id/unarchive')
  @ApiOperation({ summary: 'Unarchive' })
  async unarchive(@Param('id') id: string, @Request() req: any): Promise<ResponseDto<NotificationResponseDto>> {
    return ResponseDto.success(await this.service.setArchived(req.user.userId, id, false));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete (hide) a notification' })
  async remove(@Param('id') id: string, @Request() req: any): Promise<ResponseDto<null>> {
    await this.service.remove(req.user.userId, id);
    return ResponseDto.deleted('Notification deleted');
  }
}
