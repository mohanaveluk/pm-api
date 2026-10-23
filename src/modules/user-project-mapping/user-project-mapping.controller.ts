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
import { MappingActor, UserProjectMappingService } from './user-project-mapping.service';
import {
  CreateUserProjectMappingDto, EligibleUserDto, MyProjectDto, UpdateUserProjectMappingDto,
  UpdateUserProjectMappingStatusDto, UserProjectMappingDetailDto, UserProjectMappingListDto,
  UserProjectMappingQueryDto,
} from './dto/user-project-mapping.dto';

// Assigning projects is an administrator task.
const ADMINS = ['OrganizationAdmin', 'SuperAdmin'];

const actorOf = (req: any): MappingActor => ({
  userId: req.user.userId,
  email: req.user.email,
  name: [req.user.firstName, req.user.lastName].filter(Boolean).join(' ').trim() || req.user.email,
});

@ApiTags('User Project Mapping')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('user-project-mappings')
export class UserProjectMappingController {
  constructor(private readonly service: UserProjectMappingService) {}

  // ── POST / ────────────────────────────────────────────────────────
  @Post()
  @Roles(...ADMINS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a project to internal users (one mapping row per user)' })
  @ApiBody({ type: CreateUserProjectMappingDto })
  @ApiResponse({ status: 201, type: UserProjectMappingDetailDto })
  @ApiResponse({ status: 400, description: 'Project closed, or a user is external / deactivated' })
  @ApiResponse({ status: 409, description: 'The project already has a mapping' })
  async create(
    @Body() dto: CreateUserProjectMappingDto,
    @Request() req: any,
  ): Promise<ResponseDto<UserProjectMappingDetailDto>> {
    const result = await this.service.create(req.user.organizationId, dto, actorOf(req));
    return ResponseDto.created(result, `Project assigned to ${result.userCount} user(s)`);
  }

  // ── GET / ─────────────────────────────────────────────────────────
  @Get()
  @Roles(...ADMINS)
  @ApiOperation({ summary: 'Mapped projects, one row per project with its users' })
  @ApiResponse({ status: 200, type: UserProjectMappingListDto })
  async findAll(
    @Query() query: UserProjectMappingQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<UserProjectMappingListDto>> {
    return ResponseDto.success(await this.service.findAll(req.user.organizationId, query));
  }

  // Static routes are declared before ':projectId'.

  // ── GET /eligible-users ───────────────────────────────────────────
  @Get('eligible-users')
  @Roles(...ADMINS)
  @ApiOperation({ summary: 'Active internal users who can be assigned projects' })
  @ApiResponse({ status: 200, type: [EligibleUserDto] })
  async eligibleUsers(@Request() req: any): Promise<ResponseDto<EligibleUserDto[]>> {
    return ResponseDto.success(await this.service.eligibleUsers(req.user.organizationId));
  }

  // ── GET /my-projects ──────────────────────────────────────────────
  @Get('my-projects')
  @ApiOperation({ summary: 'Projects the signed-in user can see (mapped, managed or created; all for administrators)' })
  @ApiResponse({ status: 200, type: [MyProjectDto] })
  async myProjects(@Request() req: any): Promise<ResponseDto<MyProjectDto[]>> {
    return ResponseDto.success(await this.service.myProjects(req.user.organizationId, {
      userId: req.user.userId, email: req.user.email, role: req.user.role,
    }));
  }

  // ── GET /:projectId ───────────────────────────────────────────────
  @Get(':projectId')
  @Roles(...ADMINS)
  @ApiOperation({ summary: "A project's mapping with its assignment history" })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: 200, type: UserProjectMappingDetailDto })
  @ApiResponse({ status: 404, description: 'No users are mapped to this project' })
  async findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Request() req: any,
  ): Promise<ResponseDto<UserProjectMappingDetailDto>> {
    return ResponseDto.success(await this.service.findOne(req.user.organizationId, projectId));
  }

  // ── PUT /:projectId ───────────────────────────────────────────────
  @Put(':projectId')
  @Roles(...ADMINS)
  @ApiOperation({
    summary: "Set the project's user list",
    description: 'Users not yet mapped are added; mapped users left out are removed; the others are kept as they are.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiBody({ type: UpdateUserProjectMappingDto })
  @ApiResponse({ status: 200, type: UserProjectMappingDetailDto })
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateUserProjectMappingDto,
    @Request() req: any,
  ): Promise<ResponseDto<UserProjectMappingDetailDto>> {
    const result = await this.service.update(req.user.organizationId, projectId, dto, actorOf(req));
    return ResponseDto.updated(result, 'Project mapping updated');
  }

  // ── PATCH /:projectId/status ──────────────────────────────────────
  @Patch(':projectId/status')
  @Roles(...ADMINS)
  @ApiOperation({ summary: "Activate or deactivate every user of the project's mapping" })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiBody({ type: UpdateUserProjectMappingStatusDto })
  @ApiResponse({ status: 200, type: UserProjectMappingDetailDto })
  @ApiResponse({ status: 409, description: 'Already in that status' })
  async updateStatus(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateUserProjectMappingStatusDto,
    @Request() req: any,
  ): Promise<ResponseDto<UserProjectMappingDetailDto>> {
    const result = await this.service.updateStatus(req.user.organizationId, projectId, dto, actorOf(req));
    return ResponseDto.updated(result, `Project mapping ${dto.status === 'ACTIVE' ? 'activated' : 'deactivated'}`);
  }

  // ── DELETE /:projectId ────────────────────────────────────────────
  @Delete(':projectId')
  @Roles(...ADMINS)
  @ApiOperation({ summary: 'Remove every user from the project (soft delete; history is kept)' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.service.remove(req.user.organizationId, projectId, actorOf(req));
    return ResponseDto.deleted('Project mapping deleted');
  }
}
