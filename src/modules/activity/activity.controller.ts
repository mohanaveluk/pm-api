import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiBody,
} from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { CreateActivityDto, BulkCreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityQueryDto } from './dto/activity-query.dto';
import {
  ActivityDropdownItemDto,
  ActivityListResponseDto,
  ActivityResponseDto,
  BulkCreateActivityResultDto,
} from './dto/activity-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Activities')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activities')
export class ActivityController {
  constructor(private readonly service: ActivityService) {}

  // ── POST / ────────────────────────────────────────────────────────
  @Post()
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a single Activity under a DepartmentDiscipline mapping' })
  @ApiBody({ type: CreateActivityDto })
  @ApiResponse({ status: 201, description: 'Activity created', type: ActivityResponseDto })
  @ApiResponse({ status: 400, description: 'Mapping inactive or departmentId/disciplineId inconsistent' })
  @ApiResponse({ status: 404, description: 'Mapping, Department, or Discipline not found' })
  @ApiResponse({ status: 409, description: 'Activity code or name already exists in this mapping' })
  async create(
    @Body() dto: CreateActivityDto,
    @Request() req: any,
  ): Promise<ResponseDto<ActivityResponseDto>> {
    const result = await this.service.create(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(result, 'Activity created successfully');
  }

  // ── POST /bulk ────────────────────────────────────────────────────
  @Post('bulk')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Bulk create Activities under a DepartmentDiscipline mapping',
    description: 'Creates multiple activities in a single transaction. Duplicate codes are skipped.',
  })
  @ApiBody({ type: BulkCreateActivityDto })
  @ApiResponse({ status: 201, description: 'Bulk activities created', type: BulkCreateActivityResultDto })
  @ApiResponse({ status: 404, description: 'DepartmentDiscipline mapping not found' })
  async bulkCreate(
    @Body() dto: BulkCreateActivityDto,
    @Request() req: any,
  ): Promise<ResponseDto<BulkCreateActivityResultDto>> {
    const result = await this.service.bulkCreate(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(
      result,
      `${result.created.length} activity/activities created, ${result.skipped} skipped`,
    );
  }

  // ── Static routes MUST appear before :id ─────────────────────────

  // ── GET /active ───────────────────────────────────────────────────
  @Get('active')
  @ApiOperation({ summary: 'Get all active activities (for dropdowns)' })
  @ApiResponse({ status: 200, type: [ActivityDropdownItemDto] })
  async findActive(
    @Request() req: any,
  ): Promise<ResponseDto<ActivityDropdownItemDto[]>> {
    return ResponseDto.success(await this.service.findActive(req.user.organizationId));
  }

  // ── GET /department/:departmentId ─────────────────────────────────
  @Get('department/:departmentId')
  @ApiOperation({ summary: 'Get active activities for a department' })
  @ApiParam({ name: 'departmentId', description: 'Department UUID' })
  @ApiResponse({ status: 200, type: [ActivityDropdownItemDto] })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async findByDepartment(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Request() req: any,
  ): Promise<ResponseDto<ActivityDropdownItemDto[]>> {
    return ResponseDto.success(
      await this.service.findByDepartment(req.user.organizationId, departmentId),
    );
  }

  // ── GET /discipline/:disciplineId ─────────────────────────────────
  @Get('discipline/:disciplineId')
  @ApiOperation({ summary: 'Get active activities for a discipline' })
  @ApiParam({ name: 'disciplineId', description: 'Discipline UUID' })
  @ApiResponse({ status: 200, type: [ActivityDropdownItemDto] })
  @ApiResponse({ status: 404, description: 'Discipline not found' })
  async findByDiscipline(
    @Param('disciplineId', ParseUUIDPipe) disciplineId: string,
    @Request() req: any,
  ): Promise<ResponseDto<ActivityDropdownItemDto[]>> {
    return ResponseDto.success(
      await this.service.findByDiscipline(req.user.organizationId, disciplineId),
    );
  }

  // ── GET /department-discipline/:departmentDisciplineId ────────────
  @Get('department-discipline/:departmentDisciplineId')
  @ApiOperation({
    summary: 'Get active activities for a DepartmentDiscipline mapping',
    description: 'Primary dropdown source for Angular forms. Returns activities scoped to the mapping.',
  })
  @ApiParam({ name: 'departmentDisciplineId', description: 'DepartmentDiscipline mapping UUID' })
  @ApiResponse({ status: 200, type: [ActivityDropdownItemDto] })
  @ApiResponse({ status: 404, description: 'Mapping not found' })
  async findByDepartmentDiscipline(
    @Param('departmentDisciplineId', ParseUUIDPipe) departmentDisciplineId: string,
    @Request() req: any,
  ): Promise<ResponseDto<ActivityDropdownItemDto[]>> {
    return ResponseDto.success(
      await this.service.findByDepartmentDiscipline(req.user.organizationId, departmentDisciplineId),
    );
  }

  // ── GET / ─────────────────────────────────────────────────────────
  @Get()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'List all activities with pagination, search and filter' })
  @ApiResponse({ status: 200, type: ActivityListResponseDto })
  async findAll(
    @Query() query: ActivityQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<ActivityListResponseDto>> {
    return ResponseDto.success(await this.service.findAll(req.user.organizationId, query));
  }

  // ── GET /:id ──────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get activity by ID' })
  @ApiParam({ name: 'id', description: 'Activity UUID' })
  @ApiResponse({ status: 200, type: ActivityResponseDto })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<ActivityResponseDto>> {
    return ResponseDto.success(await this.service.findOne(req.user.organizationId, id));
  }

  // ── PUT /:id ──────────────────────────────────────────────────────
  @Put(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @ApiOperation({
    summary: 'Update an activity',
    description: 'departmentDisciplineId, departmentId, and disciplineId are immutable after creation.',
  })
  @ApiParam({ name: 'id', description: 'Activity UUID' })
  @ApiBody({ type: UpdateActivityDto })
  @ApiResponse({ status: 200, type: ActivityResponseDto })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 409, description: 'Duplicate code or name' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityDto,
    @Request() req: any,
  ): Promise<ResponseDto<ActivityResponseDto>> {
    const result = await this.service.update(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(result, 'Activity updated successfully');
  }

  // ── DELETE /:id ───────────────────────────────────────────────────
  @Delete(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete an activity' })
  @ApiParam({ name: 'id', description: 'Activity UUID' })
  @ApiResponse({ status: 200, description: 'Activity deleted' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 409, description: 'Activity is a system activity or referenced by downstream records' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.service.remove(req.user.organizationId, id, req.user.email);
    return ResponseDto.deleted('Activity deleted successfully');
  }
}
