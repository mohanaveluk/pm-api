import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiBody,
} from '@nestjs/swagger';
import { DisciplineService } from './discipline.service';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';
import { DisciplineQueryDto } from './dto/discipline-query.dto';
import { DisciplineListResponseDto, DisciplineResponseDto } from './dto/discipline-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Disciplines')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('disciplines')
export class DisciplineController {
  constructor(private readonly deptService: DisciplineService) {}

  // ── POST /disciplines ─────────────────────────────────────────────
  @Post()
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new discipline' })
  @ApiBody({ type: CreateDisciplineDto })
  @ApiResponse({ status: 201, description: 'Discipline created', type: DisciplineResponseDto })
  @ApiResponse({ status: 409, description: 'Discipline code already exists in this organization' })
  async create(
    @Body() dto: CreateDisciplineDto,
    @Request() req: any,
  ): Promise<ResponseDto<DisciplineResponseDto>> {
    const dept = await this.deptService.create(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(dept, 'Discipline created successfully');
  }

  // ── GET /disciplines ──────────────────────────────────────────────
  @Get()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'List all disciplines with pagination, search and filter' })
  @ApiResponse({ status: 200, description: 'Paginated discipline list', type: DisciplineListResponseDto })
  async findAll(
    @Query() query: DisciplineQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<DisciplineListResponseDto>> {
    const result = await this.deptService.findAll(req.user.organizationId, query);
    return ResponseDto.success(result);
  }

  // ── GET /disciplines/active ───────────────────────────────────────
  @Get('active')
  @ApiOperation({ summary: 'Get all active disciplines (for dropdowns)' })
  @ApiResponse({ status: 200, description: 'Active disciplines', type: [DisciplineResponseDto] })
  async findActive(
    @Request() req: any,
  ): Promise<ResponseDto<DisciplineResponseDto[]>> {
    const depts = await this.deptService.findActive(req.user.organizationId);
    return ResponseDto.success(depts);
  }

  // ── GET /disciplines/:id ──────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get discipline by ID' })
  @ApiParam({ name: 'id', description: 'Discipline UUID' })
  @ApiResponse({ status: 200, description: 'Discipline details', type: DisciplineResponseDto })
  @ApiResponse({ status: 404, description: 'Discipline not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<DisciplineResponseDto>> {
    const dept = await this.deptService.findOne(req.user.organizationId, id);
    return ResponseDto.success(dept);
  }

  // ── PUT /disciplines/:id ──────────────────────────────────────────
  @Put(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @ApiOperation({ summary: 'Update discipline' })
  @ApiParam({ name: 'id', description: 'discipline UUID' })
  @ApiBody({ type: UpdateDisciplineDto })
  @ApiResponse({ status: 200, description: 'Discipline updated', type: DisciplineResponseDto })
  @ApiResponse({ status: 404, description: 'Discipline not found' })
  @ApiResponse({ status: 409, description: 'Discipline code already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDisciplineDto,
    @Request() req: any,
  ): Promise<ResponseDto<DisciplineResponseDto>> {
    const dept = await this.deptService.update(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(dept, 'Discipline updated successfully');
  }

  // ── DELETE /disciplines/:id ───────────────────────────────────────
  @Delete(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a discipline' })
  @ApiParam({ name: 'id', description: 'Discipline UUID' })
  @ApiResponse({ status: 200, description: 'Discipline deleted' })
  @ApiResponse({ status: 404, description: 'Discipline not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.deptService.remove(req.user.organizationId, id, req.user.email);
    return ResponseDto.deleted('Discipline deleted successfully');
  }
}
