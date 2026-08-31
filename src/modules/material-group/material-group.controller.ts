import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
  HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiBody, ApiQuery,
} from '@nestjs/swagger';
import { MaterialGroupService } from './material-group.service';
import { CreateMaterialGroupDto } from './dto/create-material-group.dto';
import { UpdateMaterialGroupDto } from './dto/update-material-group.dto';
import { MaterialGroupQueryDto } from './dto/material-group-query.dto';
import {
  MaterialGroupResponseDto,
  MaterialGroupDropdownDto,
  MaterialGroupListResponseDto,
} from './dto/material-group-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Material Groups')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('material-groups')
export class MaterialGroupController {
  constructor(private readonly service: MaterialGroupService) {}

  // ── POST / ────────────────────────────────────────────────────────

  @Post()
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a Material Group',
    description:
      'Creates a new material group under a parent Material Category, scoped to the ' +
      'authenticated organization. Code is server-generated as a per-organization sequence starting at 0001 and is immutable. ' +
      'The parent category must be active.',
  })
  @ApiBody({ type: CreateMaterialGroupDto })
  @ApiResponse({ status: 201, description: 'Group created',                              type: MaterialGroupResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error or parent category inactive'                              })
  @ApiResponse({ status: 404, description: 'Parent Material Category not found'                                        })
  @ApiResponse({ status: 409, description: 'Code or name already exists under this category'                          })
  async create(
    @Body() dto: CreateMaterialGroupDto,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialGroupResponseDto>> {
    const mg = await this.service.create(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(mg, 'Material Group created successfully');
  }

  // ── GET /active — static route BEFORE /:id ───────────────────────

  @Get('active')
  @ApiOperation({
    summary: 'Get active Material Groups (dropdown)',
    description:
      'Returns a slim list of active, non-deleted groups ordered by displayOrder then name. ' +
      'Pass materialCategoryId to scope the list to a specific parent category — ' +
      'the primary use case for cascading dropdown widgets.',
  })
  @ApiQuery({
    name: 'materialCategoryId', required: false, type: String,
    description: 'Filter by parent Material Category UUID',
  })
  @ApiResponse({ status: 200, description: 'Active groups', type: [MaterialGroupDropdownDto] })
  async findActive(
    @Query('materialCategoryId') materialCategoryId: string | undefined,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialGroupDropdownDto[]>> {
    const items = await this.service.findActive(req.user.organizationId, materialCategoryId);
    return ResponseDto.success(items);
  }

  // ── GET / ─────────────────────────────────────────────────────────

  @Get()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'List Material Groups',
    description:
      'Returns a paginated, filterable, and searchable list of material groups. ' +
      'Supports filtering by materialCategoryId, isActive, isSystem, and free-text search.',
  })
  @ApiResponse({ status: 200, description: 'Paginated group list', type: MaterialGroupListResponseDto })
  async findAll(
    @Query() query: MaterialGroupQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialGroupListResponseDto>> {
    const result = await this.service.findAll(req.user.organizationId, query);
    return ResponseDto.success(result);
  }

  // ── GET /:id ──────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get Material Group by ID' })
  @ApiParam({ name: 'id', description: 'Material Group UUID' })
  @ApiResponse({ status: 200, description: 'Group details',   type: MaterialGroupResponseDto })
  @ApiResponse({ status: 404, description: 'Group not found'                                 })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialGroupResponseDto>> {
    const mg = await this.service.findOne(req.user.organizationId, id);
    return ResponseDto.success(mg);
  }

  // ── PUT /:id ──────────────────────────────────────────────────────

  @Put(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @ApiOperation({
    summary: 'Update Material Group',
    description:
      'Updates allowed fields. Code and materialCategoryId are immutable and will be ' +
      'rejected if supplied. isSystem flag cannot be changed via this endpoint.',
  })
  @ApiParam({ name: 'id', description: 'Material Group UUID' })
  @ApiBody({ type: UpdateMaterialGroupDto })
  @ApiResponse({ status: 200, description: 'Group updated', type: MaterialGroupResponseDto })
  @ApiResponse({ status: 404, description: 'Group not found'                               })
  @ApiResponse({ status: 409, description: 'Name already exists or immutable field change attempted' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaterialGroupDto,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialGroupResponseDto>> {
    const mg = await this.service.update(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(mg, 'Material Group updated successfully');
  }

  // ── PATCH /:id/enable — static suffix BEFORE generic /:id ────────

  @Patch(':id/enable')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enable a Material Group',
    description: 'Re-activates the group. The parent Material Category must itself be active.',
  })
  @ApiParam({ name: 'id', description: 'Material Group UUID' })
  @ApiResponse({ status: 200, description: 'Group enabled', type: MaterialGroupResponseDto })
  @ApiResponse({ status: 400, description: 'Already active or parent category inactive'    })
  @ApiResponse({ status: 404, description: 'Group not found'                               })
  async enable(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialGroupResponseDto>> {
    const mg = await this.service.enable(req.user.organizationId, id, req.user.email);
    return ResponseDto.updated(mg, 'Material Group enabled');
  }

  // ── PATCH /:id/disable ────────────────────────────────────────────

  @Patch(':id/disable')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Disable a Material Group',
    description:
      'Deactivates the group. The operation is blocked when the group is actively ' +
      'referenced by Material Subcategory, Material Master, PR, PO, or Inventory records.',
  })
  @ApiParam({ name: 'id', description: 'Material Group UUID' })
  @ApiResponse({ status: 200, description: 'Group disabled', type: MaterialGroupResponseDto })
  @ApiResponse({ status: 400, description: 'Already inactive'                               })
  @ApiResponse({ status: 404, description: 'Group not found'                                })
  @ApiResponse({ status: 409, description: 'Group is currently referenced by downstream data' })
  async disable(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialGroupResponseDto>> {
    const mg = await this.service.disable(req.user.organizationId, id, req.user.email);
    return ResponseDto.updated(mg, 'Material Group disabled');
  }

  // ── DELETE /:id ───────────────────────────────────────────────────

  @Delete(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete a Material Group',
    description:
      'Marks the group as deleted (isDeleted=true, isActive=false). ' +
      'System groups and groups in use cannot be deleted.',
  })
  @ApiParam({ name: 'id', description: 'Material Group UUID' })
  @ApiResponse({ status: 200, description: 'Group deleted'                                    })
  @ApiResponse({ status: 404, description: 'Group not found'                                  })
  @ApiResponse({ status: 409, description: 'System group or group currently in use'           })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.service.remove(req.user.organizationId, id, req.user.email);
    return ResponseDto.deleted('Material Group deleted successfully');
  }
}
