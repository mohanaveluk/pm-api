import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards, Request,
  HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiBody, ApiQuery,
} from '@nestjs/swagger';
import { UnitOfMeasurementService } from './unit-of-measurement.service';
import { CreateUnitOfMeasurementDto } from './dto/create-unit-of-measurement.dto';
import { UpdateUnitOfMeasurementDto } from './dto/update-unit-of-measurement.dto';
import { UnitOfMeasurementQueryDto } from './dto/unit-of-measurement-query.dto';
import {
  UnitOfMeasurementResponseDto,
  UnitOfMeasurementDropdownDto,
  UnitOfMeasurementListResponseDto,
} from './dto/unit-of-measurement-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';
import { UomType } from './enums/uom-type.enum';

@ApiTags('Units of Measurement')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('unit-of-measurements')
export class UnitOfMeasurementController {
  constructor(private readonly service: UnitOfMeasurementService) {}

  // ── POST / ────────────────────────────────────────────────────────

  @Post()
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a Unit of Measurement',
    description:
      'Creates a new UOM master record scoped to the authenticated organization. ' +
      'Code is server-generated as a per-organization sequence starting at 0001 and is immutable. ' +
      'Both code and name must be unique within the organization.',
  })
  @ApiBody({ type: CreateUnitOfMeasurementDto })
  @ApiResponse({ status: 201, description: 'UOM created',                                    type: UnitOfMeasurementResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error'                                                                   })
  @ApiResponse({ status: 409, description: 'Code or name already exists in this organization'                                   })
  async create(
    @Body() dto: CreateUnitOfMeasurementDto,
    @Request() req: any,
  ): Promise<ResponseDto<UnitOfMeasurementResponseDto>> {
    const uom = await this.service.create(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(uom, 'Unit of Measurement created successfully');
  }

  // ── GET /active — static route BEFORE /:id ───────────────────────

  @Get('active')
  @ApiOperation({
    summary: 'Get active Units of Measurement (dropdown)',
    description:
      'Returns a slim list of active, non-deleted UOMs ordered by displayOrder then name. ' +
      'Pass uomType to scope the list to a measurement family (WEIGHT, VOLUME, LENGTH, …) — ' +
      'the primary use case for cascading dropdowns in Material Master and PR/PO forms.',
  })
  @ApiQuery({
    name: 'uomType', required: false, enum: UomType,
    description: 'Filter by UOM type / measurement family',
  })
  @ApiResponse({ status: 200, description: 'Active UOMs', type: [UnitOfMeasurementDropdownDto] })
  async findActive(
    @Query('uomType') uomType: UomType | undefined,
    @Request() req: any,
  ): Promise<ResponseDto<UnitOfMeasurementDropdownDto[]>> {
    const items = await this.service.findActive(req.user.organizationId, uomType);
    return ResponseDto.success(items);
  }

  // ── GET / ─────────────────────────────────────────────────────────

  @Get()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'List Units of Measurement',
    description:
      'Returns a paginated, filterable, and searchable list of UOM master records. ' +
      'Supports filtering by uomType, isActive, and free-text search across code, name, symbol, and shortName.',
  })
  @ApiResponse({ status: 200, description: 'Paginated UOM list', type: UnitOfMeasurementListResponseDto })
  async findAll(
    @Query() query: UnitOfMeasurementQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<UnitOfMeasurementListResponseDto>> {
    const result = await this.service.findAll(req.user.organizationId, query);
    return ResponseDto.success(result);
  }

  // ── GET /:id ──────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get Unit of Measurement by ID' })
  @ApiParam({ name: 'id', description: 'UOM UUID' })
  @ApiResponse({ status: 200, description: 'UOM details',   type: UnitOfMeasurementResponseDto })
  @ApiResponse({ status: 404, description: 'UOM not found'                                      })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<UnitOfMeasurementResponseDto>> {
    const uom = await this.service.findOne(req.user.organizationId, id);
    return ResponseDto.success(uom);
  }

  // ── PUT /:id ──────────────────────────────────────────────────────

  @Put(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @ApiOperation({
    summary: 'Update Unit of Measurement',
    description:
      'Updates allowed fields. Code is immutable and will be rejected if supplied. ' +
      'Name must remain unique within the organization.',
  })
  @ApiParam({ name: 'id', description: 'UOM UUID' })
  @ApiBody({ type: UpdateUnitOfMeasurementDto })
  @ApiResponse({ status: 200, description: 'UOM updated', type: UnitOfMeasurementResponseDto })
  @ApiResponse({ status: 404, description: 'UOM not found'                                    })
  @ApiResponse({ status: 409, description: 'Name already exists or code change attempted'     })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnitOfMeasurementDto,
    @Request() req: any,
  ): Promise<ResponseDto<UnitOfMeasurementResponseDto>> {
    const uom = await this.service.update(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(uom, 'Unit of Measurement updated successfully');
  }

  // ── DELETE /:id ───────────────────────────────────────────────────

  @Delete(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete a Unit of Measurement',
    description:
      'Marks the UOM as deleted (isDeleted=true, isActive=false). ' +
      'UOMs referenced by Material Master, PR, PO, or Inventory records cannot be deleted.',
  })
  @ApiParam({ name: 'id', description: 'UOM UUID' })
  @ApiResponse({ status: 200, description: 'UOM deleted'                             })
  @ApiResponse({ status: 404, description: 'UOM not found'                           })
  @ApiResponse({ status: 409, description: 'UOM is currently referenced by downstream data' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.service.remove(req.user.organizationId, id, req.user.email);
    return ResponseDto.deleted('Unit of Measurement deleted successfully');
  }
}
