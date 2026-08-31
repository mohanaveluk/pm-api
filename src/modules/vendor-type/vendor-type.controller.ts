import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiBody,
} from '@nestjs/swagger';
import { VendorTypeService } from './vendor-type.service';
import { CreateVendorTypeDto } from './dto/create-vendor-type.dto';
import { UpdateVendorTypeDto } from './dto/update-vendor-type.dto';
import { VendorTypeQueryDto } from './dto/vendor-type-query.dto';
import { VendorTypeListResponseDto, VendorTypeResponseDto } from './dto/vendor-type-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Vendor Types')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendor-types')
export class VendorTypeController {
  constructor(private readonly vendorTypeService: VendorTypeService) {}

  // ── POST /vendor-types ────────────────────────────────────────────
  @Post()
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new vendor type',
    description:
      'Code is server-generated as a per-organization sequence starting at 0001 ' +
      'and is immutable thereafter. Any code supplied in the body is ignored.',
  })
  @ApiBody({ type: CreateVendorTypeDto })
  @ApiResponse({ status: 201, description: 'Vendor type created', type: VendorTypeResponseDto })
  @ApiResponse({ status: 409, description: 'Vendor type code already exists in this organization' })
  async create(
    @Body() dto: CreateVendorTypeDto,
    @Request() req: any,
  ): Promise<ResponseDto<VendorTypeResponseDto>> {
    const vt = await this.vendorTypeService.create(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(vt, 'Vendor Type created successfully');
  }

  // ── GET /vendor-types ─────────────────────────────────────────────
  @Get()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'List all vendor types with pagination, search and filter' })
  @ApiResponse({ status: 200, description: 'Paginated vendor type list', type: VendorTypeListResponseDto })
  async findAll(
    @Query() query: VendorTypeQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<VendorTypeListResponseDto>> {
    const result = await this.vendorTypeService.findAll(req.user.organizationId, query);
    return ResponseDto.success(result);
  }

  // ── GET /vendor-types/active ──────────────────────────────────────
  @Get('active')
  @ApiOperation({ summary: 'Get all active vendor types (for dropdowns)' })
  @ApiResponse({ status: 200, description: 'Active vendor types', type: [VendorTypeResponseDto] })
  async findActive(
    @Request() req: any,
  ): Promise<ResponseDto<VendorTypeResponseDto[]>> {
    const items = await this.vendorTypeService.findActive(req.user.organizationId);
    return ResponseDto.success(items);
  }

  // ── GET /vendor-types/:id ─────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get vendor type by ID' })
  @ApiParam({ name: 'id', description: 'Vendor Type UUID' })
  @ApiResponse({ status: 200, description: 'Vendor type details', type: VendorTypeResponseDto })
  @ApiResponse({ status: 404, description: 'Vendor type not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<VendorTypeResponseDto>> {
    const vt = await this.vendorTypeService.findOne(req.user.organizationId, id);
    return ResponseDto.success(vt);
  }

  // ── PUT /vendor-types/:id ─────────────────────────────────────────
  @Put(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @ApiOperation({
    summary: 'Update vendor type',
    description: 'Code is server-generated and cannot be changed.',
  })
  @ApiParam({ name: 'id', description: 'Vendor Type UUID' })
  @ApiBody({ type: UpdateVendorTypeDto })
  @ApiResponse({ status: 200, description: 'Vendor type updated', type: VendorTypeResponseDto })
  @ApiResponse({ status: 404, description: 'Vendor type not found' })
  @ApiResponse({ status: 409, description: 'Code change attempted' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVendorTypeDto,
    @Request() req: any,
  ): Promise<ResponseDto<VendorTypeResponseDto>> {
    const vt = await this.vendorTypeService.update(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(vt, 'Vendor Type updated successfully');
  }

  // ── DELETE /vendor-types/:id ──────────────────────────────────────
  @Delete(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a vendor type' })
  @ApiParam({ name: 'id', description: 'Vendor Type UUID' })
  @ApiResponse({ status: 200, description: 'Vendor type deleted' })
  @ApiResponse({ status: 404, description: 'Vendor type not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.vendorTypeService.remove(req.user.organizationId, id, req.user.email);
    return ResponseDto.deleted('Vendor Type deleted successfully');
  }
}
