import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param,
  Query, UseGuards, Request, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiBody,
} from '@nestjs/swagger';
import { ServiceGroupUserService } from './service-group-user.service';
import {
  CreateServiceGroupUserDto,
  SyncServiceGroupUsersDto,
  BulkAssignmentIdsDto,
} from './dto/create-service-group-user.dto';
import { ServiceGroupUserQueryDto } from './dto/service-group-user-query.dto';
import {
  ServiceGroupUserResponseDto,
  ServiceGroupUserListResponseDto,
  SyncResultDto,
  BulkOperationResultDto,
} from './dto/service-group-user-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Service Group Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('service-group-users')
export class ServiceGroupUserController {
  constructor(private readonly service: ServiceGroupUserService) {}

  // ── POST / — Assign users to a service group ──────────────────────

  @Post()
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Assign users to a Service Group',
    description: 'Batch-assigns one or more users to a service group. Duplicate assignments are silently skipped and returned in skippedIds.',
  })
  @ApiResponse({ status: 201, description: 'Users assigned successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or inactive service group/user' })
  @ApiResponse({ status: 404, description: 'Service group or user not found' })
  async create(
    @Body() dto: CreateServiceGroupUserDto,
    @Request() req: any,
  ): Promise<ResponseDto<{
    created: ServiceGroupUserResponseDto[];
    restored: ServiceGroupUserResponseDto[];
    skipped: number;
    skippedIds: string[];
  }>> {
    const { organizationId, userId } = req.user;
    const result = await this.service.create(organizationId, dto, userId);
    const msg = `${result.created.length} created, ${result.restored.length} restored, ${result.skipped} skipped`;
    return ResponseDto.created(result, msg);
  }

  // ── GET /bulk-disable — must appear before /:id ────────────────────

  @Post('bulk-disable')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk disable assignments',
    description: 'Disables multiple service-group-user assignments. Failed IDs are returned in the result.',
  })
  @ApiResponse({ status: 200, type: BulkOperationResultDto })
  async bulkDisable(
    @Body() dto: BulkAssignmentIdsDto,
    @Request() req: any,
  ): Promise<ResponseDto<BulkOperationResultDto>> {
    const { organizationId, userId } = req.user;
    const result = await this.service.bulkDisable(organizationId, dto, userId);
    return ResponseDto.success(result, 'Bulk disable completed');
  }

  @Post('bulk-enable')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk enable assignments',
    description: 'Re-enables multiple service-group-user assignments.',
  })
  @ApiResponse({ status: 200, type: BulkOperationResultDto })
  async bulkEnable(
    @Body() dto: BulkAssignmentIdsDto,
    @Request() req: any,
  ): Promise<ResponseDto<BulkOperationResultDto>> {
    const { organizationId, userId } = req.user;
    const result = await this.service.bulkEnable(organizationId, dto, userId);
    return ResponseDto.success(result, 'Bulk enable completed');
  }

  // ── GET /service-group/:serviceGroupId — members of a group ───────

  @Get('service-group/:serviceGroupId')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'User')
  @ApiOperation({
    summary: 'Get all members of a Service Group',
    description: 'Returns the full member list (active and inactive) for the given service group.',
  })
  @ApiParam({ name: 'serviceGroupId', type: String })
  @ApiResponse({ status: 200 })
  async getUsersForServiceGroup(
    @Param('serviceGroupId', ParseUUIDPipe) serviceGroupId: string,
    @Request() req: any,
  ): Promise<ResponseDto<any>> {
    const { organizationId } = req.user;
    const result = await this.service.getUsersForServiceGroup(organizationId, serviceGroupId);
    return ResponseDto.success(result);
  }

  // ── PUT /service-group/:serviceGroupId/sync — replace membership ───

  @Put('service-group/:serviceGroupId/sync')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync Service Group membership',
    description:
      'Intelligently replaces the complete membership of a service group. ' +
      'Users absent from the list are soft-deleted; previously disabled users are re-enabled. ' +
      'Returns counts for added / removed / re-enabled / unchanged.',
  })
  @ApiParam({ name: 'serviceGroupId', type: String })
  @ApiBody({ type: SyncServiceGroupUsersDto })
  @ApiResponse({ status: 200, type: SyncResultDto })
  async sync(
    @Param('serviceGroupId', ParseUUIDPipe) serviceGroupId: string,
    @Body() dto: SyncServiceGroupUsersDto,
    @Request() req: any,
  ): Promise<ResponseDto<SyncResultDto>> {
    const { organizationId, uguid } = req.user;
    const result = await this.service.sync(organizationId, serviceGroupId, dto, uguid);
    return ResponseDto.success(result, 'Membership synchronized');
  }

  // ── GET /user/:userId — service groups for a user ─────────────────

  @Get('user/:userId')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'User')
  @ApiOperation({
    summary: "Get a user's Service Groups",
    description: 'Returns all service groups (active only) that the given user is assigned to.',
  })
  @ApiParam({ name: 'userId', type: String })
  @ApiResponse({ status: 200 })
  async getServiceGroupsForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: any,
  ): Promise<ResponseDto<any>> {
    const { organizationId } = req.user;
    const result = await this.service.getServiceGroupsForUser(organizationId, userId);
    return ResponseDto.success(result);
  }

  // ── GET / — paginated list ─────────────────────────────────────────

  @Get()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'User')
  @ApiOperation({ summary: 'List service-group-user assignments (paginated)' })
  @ApiResponse({ status: 200, type: ServiceGroupUserListResponseDto })
  async findAll(
    @Query() query: ServiceGroupUserQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<ServiceGroupUserListResponseDto>> {
    const { organizationId } = req.user;
    const result = await this.service.findAll(organizationId, query);
    return ResponseDto.success(result);
  }

  // ── GET /:id ───────────────────────────────────────────────────────

  @Get(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'User')
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Get a single assignment by ID' })
  @ApiResponse({ status: 200, type: ServiceGroupUserResponseDto })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<ServiceGroupUserResponseDto>> {
    const { organizationId } = req.user;
    const result = await this.service.findOne(organizationId, id);
    return ResponseDto.success(result);
  }

  // ── PATCH /:id/disable ─────────────────────────────────────────────

  @Patch(':id/disable')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Disable an assignment (revoke access immediately)' })
  @ApiResponse({ status: 200, type: ServiceGroupUserResponseDto })
  async disable(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<ServiceGroupUserResponseDto>> {
    const { organizationId, uguid } = req.user;
    const result = await this.service.disable(organizationId, id, uguid);
    return ResponseDto.updated(result, 'Assignment disabled');
  }

  // ── PATCH /:id/enable ──────────────────────────────────────────────

  @Patch(':id/enable')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Re-enable a disabled assignment' })
  @ApiResponse({ status: 200, type: ServiceGroupUserResponseDto })
  async enable(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<ServiceGroupUserResponseDto>> {
    const { organizationId, uguid } = req.user;
    const result = await this.service.enable(organizationId, id, uguid);
    return ResponseDto.updated(result, 'Assignment enabled');
  }

  // ── DELETE /:id ────────────────────────────────────────────────────

  @Delete(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Soft-delete an assignment (permanent removal from group)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    const { organizationId, uguid } = req.user;
    await this.service.remove(organizationId, id, uguid);
    return ResponseDto.deleted('Assignment removed');
  }
}
