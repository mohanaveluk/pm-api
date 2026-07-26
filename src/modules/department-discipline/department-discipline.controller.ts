import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiBody,
} from '@nestjs/swagger';
import { DepartmentDisciplineService } from './department-discipline.service';
import { CreateDepartmentDisciplineDto, BulkCreateDepartmentDisciplineDto } from './dto/create-department-discipline.dto';
import { UpdateDepartmentDisciplineDto } from './dto/update-department-discipline.dto';
import { DepartmentDisciplineQueryDto } from './dto/department-discipline-query.dto';
import {
  BulkCreateResultDto,
  DepartmentDisciplineListResponseDto,
  DepartmentDisciplineResponseDto,
  DepartmentInDisciplineDto,
  DisciplineInDepartmentDto,
} from './dto/department-discipline-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Department Discipline Mapping')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('department-disciplines')
export class DepartmentDisciplineController {
  constructor(private readonly service: DepartmentDisciplineService) {}

  // ── POST / ────────────────────────────────────────────────────────
  @Post()
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a single Department–Discipline mapping' })
  @ApiBody({ type: CreateDepartmentDisciplineDto })
  @ApiResponse({ status: 201, description: 'Mapping created', type: DepartmentDisciplineResponseDto })
  @ApiResponse({ status: 400, description: 'Department or Discipline is inactive' })
  @ApiResponse({ status: 404, description: 'Department or Discipline not found' })
  @ApiResponse({ status: 409, description: 'Mapping already exists' })
  async create(
    @Body() dto: CreateDepartmentDisciplineDto,
    @Request() req: any,
  ): Promise<ResponseDto<DepartmentDisciplineResponseDto>> {
    const result = await this.service.create(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(result, 'Mapping created successfully');
  }

  // ── POST /bulk ────────────────────────────────────────────────────
  @Post('bulk')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Bulk create Department–Discipline mappings',
    description: 'Creates multiple mappings in a single transaction. Existing mappings are skipped.',
  })
  @ApiBody({ type: BulkCreateDepartmentDisciplineDto })
  @ApiResponse({ status: 201, description: 'Bulk mappings created', type: BulkCreateResultDto })
  @ApiResponse({ status: 404, description: 'Department or one or more Disciplines not found' })
  async bulkCreate(
    @Body() dto: BulkCreateDepartmentDisciplineDto,
    @Request() req: any,
  ): Promise<ResponseDto<BulkCreateResultDto>> {
    const result = await this.service.bulkCreate(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(result, `${result.created.length} mapping(s) created, ${result.skipped} skipped`);
  }

  // ── GET /active ───────────────────────────────────────────────────
  // NOTE: static routes must be declared before :id param routes
  @Get('active')
  @ApiOperation({ summary: 'Get all active mappings (for dropdowns)' })
  @ApiResponse({ status: 200, description: 'Active mappings', type: [DepartmentDisciplineResponseDto] })
  async findActive(
    @Request() req: any,
  ): Promise<ResponseDto<DepartmentDisciplineResponseDto[]>> {
    const result = await this.service.findActive(req.user.organizationId);
    return ResponseDto.success(result);
  }

  // ── GET /department/:departmentId ─────────────────────────────────
  @Get('department/:departmentId')
  @ApiOperation({ summary: 'Get all disciplines mapped to a department' })
  @ApiParam({ name: 'departmentId', description: 'Department UUID' })
  @ApiResponse({ status: 200, description: 'Disciplines in department', type: [DisciplineInDepartmentDto] })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async getDisciplinesByDepartment(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Request() req: any,
  ): Promise<ResponseDto<DisciplineInDepartmentDto[]>> {
    const result = await this.service.getDisciplinesByDepartment(req.user.organizationId, departmentId);
    return ResponseDto.success(result);
  }

  // ── GET /discipline/:disciplineId ─────────────────────────────────
  @Get('discipline/:disciplineId')
  @ApiOperation({ summary: 'Get all departments mapped to a discipline' })
  @ApiParam({ name: 'disciplineId', description: 'Discipline UUID' })
  @ApiResponse({ status: 200, description: 'Departments with this discipline', type: [DepartmentInDisciplineDto] })
  @ApiResponse({ status: 404, description: 'Discipline not found' })
  async getDepartmentsByDiscipline(
    @Param('disciplineId', ParseUUIDPipe) disciplineId: string,
    @Request() req: any,
  ): Promise<ResponseDto<DepartmentInDisciplineDto[]>> {
    const result = await this.service.getDepartmentsByDiscipline(req.user.organizationId, disciplineId);
    return ResponseDto.success(result);
  }

  // ── GET / ─────────────────────────────────────────────────────────
  @Get()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'List all mappings with pagination, search and filter' })
  @ApiResponse({ status: 200, description: 'Paginated mapping list', type: DepartmentDisciplineListResponseDto })
  async findAll(
    @Query() query: DepartmentDisciplineQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<DepartmentDisciplineListResponseDto>> {
    const result = await this.service.findAll(req.user.organizationId, query);
    return ResponseDto.success(result);
  }

  // ── GET /:id ──────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get mapping by ID' })
  @ApiParam({ name: 'id', description: 'Mapping UUID' })
  @ApiResponse({ status: 200, description: 'Mapping details', type: DepartmentDisciplineResponseDto })
  @ApiResponse({ status: 404, description: 'Mapping not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<DepartmentDisciplineResponseDto>> {
    const result = await this.service.findOne(req.user.organizationId, id);
    return ResponseDto.success(result);
  }

  // ── PUT /:id ──────────────────────────────────────────────────────
  @Put(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @ApiOperation({
    summary: 'Update a mapping',
    description: 'Only displayOrder, remarks, isDefault, and isActive are updatable. Department and Discipline cannot be changed after creation.',
  })
  @ApiParam({ name: 'id', description: 'Mapping UUID' })
  @ApiBody({ type: UpdateDepartmentDisciplineDto })
  @ApiResponse({ status: 200, description: 'Mapping updated', type: DepartmentDisciplineResponseDto })
  @ApiResponse({ status: 404, description: 'Mapping not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDisciplineDto,
    @Request() req: any,
  ): Promise<ResponseDto<DepartmentDisciplineResponseDto>> {
    const result = await this.service.update(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(result, 'Mapping updated successfully');
  }

  // ── DELETE /:id ───────────────────────────────────────────────────
  @Delete(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a mapping' })
  @ApiParam({ name: 'id', description: 'Mapping UUID' })
  @ApiResponse({ status: 200, description: 'Mapping deleted' })
  @ApiResponse({ status: 404, description: 'Mapping not found' })
  @ApiResponse({ status: 409, description: 'Mapping is referenced by existing records' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.service.remove(req.user.organizationId, id, req.user.email);
    return ResponseDto.deleted('Mapping deleted successfully');
  }
}
