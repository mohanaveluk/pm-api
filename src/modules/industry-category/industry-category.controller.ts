import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
  HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiBody,
} from '@nestjs/swagger';
import { IndustryCategoryService } from './industry-category.service';
import { CreateIndustryCategoryDto } from './dto/create-industry-category.dto';
import { UpdateIndustryCategoryDto } from './dto/update-industry-category.dto';
import { IndustryCategoryQueryDto } from './dto/industry-category-query.dto';
import {
  IndustryCategoryResponseDto,
  IndustryCategoryDropdownDto,
  IndustryCategoryListResponseDto,
} from './dto/industry-category-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Industry Categories')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('industry-categories')
export class IndustryCategoryController {
  constructor(private readonly service: IndustryCategoryService) {}

  // ── POST / ────────────────────────────────────────────────────────

  @Post()
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an Industry Category',
    description:
      'Creates a new industry/business classification scoped to the authenticated organization. ' +
      'Code is auto-uppercased and immutable after creation.',
  })
  @ApiBody({ type: CreateIndustryCategoryDto })
  @ApiResponse({ status: 201, description: 'Category created',                  type: IndustryCategoryResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error'                                                     })
  @ApiResponse({ status: 409, description: 'Code or name already exists in this organization'                     })
  async create(
    @Body() dto: CreateIndustryCategoryDto,
    @Request() req: any,
  ): Promise<ResponseDto<IndustryCategoryResponseDto>> {
    const ic = await this.service.create(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(ic, 'Industry Category created successfully');
  }

  // ── GET /active — static route BEFORE /:id ───────────────────────

  @Get('active')
  @ApiOperation({
    summary: 'Get active Industry Categories (dropdown)',
    description:
      'Returns a slim list of active, non-deleted categories ordered by displayOrder then name. ' +
      'Intended for dropdowns and autocomplete widgets.',
  })
  @ApiResponse({ status: 200, description: 'Active categories', type: [IndustryCategoryDropdownDto] })
  async findActive(
    @Request() req: any,
  ): Promise<ResponseDto<IndustryCategoryDropdownDto[]>> {
    const items = await this.service.findActive(req.user.organizationId);
    return ResponseDto.success(items);
  }

  // ── GET / ─────────────────────────────────────────────────────────

  @Get()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'List Industry Categories',
    description: 'Returns a paginated, filterable, and searchable list of industry categories for the organization.',
  })
  @ApiResponse({ status: 200, description: 'Paginated category list', type: IndustryCategoryListResponseDto })
  async findAll(
    @Query() query: IndustryCategoryQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<IndustryCategoryListResponseDto>> {
    const result = await this.service.findAll(req.user.organizationId, query);
    return ResponseDto.success(result);
  }

  // ── GET /:id ──────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get Industry Category by ID' })
  @ApiParam({ name: 'id', description: 'Industry Category UUID' })
  @ApiResponse({ status: 200, description: 'Category details',  type: IndustryCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Category not found'                                   })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<IndustryCategoryResponseDto>> {
    const ic = await this.service.findOne(req.user.organizationId, id);
    return ResponseDto.success(ic);
  }

  // ── PUT /:id ──────────────────────────────────────────────────────

  @Put(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @ApiOperation({
    summary: 'Update Industry Category',
    description:
      'Updates allowed fields. Code is immutable and will be rejected if supplied. ' +
      'isSystem flag cannot be changed via this endpoint.',
  })
  @ApiParam({ name: 'id', description: 'Industry Category UUID' })
  @ApiBody({ type: UpdateIndustryCategoryDto })
  @ApiResponse({ status: 200, description: 'Category updated', type: IndustryCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Category not found'                                  })
  @ApiResponse({ status: 409, description: 'Name already exists or code change attempted'        })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIndustryCategoryDto,
    @Request() req: any,
  ): Promise<ResponseDto<IndustryCategoryResponseDto>> {
    const ic = await this.service.update(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(ic, 'Industry Category updated successfully');
  }

  // ── PATCH /:id/enable — static suffix BEFORE generic /:id ────────

  @Patch(':id/enable')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable an Industry Category' })
  @ApiParam({ name: 'id', description: 'Industry Category UUID' })
  @ApiResponse({ status: 200, description: 'Category enabled', type: IndustryCategoryResponseDto })
  @ApiResponse({ status: 400, description: 'Already active'                                      })
  @ApiResponse({ status: 404, description: 'Category not found'                                  })
  async enable(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<IndustryCategoryResponseDto>> {
    const ic = await this.service.enable(req.user.organizationId, id, req.user.email);
    return ResponseDto.updated(ic, 'Industry Category enabled');
  }

  // ── PATCH /:id/disable ────────────────────────────────────────────

  @Patch(':id/disable')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Disable an Industry Category',
    description:
      'Deactivates the category. The operation is blocked when the category is actively ' +
      'referenced by Project, Department, Discipline, Activity, or Supplier records.',
  })
  @ApiParam({ name: 'id', description: 'Industry Category UUID' })
  @ApiResponse({ status: 200, description: 'Category disabled', type: IndustryCategoryResponseDto })
  @ApiResponse({ status: 400, description: 'Already inactive'                                     })
  @ApiResponse({ status: 404, description: 'Category not found'                                   })
  @ApiResponse({ status: 409, description: 'Category is currently referenced by downstream data'  })
  async disable(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<IndustryCategoryResponseDto>> {
    const ic = await this.service.disable(req.user.organizationId, id, req.user.email);
    return ResponseDto.updated(ic, 'Industry Category disabled');
  }

  // ── DELETE /:id ───────────────────────────────────────────────────

  @Delete(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete an Industry Category',
    description:
      'Marks the category as deleted (isDeleted=true, isActive=false). ' +
      'System categories and categories in use cannot be deleted.',
  })
  @ApiParam({ name: 'id', description: 'Industry Category UUID' })
  @ApiResponse({ status: 200, description: 'Category deleted'                              })
  @ApiResponse({ status: 404, description: 'Category not found'                            })
  @ApiResponse({ status: 409, description: 'System category or category currently in use'  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.service.remove(req.user.organizationId, id, req.user.email);
    return ResponseDto.deleted('Industry Category deleted successfully');
  }
}
