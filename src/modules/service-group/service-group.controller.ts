import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param,
  Query, UseGuards, Request, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiBody,
} from '@nestjs/swagger';
import { ServiceGroupService } from './service-group.service';
import {
  CreateServiceGroupDto,
  CloneServiceGroupDto,
  CopyPermissionsDto,
} from './dto/create-service-group.dto';
import { UpdateServiceGroupDto } from './dto/update-service-group.dto';
import { ServiceGroupQueryDto } from './dto/service-group-query.dto';
import {
  ServiceGroupResponseDto,
  ServiceGroupListResponseDto,
  PermissionMatrixDto,
} from './dto/service-group-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Service Groups')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('service-groups')
export class ServiceGroupController {
  constructor(private readonly service: ServiceGroupService) {}

  // ── POST / ────────────────────────────────────────────────────────
  @Post()
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a Service Group',
    description: 'Creates a permission group with activities and permissions in a single transaction. Code and name are immutable after creation.',
  })
  @ApiBody({ type: CreateServiceGroupDto })
  @ApiResponse({ status: 201, type: ServiceGroupResponseDto, description: 'Service Group created' })
  @ApiResponse({ status: 400, description: 'Inactive or deleted activity; duplicate permissions' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 409, description: 'Code or name already exists' })
  async create(
    @Body() dto: CreateServiceGroupDto,
    @Request() req: any,
  ): Promise<ResponseDto<ServiceGroupResponseDto>> {
    const result = await this.service.create(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(result, 'Service Group created successfully');
  }

  // ── Static routes before :id ──────────────────────────────────────

  // ── GET /activities ───────────────────────────────────────────────
  @Get('activities')
  @ApiOperation({ summary: 'Get all available activities for the organization (for assignment UI)' })
  @ApiResponse({ status: 200, description: 'Available activities' })
  async getAvailableActivities(
    @Request() req: any,
  ): Promise<ResponseDto<any[]>> {
    const result = await this.service.getAvailableActivities(req.user.organizationId);
    return ResponseDto.success(result);
  }

  // ── GET / ─────────────────────────────────────────────────────────
  @Get()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'List all Service Groups with pagination, search and filter' })
  @ApiResponse({ status: 200, type: ServiceGroupListResponseDto })
  async findAll(
    @Query() query: ServiceGroupQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<ServiceGroupListResponseDto>> {
    const result = await this.service.findAll(req.user.organizationId, query);
    return ResponseDto.success(result);
  }

  // ── GET /:id ──────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get full Service Group details with activities and permissions' })
  @ApiParam({ name: 'id', description: 'Service Group UUID' })
  @ApiResponse({ status: 200, type: ServiceGroupResponseDto })
  @ApiResponse({ status: 404, description: 'Service Group not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<ServiceGroupResponseDto>> {
    const result = await this.service.findOne(req.user.organizationId, id);
    return ResponseDto.success(result);
  }

  // ── GET /:id/permission-matrix ────────────────────────────────────
  @Get(':id/permission-matrix')
  @ApiOperation({
    summary: 'Get permission matrix for a Service Group',
    description: 'Returns an activity × permission grid — ideal for Angular checkbox tables.',
  })
  @ApiParam({ name: 'id', description: 'Service Group UUID' })
  @ApiResponse({ status: 200, type: PermissionMatrixDto })
  @ApiResponse({ status: 404, description: 'Service Group not found' })
  async getPermissionMatrix(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<PermissionMatrixDto>> {
    const result = await this.service.getPermissionMatrix(req.user.organizationId, id);
    return ResponseDto.success(result);
  }

  // ── PUT /:id ──────────────────────────────────────────────────────
  @Put(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @ApiOperation({
    summary: 'Update a Service Group',
    description: 'Code and name are permanently immutable. Providing them returns 409. Activities field is a full replacement when supplied.',
  })
  @ApiParam({ name: 'id', description: 'Service Group UUID' })
  @ApiBody({ type: UpdateServiceGroupDto })
  @ApiResponse({ status: 200, type: ServiceGroupResponseDto })
  @ApiResponse({ status: 404, description: 'Service Group not found' })
  @ApiResponse({ status: 409, description: 'Attempt to modify immutable code or name' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceGroupDto,
    @Request() req: any,
  ): Promise<ResponseDto<ServiceGroupResponseDto>> {
    const result = await this.service.update(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(result, 'Service Group updated successfully');
  }

  // ── PATCH /:id/disable ────────────────────────────────────────────
  @Patch(':id/disable')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @ApiOperation({
    summary: 'Disable a Service Group',
    description: 'Immediately revokes access for all assigned users.',
  })
  @ApiParam({ name: 'id', description: 'Service Group UUID' })
  @ApiResponse({ status: 200, type: ServiceGroupResponseDto })
  @ApiResponse({ status: 400, description: 'Already disabled' })
  @ApiResponse({ status: 404, description: 'Service Group not found' })
  async disable(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<ServiceGroupResponseDto>> {
    const result = await this.service.disable(req.user.organizationId, id, req.user.email);
    return ResponseDto.updated(result, 'Service Group disabled');
  }

  // ── PATCH /:id/enable ─────────────────────────────────────────────
  @Patch(':id/enable')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @ApiOperation({ summary: 'Enable a Service Group' })
  @ApiParam({ name: 'id', description: 'Service Group UUID' })
  @ApiResponse({ status: 200, type: ServiceGroupResponseDto })
  @ApiResponse({ status: 400, description: 'Already active' })
  @ApiResponse({ status: 404, description: 'Service Group not found' })
  async enable(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<ServiceGroupResponseDto>> {
    const result = await this.service.enable(req.user.organizationId, id, req.user.email);
    return ResponseDto.updated(result, 'Service Group enabled');
  }

  // ── POST /:id/clone ───────────────────────────────────────────────
  @Post(':id/clone')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Clone a Service Group',
    description: 'Creates a new group with a new code and name, copying all activities and permissions. Essential because names are immutable.',
  })
  @ApiParam({ name: 'id', description: 'Source Service Group UUID' })
  @ApiBody({ type: CloneServiceGroupDto })
  @ApiResponse({ status: 201, type: ServiceGroupResponseDto })
  @ApiResponse({ status: 404, description: 'Source group not found' })
  @ApiResponse({ status: 409, description: 'New code or name already exists' })
  async clone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloneServiceGroupDto,
    @Request() req: any,
  ): Promise<ResponseDto<ServiceGroupResponseDto>> {
    const result = await this.service.clone(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.created(result, 'Service Group cloned successfully');
  }

  // ── POST /:id/copy ────────────────────────────────────────────────
  @Post(':id/copy')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Copy permissions from another Service Group into this one',
    description: 'Replaces all activities and permissions of the target group with those from the source group.',
  })
  @ApiParam({ name: 'id', description: 'Target Service Group UUID' })
  @ApiBody({ type: CopyPermissionsDto })
  @ApiResponse({ status: 200, type: ServiceGroupResponseDto })
  @ApiResponse({ status: 400, description: 'Source and target are the same group' })
  @ApiResponse({ status: 404, description: 'Target or source group not found' })
  async copyPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CopyPermissionsDto,
    @Request() req: any,
  ): Promise<ResponseDto<ServiceGroupResponseDto>> {
    const result = await this.service.copyPermissions(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(result, 'Permissions copied successfully');
  }

  // ── DELETE /:id ───────────────────────────────────────────────────
  @Delete(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a Service Group' })
  @ApiParam({ name: 'id', description: 'Service Group UUID' })
  @ApiResponse({ status: 200, description: 'Service Group deleted' })
  @ApiResponse({ status: 404, description: 'Service Group not found' })
  @ApiResponse({ status: 409, description: 'System group or assigned to active users' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.service.remove(req.user.organizationId, id, req.user.email);
    return ResponseDto.deleted('Service Group deleted successfully');
  }
}
