import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe,
  Patch, Post, Put, Query, Request, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';
import { MaterialRequisitionService } from './material-requisition.service';
import { CreateMaterialRequisitionDto } from './dto/create-material-requisition.dto';
import { UpdateMaterialRequisitionDto } from './dto/update-material-requisition.dto';
import { UpdateMaterialRequisitionStatusDto } from './dto/update-material-requisition-status.dto';
import {
  MaterialRequisitionQueryDto, ProjectItemsQueryDto, RequisitionMaterialQueryDto,
} from './dto/material-requisition-query.dto';
import {
  BomColumnsDto, BomPreviewDto, MaterialRequisitionListResponseDto,
  MaterialRequisitionResponseDto, RequisitionCandidateDto, RequisitionCandidateListDto,
} from './dto/material-requisition-response.dto';

const READERS = [
  'OrganizationAdmin', 'SuperAdmin', 'Manager', 'ProjectManager',
  'DepartmentManager', 'DisciplineLead', 'ProcurementManager', 'WarehouseManager',
];
const WRITERS = ['OrganizationAdmin', 'SuperAdmin', 'Manager', 'ProjectManager'];

const bomFile = () => FileInterceptor('file', { storage: memoryStorage() });
const bomFileBody = {
  schema: {
    type: 'object',
    properties: {
      file: { type: 'string', format: 'binary' },
      codeColumn: { type: 'string' },
      quantityColumn: { type: 'string' },
    },
  },
};

