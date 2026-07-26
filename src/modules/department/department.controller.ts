import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiBody,
} from '@nestjs/swagger';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentQueryDto } from './dto/department-query.dto';
import { DepartmentListResponseDto, DepartmentResponseDto } from './dto/department-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Departments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('departments')
export class DepartmentController {
  constructor(private readonly deptService: DepartmentService) {}

  // ── POST /departments ─────────────────────────────────────────────
  @Post()
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new department' })
  @ApiBody({ type: CreateDepartmentDto })
  @ApiResponse({ status: 201, description: 'Department created', type: DepartmentResponseDto })
  @ApiResponse({ status: 409, description: 'Department code already exists in this organization' })
  async create(
    @Body() dto: CreateDepartmentDto,
    @Request() req: any,
  ): Promise<ResponseDto<DepartmentResponseDto>> {
    const dept = await this.deptService.create(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(dept, 'Department created successfully');
  }

  // ── GET /departments ──────────────────────────────────────────────
  @Get()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'List all departments with pagination, search and filter' })
  @ApiResponse({ status: 200, description: 'Paginated department list', type: DepartmentListResponseDto })
  async findAll(
    @Query() query: DepartmentQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<DepartmentListResponseDto>> {
    const result = await this.deptService.findAll(req.user.organizationId, query);
    return ResponseDto.success(result);
  }

  // ── GET /departments/active ───────────────────────────────────────
  @Get('active')
  @ApiOperation({ summary: 'Get all active departments (for dropdowns)' })
  @ApiResponse({ status: 200, description: 'Active departments', type: [DepartmentResponseDto] })
  async findActive(
    @Request() req: any,
  ): Promise<ResponseDto<DepartmentResponseDto[]>> {
    const depts = await this.deptService.findActive(req.user.organizationId);
    return ResponseDto.success(depts);
  }

  // ── GET /departments/:id ──────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiResponse({ status: 200, description: 'Department details', type: DepartmentResponseDto })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<DepartmentResponseDto>> {
    const dept = await this.deptService.findOne(req.user.organizationId, id);
    return ResponseDto.success(dept);
  }

  // ── PUT /departments/:id ──────────────────────────────────────────
  @Put(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @ApiOperation({ summary: 'Update department' })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiBody({ type: UpdateDepartmentDto })
  @ApiResponse({ status: 200, description: 'Department updated', type: DepartmentResponseDto })
  @ApiResponse({ status: 404, description: 'Department not found' })
  @ApiResponse({ status: 409, description: 'Department code already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
    @Request() req: any,
  ): Promise<ResponseDto<DepartmentResponseDto>> {
    const dept = await this.deptService.update(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(dept, 'Department updated successfully');
  }

  // ── DELETE /departments/:id ───────────────────────────────────────
  @Delete(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a department' })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiResponse({ status: 200, description: 'Department deleted' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.deptService.remove(req.user.organizationId, id, req.user.email);
    return ResponseDto.deleted('Department deleted successfully');
  }
}
