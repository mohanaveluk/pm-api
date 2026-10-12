import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiBody,
} from '@nestjs/swagger';
import { WbsCostCodeService } from './wbs-cost-code.service';
import { CreateWbsCostCodeDto } from './dto/create-wbs-cost-code.dto';
import { UpdateWbsCostCodeDto } from './dto/update-wbs-cost-code.dto';
import { WbsCostCodeQueryDto } from './dto/wbs-cost-code-query.dto';
import { WbsCostCodeListResponseDto, WbsCostCodeResponseDto } from './dto/wbs-cost-code-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('WBS / Cost Codes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('wbs-cost-codes')
export class WbsCostCodeController {
  constructor(private readonly wbsCostCodeService: WbsCostCodeService) {}

  // ── POST /wbs-cost-codes ────────────────────────────────────────────
  @Post()
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new WBS / cost code',
    description:
      'Code is server-generated as a per-organization sequence starting at 0001 ' +
      'and is immutable thereafter. Any code supplied in the body is ignored.',
  })
  @ApiBody({ type: CreateWbsCostCodeDto })
  @ApiResponse({ status: 201, description: 'WBS / Cost code created', type: WbsCostCodeResponseDto })
  @ApiResponse({ status: 409, description: 'WBS / Cost code code already exists in this organization' })
  async create(
    @Body() dto: CreateWbsCostCodeDto,
    @Request() req: any,
  ): Promise<ResponseDto<WbsCostCodeResponseDto>> {
    const item = await this.wbsCostCodeService.create(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(item, 'WBS / Cost Code created successfully');
  }

  // ── GET /wbs-cost-codes ─────────────────────────────────────────────
  @Get()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'List all WBS / cost codes with pagination, search and filter' })
  @ApiResponse({ status: 200, description: 'Paginated WBS / cost code list', type: WbsCostCodeListResponseDto })
  async findAll(
    @Query() query: WbsCostCodeQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<WbsCostCodeListResponseDto>> {
    const result = await this.wbsCostCodeService.findAll(req.user.organizationId, query);
    return ResponseDto.success(result);
  }

  // ── GET /wbs-cost-codes/active ──────────────────────────────────────
  @Get('active')
  @ApiOperation({
    summary: 'Get all active WBS / cost codes (for dropdowns)',
    description: 'Pass projectId to list only the WBS / cost codes of one project.',
  })
  @ApiResponse({ status: 200, description: 'Active WBS / cost codes', type: [WbsCostCodeResponseDto] })
  async findActive(
    @Request() req: any,
    @Query('projectId', new ParseUUIDPipe({ optional: true })) projectId?: string,
  ): Promise<ResponseDto<WbsCostCodeResponseDto[]>> {
    const items = await this.wbsCostCodeService.findActive(req.user.organizationId, projectId);
    return ResponseDto.success(items);
  }

  // ── GET /wbs-cost-codes/:id ─────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get WBS / cost code by ID' })
  @ApiParam({ name: 'id', description: 'WBS / Cost Code UUID' })
  @ApiResponse({ status: 200, description: 'WBS / Cost code details', type: WbsCostCodeResponseDto })
  @ApiResponse({ status: 404, description: 'WBS / Cost code not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<WbsCostCodeResponseDto>> {
    const item = await this.wbsCostCodeService.findOne(req.user.organizationId, id);
    return ResponseDto.success(item);
  }

  // ── PUT /wbs-cost-codes/:id ─────────────────────────────────────────
  @Put(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @ApiOperation({
    summary: 'Update WBS / cost code',
    description: 'Code is server-generated and cannot be changed.',
  })
  @ApiParam({ name: 'id', description: 'WBS / Cost Code UUID' })
  @ApiBody({ type: UpdateWbsCostCodeDto })
  @ApiResponse({ status: 200, description: 'WBS / Cost code updated', type: WbsCostCodeResponseDto })
  @ApiResponse({ status: 404, description: 'WBS / Cost code not found' })
  @ApiResponse({ status: 409, description: 'Code change attempted' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWbsCostCodeDto,
    @Request() req: any,
  ): Promise<ResponseDto<WbsCostCodeResponseDto>> {
    const item = await this.wbsCostCodeService.update(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(item, 'WBS / Cost Code updated successfully');
  }

  // ── DELETE /wbs-cost-codes/:id ──────────────────────────────────────
  @Delete(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a WBS / cost code' })
  @ApiParam({ name: 'id', description: 'WBS / Cost Code UUID' })
  @ApiResponse({ status: 200, description: 'WBS / Cost code deleted' })
  @ApiResponse({ status: 404, description: 'WBS / Cost code not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.wbsCostCodeService.remove(req.user.organizationId, id, req.user.email);
    return ResponseDto.deleted('WBS / Cost Code deleted successfully');
  }
}
