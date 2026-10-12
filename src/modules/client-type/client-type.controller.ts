import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiBody,
} from '@nestjs/swagger';
import { ClientTypeService } from './client-type.service';
import { CreateClientTypeDto } from './dto/create-client-type.dto';
import { UpdateClientTypeDto } from './dto/update-client-type.dto';
import { ClientTypeQueryDto } from './dto/client-type-query.dto';
import { ClientTypeListResponseDto, ClientTypeResponseDto } from './dto/client-type-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Client Types')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('client-types')
export class ClientTypeController {
  constructor(private readonly clientTypeService: ClientTypeService) {}

  // ── POST /client-types ────────────────────────────────────────────
  @Post()
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new client type',
    description:
      'Code is server-generated as a per-organization sequence starting at 0001 ' +
      'and is immutable thereafter. Any code supplied in the body is ignored.',
  })
  @ApiBody({ type: CreateClientTypeDto })
  @ApiResponse({ status: 201, description: 'Client type created', type: ClientTypeResponseDto })
  @ApiResponse({ status: 409, description: 'Client type code already exists in this organization' })
  async create(
    @Body() dto: CreateClientTypeDto,
    @Request() req: any,
  ): Promise<ResponseDto<ClientTypeResponseDto>> {
    const ct = await this.clientTypeService.create(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(ct, 'Client Type created successfully');
  }

  // ── GET /client-types ─────────────────────────────────────────────
  @Get()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'List all client types with pagination, search and filter' })
  @ApiResponse({ status: 200, description: 'Paginated client type list', type: ClientTypeListResponseDto })
  async findAll(
    @Query() query: ClientTypeQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<ClientTypeListResponseDto>> {
    const result = await this.clientTypeService.findAll(req.user.organizationId, query);
    return ResponseDto.success(result);
  }

  // ── GET /client-types/active ──────────────────────────────────────
  @Get('active')
  @ApiOperation({ summary: 'Get all active client types (for dropdowns)' })
  @ApiResponse({ status: 200, description: 'Active client types', type: [ClientTypeResponseDto] })
  async findActive(
    @Request() req: any,
  ): Promise<ResponseDto<ClientTypeResponseDto[]>> {
    const items = await this.clientTypeService.findActive(req.user.organizationId);
    return ResponseDto.success(items);
  }

  // ── GET /client-types/:id ─────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get client type by ID' })
  @ApiParam({ name: 'id', description: 'Client Type UUID' })
  @ApiResponse({ status: 200, description: 'Client type details', type: ClientTypeResponseDto })
  @ApiResponse({ status: 404, description: 'Client type not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<ClientTypeResponseDto>> {
    const ct = await this.clientTypeService.findOne(req.user.organizationId, id);
    return ResponseDto.success(ct);
  }

  // ── PUT /client-types/:id ─────────────────────────────────────────
  @Put(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @ApiOperation({
    summary: 'Update client type',
    description: 'Code is server-generated and cannot be changed.',
  })
  @ApiParam({ name: 'id', description: 'Client Type UUID' })
  @ApiBody({ type: UpdateClientTypeDto })
  @ApiResponse({ status: 200, description: 'Client type updated', type: ClientTypeResponseDto })
  @ApiResponse({ status: 404, description: 'Client type not found' })
  @ApiResponse({ status: 409, description: 'Code change attempted' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientTypeDto,
    @Request() req: any,
  ): Promise<ResponseDto<ClientTypeResponseDto>> {
    const ct = await this.clientTypeService.update(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(ct, 'Client Type updated successfully');
  }

  // ── DELETE /client-types/:id ──────────────────────────────────────
  @Delete(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a client type' })
  @ApiParam({ name: 'id', description: 'Client Type UUID' })
  @ApiResponse({ status: 200, description: 'Client type deleted' })
  @ApiResponse({ status: 404, description: 'Client type not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.clientTypeService.remove(req.user.organizationId, id, req.user.email);
    return ResponseDto.deleted('Client Type deleted successfully');
  }
}