@ApiTags('Material Requisitions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('material-requisitions')
export class MaterialRequisitionController {
  constructor(private readonly service: MaterialRequisitionService) {}

  // ── POST /material-requisitions ────────────────────────────────────
  @Post()
  @Roles(...WRITERS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a material requisition',
    description:
      'Saves the header, its material lines and its documents. With `submit: true` the ' +
      'requisition goes straight to Under Review; otherwise it is kept as a draft. Lines with no ' +
      'quantity (empty or 0) are ignored. The client is read from the project.',
  })
  @ApiBody({ type: CreateMaterialRequisitionDto })
  @ApiResponse({ status: 201, type: MaterialRequisitionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid project, WBS, material, date or missing submit fields' })
  @ApiResponse({ status: 409, description: 'MR number already in use' })
  async create(
    @Body() dto: CreateMaterialRequisitionDto,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialRequisitionResponseDto>> {
    const mr = await this.service.create(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(
      mr,
      mr.status === 'DRAFT' ? 'Draft saved successfully' : 'Material requisition submitted for review',
    );
  }

  // ── GET /material-requisitions ─────────────────────────────────────
  @Get()
  @Roles(...READERS)
  @ApiOperation({ summary: 'List and search material requisitions' })
  @ApiResponse({ status: 200, type: MaterialRequisitionListResponseDto })
  async findAll(
    @Query() query: MaterialRequisitionQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialRequisitionListResponseDto>> {
    return ResponseDto.success(await this.service.findAll(req.user.organizationId, query));
  }

  // ── Static routes — declared before ':id' ──────────────────────────

  @Get('materials')
  @Roles(...WRITERS)
  @ApiOperation({
    summary: 'Material Master source: active materials to choose from',
    description: 'Every active material by default; filter by text, category, group or unit.',
  })
  @ApiResponse({ status: 200, type: RequisitionCandidateListDto })
  async searchMaterials(
    @Query() query: RequisitionMaterialQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<RequisitionCandidateListDto>> {
    return ResponseDto.success(await this.service.searchMaterials(req.user.organizationId, query));
  }

  @Get('project-items')
  @Roles(...WRITERS)
  @ApiOperation({
    summary: 'Project source: materials already requisitioned on a project (or WBS)',
    description: 'Each material with the total quantity requisitioned so far, as a reference.',
  })
  @ApiResponse({ status: 200, type: [RequisitionCandidateDto] })
  async getProjectItems(
    @Query() query: ProjectItemsQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<RequisitionCandidateDto[]>> {
    return ResponseDto.success(await this.service.getProjectItems(req.user.organizationId, query));
  }

  @Post('bom/columns')
  @Roles(...WRITERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'BOM / MTO source: read an uploaded file\'s columns (.xlsx or .csv, up to 5 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(bomFileBody)
  @ApiResponse({ status: 200, type: BomColumnsDto })
  @UseInterceptors(bomFile())
  async bomColumns(@UploadedFile() file: Express.Multer.File): Promise<ResponseDto<BomColumnsDto>> {
    if (!file) throw new BadRequestException('No file provided');
    return ResponseDto.success(await this.service.getBomColumns(file));
  }

  @Post('bom/preview')
  @Roles(...WRITERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'BOM / MTO source: match an uploaded file\'s rows to the Material Master',
    description: 'Writes nothing. Rows that cannot be used are returned with the reason.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody(bomFileBody)
  @ApiResponse({ status: 200, type: BomPreviewDto })
  @UseInterceptors(bomFile())
  async bomPreview(
    @UploadedFile() file: Express.Multer.File,
    @Body('codeColumn') codeColumn: string,
    @Body('quantityColumn') quantityColumn: string,
    @Request() req: any,
  ): Promise<ResponseDto<BomPreviewDto>> {
    if (!file) throw new BadRequestException('No file provided');
    return ResponseDto.success(
      await this.service.previewBom(req.user.organizationId, file, { codeColumn, quantityColumn }),
    );
  }

  @Post('documents/upload')
  @Roles(...WRITERS)
  @ApiOperation({
    summary: 'Upload a requisition document and get its URL',
    description: 'Stores the file in cloud storage; the requisition keeps only the URL.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(bomFile())
  async uploadDocument(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return this.service.uploadDocument(req.user.organizationId, file);
  }

  // ── GET /material-requisitions/:id ─────────────────────────────────
  @Get(':id')
  @Roles(...READERS)
  @ApiOperation({ summary: 'Get a requisition with its lines, documents, client and WBS details' })
  @ApiParam({ name: 'id', description: 'Material requisition UUID' })
  @ApiResponse({ status: 200, type: MaterialRequisitionResponseDto })
  @ApiResponse({ status: 404, description: 'Requisition not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialRequisitionResponseDto>> {
    return ResponseDto.success(await this.service.findOne(req.user.organizationId, id));
  }

  // ── PUT /material-requisitions/:id ─────────────────────────────────
  @Put(':id')
  @Roles(...WRITERS)
  @ApiOperation({
    summary: 'Update a draft requisition',
    description:
      'Only a draft can be changed. `items` and `documents`, when present, are the complete sets. ' +
      '`submit: true` saves and submits in one call.',
  })
  @ApiParam({ name: 'id', description: 'Material requisition UUID' })
  @ApiBody({ type: UpdateMaterialRequisitionDto })
  @ApiResponse({ status: 200, type: MaterialRequisitionResponseDto })
  @ApiResponse({ status: 409, description: 'The requisition has already been submitted' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaterialRequisitionDto,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialRequisitionResponseDto>> {
    const mr = await this.service.update(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(
      mr,
      mr.status === 'DRAFT' ? 'Draft saved successfully' : 'Material requisition submitted for review',
    );
  }

  // ── PATCH /material-requisitions/:id/submit ────────────────────────
  @Patch(':id/submit')
  @Roles(...WRITERS)
  @ApiOperation({ summary: 'Submit a draft — it goes to Under Review' })
  @ApiParam({ name: 'id', description: 'Material requisition UUID' })
  @ApiResponse({ status: 200, type: MaterialRequisitionResponseDto })
  @ApiResponse({ status: 400, description: 'Missing WBS, required-on-site date or materials' })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialRequisitionResponseDto>> {
    const mr = await this.service.submit(req.user.organizationId, id, req.user.email);
    return ResponseDto.updated(mr, 'Material requisition submitted for review');
  }

  // ── PATCH /material-requisitions/:id/status ────────────────────────
  @Patch(':id/status')
  @Roles(...WRITERS)
  @ApiOperation({
    summary: 'Hold, release, disable, re-enable or mark a submitted requisition obsolete',
    description: 'A draft cannot change status — edit, submit or delete it.',
  })
  @ApiParam({ name: 'id', description: 'Material requisition UUID' })
  @ApiResponse({ status: 200, type: MaterialRequisitionResponseDto })
  @ApiResponse({ status: 409, description: 'The move is not allowed from the current status' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaterialRequisitionStatusDto,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialRequisitionResponseDto>> {
    const mr = await this.service.changeStatus(req.user.organizationId, id, dto.status, req.user.email);
    return ResponseDto.updated(mr, 'Requisition status updated');
  }

  // ── DELETE /material-requisitions/:id ──────────────────────────────
  @Delete(':id')
  @Roles(...WRITERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a draft requisition (soft delete)' })
  @ApiParam({ name: 'id', description: 'Material requisition UUID' })
  @ApiResponse({ status: 200, description: 'Draft deleted' })
  @ApiResponse({ status: 409, description: 'Only a draft can be deleted' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.service.remove(req.user.organizationId, id, req.user.email);
    return ResponseDto.deleted('Draft deleted successfully');
  }
}
