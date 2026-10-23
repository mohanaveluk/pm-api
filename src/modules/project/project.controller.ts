import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put,
  Query, Request, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto, UpdateProjectStatusDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import {
  ProjectListResponseDto, ProjectManagerOptionDto, ProjectOptionDto, ProjectResponseDto,
  ProjectSummaryResponseDto,
} from './dto/project-response.dto';

// Who may read and who may change projects. The two administrator roles and
// Manager mirror the other masters; ProjectManager owns day-to-day changes.
const READERS = ['OrganizationAdmin', 'SuperAdmin', 'Manager', 'ProjectManager', 'DepartmentManager', 'DisciplineLead'];
const WRITERS = ['OrganizationAdmin', 'SuperAdmin', 'Manager', 'ProjectManager'];
const ADMINS  = ['OrganizationAdmin', 'SuperAdmin'];

// Non-administrators only see the projects they are mapped to, manage or created.
const viewerOf = (req: any) => ({ userId: req.user.userId, email: req.user.email, role: req.user.role });

@ApiTags('Projects')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  // ── POST /projects ─────────────────────────────────────────────────
  @Post()
  @Roles(...WRITERS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a project',
    description:
      'The project number is server-generated as a per-organization sequence starting at 0001 and ' +
      'is immutable thereafter. `clientId` must be an active client of the organization; the ' +
      "client's name is read from that relationship, never taken from the request.",
  })
  @ApiBody({ type: CreateProjectDto })
  @ApiResponse({ status: 201, description: 'Project created', type: ProjectResponseDto })
  @ApiResponse({ status: 400, description: 'Unknown or inactive client, project type or manager; invalid dates' })
  async create(@Body() dto: CreateProjectDto, @Request() req: any): Promise<ResponseDto<ProjectResponseDto>> {
    const project = await this.projectService.create(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(project, 'Project created successfully');
  }

  // ── GET /projects ──────────────────────────────────────────────────
  @Get()
  @Roles(...READERS)
  @ApiOperation({ summary: 'List and search projects' })
  @ApiResponse({ status: 200, type: ProjectListResponseDto })
  async findAll(
    @Query() query: ProjectQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<ProjectListResponseDto>> {
    return ResponseDto.success(await this.projectService.findAll(req.user.organizationId, query, viewerOf(req)));
  }

  // ── GET /projects/active ───────────────────────────────────────────
  // Declared before ':id' so "active" is never read as an id.
  @Get('active')
  @ApiOperation({
    summary: 'Open projects (planned, active, on hold), for dropdowns',
    description: 'Completed and cancelled projects are left out.',
  })
  @ApiResponse({ status: 200, type: [ProjectOptionDto] })
  async findActive(@Request() req: any): Promise<ResponseDto<ProjectOptionDto[]>> {
    return ResponseDto.success(await this.projectService.findActive(req.user.organizationId, viewerOf(req)));
  }

  // ── GET /projects/project-managers ─────────────────────────────────
  @Get('project-managers')
  @ApiOperation({ summary: 'Internal, active users who can be assigned as project manager' })
  @ApiResponse({ status: 200, type: [ProjectManagerOptionDto] })
  async findProjectManagers(@Request() req: any): Promise<ResponseDto<ProjectManagerOptionDto[]>> {
    return ResponseDto.success(await this.projectService.findProjectManagers(req.user.organizationId));
  }

  // ── GET /projects/:id/summary ──────────────────────────────────────
  @Get(':id/summary')
  @Roles(...READERS)
  @ApiOperation({ summary: 'A project with its client, type, manager and schedule summary' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, type: ProjectSummaryResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<ProjectSummaryResponseDto>> {
    return ResponseDto.success(await this.projectService.getSummary(req.user.organizationId, id, viewerOf(req)));
  }

  // ── GET /projects/:id ──────────────────────────────────────────────
  @Get(':id')
  @Roles(...READERS)
  @ApiOperation({ summary: 'Get a project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<ProjectResponseDto>> {
    return ResponseDto.success(await this.projectService.findOne(req.user.organizationId, id, viewerOf(req)));
  }

  // ── PUT /projects/:id ──────────────────────────────────────────────
  @Put(':id')
  @Roles(...WRITERS)
  @ApiOperation({
    summary: 'Update a project',
    description: 'Accepts any subset of the fields. The number and the status are not changed here.',
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiBody({ type: UpdateProjectDto })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @Request() req: any,
  ): Promise<ResponseDto<ProjectResponseDto>> {
    await this.projectService.assertVisible(req.user.organizationId, id, viewerOf(req));
    const project = await this.projectService.update(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(project, 'Project updated successfully');
  }

  // ── PATCH /projects/:id/status ─────────────────────────────────────
  @Patch(':id/status')
  @Roles(...WRITERS)
  @ApiOperation({
    summary: 'Change a project\'s status',
    description:
      'Planned → Active or Cancelled; Active → On Hold, Completed or Cancelled; On Hold → Active or ' +
      'Cancelled; Completed → Active (reopen); Cancelled → Planned (reinstate).',
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiBody({ type: UpdateProjectStatusDto })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  @ApiResponse({ status: 400, description: 'Transition not allowed' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectStatusDto,
    @Request() req: any,
  ): Promise<ResponseDto<ProjectResponseDto>> {
    await this.projectService.assertVisible(req.user.organizationId, id, viewerOf(req));
    const project = await this.projectService.updateStatus(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(project, 'Project status updated');
  }

  // ── DELETE /projects/:id ───────────────────────────────────────────
  @Delete(':id')
  @Roles(...ADMINS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete a project',
    description: 'Only a planned or cancelled project can be deleted.',
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project deleted' })
  @ApiResponse({ status: 409, description: 'The project has been started' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.projectService.remove(req.user.organizationId, id, req.user.email);
    return ResponseDto.deleted('Project deleted successfully');
  }
}
