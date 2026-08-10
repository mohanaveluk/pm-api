import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
  HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiBody,
} from '@nestjs/swagger';
import { MaterialCategoryService } from './material-category.service';
import { CreateMaterialCategoryDto } from './dto/create-material-category.dto';
import { UpdateMaterialCategoryDto } from './dto/update-material-category.dto';
import { MaterialCategoryQueryDto } from './dto/material-category-query.dto';
import {
  MaterialCategoryResponseDto,
  MaterialCategoryDropdownDto,
  MaterialCategoryListResponseDto,
} from './dto/material-category-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Material Categories')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('material-categories')
export class MaterialCategoryController {
  constructor(private readonly service: MaterialCategoryService) {}

  // ── POST / ────────────────────────────────────────────────────────

  @Post()
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a Material Category',
    description:
      'Creates a new material classification category scoped to the authenticated organization. ' +
      'Code is auto-uppercased and immutable after creation.',
  })
  @ApiBody({ type: CreateMaterialCategoryDto })
  @ApiResponse({ status: 201, description: 'Category created',                   type: MaterialCategoryResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error'                                                      })
  @ApiResponse({ status: 409, description: "Code or name already exists in this organization"                      })
  async create(
    @Body() dto: CreateMaterialCategoryDto,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialCategoryResponseDto>> {
    const mc = await this.service.create(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(mc, 'Material Category created successfully');
  }

  // ── GET /active — static route BEFORE /:id ───────────────────────

  @Get('active')
  @ApiOperation({
    summary: 'Get active Material Categories (dropdown)',
    description:
      'Returns a slim list of active, non-deleted categories ordered by displayOrder then name. ' +
      'Intended for dropdowns and autocomplete widgets.',
  })
  @ApiResponse({ status: 200, description: 'Active categories', type: [MaterialCategoryDropdownDto] })
  async findActive(
    @Request() req: any,
  ): Promise<ResponseDto<MaterialCategoryDropdownDto[]>> {
    const items = await this.service.findActive(req.user.organizationId);
    return ResponseDto.success(items);
  }

  // ── GET / ─────────────────────────────────────────────────────────

  @Get()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'List Material Categories',
    description: 'Returns a paginated, filterable, and searchable list of material categories for the organization.',
  })
  @ApiResponse({ status: 200, description: 'Paginated category list', type: MaterialCategoryListResponseDto })
  async findAll(
    @Query() query: MaterialCategoryQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialCategoryListResponseDto>> {
    const result = await this.service.findAll(req.user.organizationId, query);
    return ResponseDto.success(result);
  }

  // ── GET /:id ──────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get Material Category by ID' })
  @ApiParam({ name: 'id', description: 'Material Category UUID' })
  @ApiResponse({ status: 200, description: 'Category details',   type: MaterialCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Category not found'                                    })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialCategoryResponseDto>> {
    const mc = await this.service.findOne(req.user.organizationId, id);
    return ResponseDto.success(mc);
  }

  // ── PUT /:id ──────────────────────────────────────────────────────

  @Put(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @ApiOperation({
    summary: 'Update Material Category',
    description:
      'Updates allowed fields. Code is immutable and will be rejected if supplied. ' +
      'isSystem flag cannot be changed via this endpoint.',
  })
  @ApiParam({ name: 'id', description: 'Material Category UUID' })
  @ApiBody({ type: UpdateMaterialCategoryDto })
  @ApiResponse({ status: 200, description: 'Category updated', type: MaterialCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Category not found'                                  })
  @ApiResponse({ status: 409, description: 'Name already exists or code change attempted'        })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaterialCategoryDto,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialCategoryResponseDto>> {
    const mc = await this.service.update(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(mc, 'Material Category updated successfully');
  }

  // ── PATCH /:id/enable — static suffix BEFORE generic /:id ────────

  @Patch(':id/enable')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable a Material Category' })
  @ApiParam({ name: 'id', description: 'Material Category UUID' })
  @ApiResponse({ status: 200, description: 'Category enabled', type: MaterialCategoryResponseDto })
  @ApiResponse({ status: 400, description: 'Already active'                                      })
  @ApiResponse({ status: 404, description: 'Category not found'                                  })
  async enable(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialCategoryResponseDto>> {
    const mc = await this.service.enable(req.user.organizationId, id, req.user.email);
    return ResponseDto.updated(mc, 'Material Category enabled');
  }

  // ── PATCH /:id/disable ────────────────────────────────────────────

  @Patch(':id/disable')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Disable a Material Category',
    description:
      'Deactivates the category. The operation is blocked when the category is actively ' +
      'referenced by Material Master, PR, PO, or Inventory records.',
  })
  @ApiParam({ name: 'id', description: 'Material Category UUID' })
  @ApiResponse({ status: 200, description: 'Category disabled', type: MaterialCategoryResponseDto })
  @ApiResponse({ status: 400, description: 'Already inactive'                                     })
  @ApiResponse({ status: 404, description: 'Category not found'                                   })
  @ApiResponse({ status: 409, description: 'Category is currently referenced by downstream data'  })
  async disable(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialCategoryResponseDto>> {
    const mc = await this.service.disable(req.user.organizationId, id, req.user.email);
    return ResponseDto.updated(mc, 'Material Category disabled');
  }

  // ── DELETE /:id ───────────────────────────────────────────────────

  @Delete(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete a Material Category',
    description:
      'Marks the category as deleted (isDeleted=true, isActive=false). ' +
      'System categories and categories in use cannot be deleted.',
  })
  @ApiParam({ name: 'id', description: 'Material Category UUID' })
  @ApiResponse({ status: 200, description: 'Category deleted'                                    })
  @ApiResponse({ status: 404, description: 'Category not found'                                  })
  @ApiResponse({ status: 409, description: 'System category or category currently in use'        })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.service.remove(req.user.organizationId, id, req.user.email);
    return ResponseDto.deleted('Material Category deleted successfully');
  }
}
