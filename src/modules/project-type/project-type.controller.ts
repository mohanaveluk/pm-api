import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiBody,
} from '@nestjs/swagger';
import { ProjectTypeService } from './project-type.service';
import { CreateProjectTypeDto } from './dto/create-project-type.dto';
import { UpdateProjectTypeDto } from './dto/update-project-type.dto';
import { ProjectTypeQueryDto } from './dto/project-type-query.dto';
import { ProjectTypeListResponseDto, ProjectTypeResponseDto } from './dto/project-type-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Project Types')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('project-types')
export class ProjectTypeController {
  constructor(private readonly projectTypeService: ProjectTypeService) {}

  // ── POST /project-types ────────────────────────────────────────────
  @Post()
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new project type',
    description:
      'Code is server-generated as a per-organization sequence starting at 0001 ' +
      'and is immutable thereafter. Any code supplied in the body is ignored.',
  })
  @ApiBody({ type: CreateProjectTypeDto })
  @ApiResponse({ status: 201, description: 'Project type created', type: ProjectTypeResponseDto })
  @ApiResponse({ status: 409, description: 'Project type code already exists in this organization' })
  async create(
    @Body() dto: CreateProjectTypeDto,
    @Request() req: any,
  ): Promise<ResponseDto<ProjectTypeResponseDto>> {
    const pt = await this.projectTypeService.create(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(pt, 'Project Type created successfully');
  }

  // ── GET /project-types ─────────────────────────────────────────────
  @Get()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'List all project types with pagination, search and filter' })
  @ApiResponse({ status: 200, description: 'Paginated project type list', type: ProjectTypeListResponseDto })
  async findAll(
    @Query() query: ProjectTypeQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<ProjectTypeListResponseDto>> {
    const result = await this.projectTypeService.findAll(req.user.organizationId, query);
    return ResponseDto.success(result);
  }

  // ── GET /project-types/active ──────────────────────────────────────
  @Get('active')
  @ApiOperation({ summary: 'Get all active project types (for dropdowns)' })
  @ApiResponse({ status: 200, description: 'Active project types', type: [ProjectTypeResponseDto] })
  async findActive(
    @Request() req: any,
  ): Promise<ResponseDto<ProjectTypeResponseDto[]>> {
    const items = await this.projectTypeService.findActive(req.user.organizationId);
    return ResponseDto.success(items);
  }

  // ── GET /project-types/:id ─────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get project type by ID' })
  @ApiParam({ name: 'id', description: 'Project Type UUID' })
  @ApiResponse({ status: 200, description: 'Project type details', type: ProjectTypeResponseDto })
  @ApiResponse({ status: 404, description: 'Project type not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<ProjectTypeResponseDto>> {
    const pt = await this.projectTypeService.findOne(req.user.organizationId, id);
    return ResponseDto.success(pt);
  }

  // ── PUT /project-types/:id ─────────────────────────────────────────
  @Put(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @ApiOperation({
    summary: 'Update project type',
    description: 'Code is server-generated and cannot be changed.',
  })
  @ApiParam({ name: 'id', description: 'Project Type UUID' })
  @ApiBody({ type: UpdateProjectTypeDto })
  @ApiResponse({ status: 200, description: 'Project type updated', type: ProjectTypeResponseDto })
  @ApiResponse({ status: 404, description: 'Project type not found' })
  @ApiResponse({ status: 409, description: 'Code change attempted' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectTypeDto,
    @Request() req: any,
  ): Promise<ResponseDto<ProjectTypeResponseDto>> {
    const pt = await this.projectTypeService.update(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(pt, 'Project Type updated successfully');
  }

  // ── DELETE /project-types/:id ──────────────────────────────────────
  @Delete(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a project type' })
  @ApiParam({ name: 'id', description: 'Project Type UUID' })
  @ApiResponse({ status: 200, description: 'Project type deleted' })
  @ApiResponse({ status: 404, description: 'Project type not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.projectTypeService.remove(req.user.organizationId, id, req.user.email);
    return ResponseDto.deleted('Project Type deleted successfully');
  }
}
