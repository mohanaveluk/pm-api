import {
  BadRequestException,
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Put, Query, Request, UploadedFile, UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiQuery,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard }   from 'src/common/guards/roles.guard';
import { Roles }        from 'src/common/decorators/roles.decorator';
import { ResponseDto }  from 'src/common/dto/response.dto';

import { MaterialService }      from './material.service';
import { CreateMaterialDto }    from './dto/create-material.dto';
import { UpdateMaterialDto }    from './dto/update-material.dto';
import { MaterialQueryDto }     from './dto/material-query.dto';
import {
  AddMaterialDocumentDto,
  MaterialDocumentQueryDto,
  MaterialDocumentResponseDto,
  MarkPurchaseOrderIssuedDto,
} from './dto/material-document.dto';
import { memoryStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Material Master')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('materials')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  // ── Static routes first (must precede /:id) ───────────────────────────

  @Get('active')
  @Roles('admin', 'manager', 'user')
  @ApiOperation({ summary: 'Get active materials for dropdown/lookup' })
  @ApiQuery({ name: 'materialCategoryId', required: false })
  @ApiQuery({ name: 'materialGroupId',    required: false })
  @ApiResponse({ status: 200, description: 'Active materials returned' })
  async findActive(
    @Request() req,
    @Query('materialCategoryId') materialCategoryId?: string,
    @Query('materialGroupId')    materialGroupId?: string,
  ) {
    const data = await this.materialService.findActive(
      req.user.organizationId,
      materialCategoryId,
      materialGroupId,
    );
    return ResponseDto.success(data);
  }

  // ── Collection routes ─────────────────────────────────────────────────

  @Post()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'Create a new material (code is auto-generated)' })
  @ApiResponse({ status: 201, description: 'Material created' })
  async create(@Body() dto: CreateMaterialDto, @Request() req) {
    const data = await this.materialService.create(dto, req.user.organizationId, req.user.email);
    return ResponseDto.created(data, 'Material created successfully');
  }

  @Get()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'List materials with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated material list' })
  async findAll(@Query() query: MaterialQueryDto, @Request() req) {
    const data = await this.materialService.findAll(query, req.user.organizationId);
    return ResponseDto.success(data);
  }

  // ── Item routes ───────────────────────────────────────────────────────

  @Get(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'Get a single material by ID' })
  @ApiParam({ name: 'id', description: 'Material UUID' })
  @ApiResponse({ status: 200, description: 'Material detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    const data = await this.materialService.findOne(id, req.user.organizationId);
    return ResponseDto.success(data);
  }

  // ── Documents ─────────────────────────────────────────────────────────
  //
  // Documents live in material_documents, versioned. Adding one is the single
  // mutation that survives the purchase-order lock.

  @Get(':id/documents')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager', 'user')
  @ApiOperation({
    summary: 'List a material\'s documents',
    description:
      'Returns the current version of each document by default. Pass ' +
      'includeSuperseded=true for the full version history, or documentType to filter.',
  })
  @ApiParam({ name: 'id', description: 'Material UUID' })
  @ApiResponse({ status: 200, description: 'Material documents', type: [MaterialDocumentResponseDto] })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async findDocuments(
    @Param('id') id: string,
    @Query() query: MaterialDocumentQueryDto,
    @Request() req,
  ) {
    const data = await this.materialService.findDocuments(id, req.user.organizationId, query);
    return ResponseDto.success(data);
  }

  @Post(':id/documents')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a document to a material (allowed even when PO-locked)',
    description:
      'Files a new document against the material. This is deliberately permitted after ' +
      'a purchase order has locked the material — mill certificates, inspection reports, ' +
      'and revised drawings keep arriving through fabrication and delivery.\n\n' +
      'Nothing is ever overwritten. Pass supersedesId to file the upload as the next ' +
      'version of an existing document (the superseded row is retained, flagged ' +
      'inactive). Omit it to start a new document at version 1 — which is how a second ' +
      'photo is added alongside the first. Single-instance types (datasheet, drawing, ' +
      'technical spec, vendor quotation, MSDS) auto-supersede their current version.',
  })
  @ApiParam({ name: 'id', description: 'Material UUID' })
  @ApiBody({ type: AddMaterialDocumentDto })
  @ApiResponse({ status: 201, description: 'Document filed', type: MaterialDocumentResponseDto })
  @ApiResponse({ status: 404, description: 'Material or superseded document not found'         })
  @ApiResponse({ status: 409, description: 'The referenced document is already superseded'     })
  @ApiResponse({ status: 422, description: 'Document type does not match the superseded row'   })
  async addDocument(
    @Param('id') id: string,
    @Body() dto: AddMaterialDocumentDto,
    @Request() req,
  ) {
    const data = await this.materialService.addDocument(
      id, dto, req.user.organizationId, req.user.email,
    );
    return ResponseDto.created(data, 'Document added successfully');
  }

  @Delete(':id/documents/:documentId')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete a material document',
    description:
      'Whether this is allowed depends on WHEN the document was filed relative to the ' +
      'purchase order:\n\n' +
      '• filed BEFORE the PO was issued — refused (409). It is part of what the supplier ' +
      'was contracted against, so it stays in the record.\n' +
      '• filed AFTER the PO was issued — allowed. It was not part of the order basis.\n' +
      '• material not PO-locked — allowed.\n\n' +
      'A material whose lock flag is set but carries no issue timestamp fails closed: ' +
      'every document on it is treated as predating the order.',
  })
  @ApiParam({ name: 'id',         description: 'Material UUID' })
  @ApiParam({ name: 'documentId', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Document deleted'                          })
  @ApiResponse({ status: 404, description: 'Material or document not found'            })
  @ApiResponse({ status: 409, description: 'Material is locked by a purchase order'    })
  async removeDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Request() req,
  ) {
    await this.materialService.removeDocument(
      id, documentId, req.user.organizationId, req.user.email,
    );
    return ResponseDto.deleted('Document deleted successfully');
  }

  // ── Purchase-order lock ───────────────────────────────────────────────

  @Patch(':id/purchase-order-issued')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark a material as locked by an issued purchase order',
    description:
      'Sets isPurchaseOrderIssued=true, freezing the material\'s master data: update and ' +
      'delete are refused from then on, and documents can no longer be deleted — only ' +
      'added as new versions. Cloning stays available as the route to a changed ' +
      'specification.\n\n' +
      'This is the integration point the Purchase Order module will call when an order ' +
      'is issued and confirmed. Idempotent: a second call leaves the original locking ' +
      'reference and timestamp intact.',
  })
  @ApiParam({ name: 'id', description: 'Material UUID' })
  @ApiBody({ type: MarkPurchaseOrderIssuedDto })
  @ApiResponse({ status: 200, description: 'Material locked' })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async markPurchaseOrderIssued(
    @Param('id') id: string,
    @Body() dto: MarkPurchaseOrderIssuedDto,
    @Request() req,
  ) {
    const data = await this.materialService.markPurchaseOrderIssued(
      id, req.user.organizationId, dto.purchaseOrderReference, req.user.email,
    );
    return ResponseDto.updated(data, 'Material marked as purchase-order issued');
  }

  @Post(':id/clone')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Clone an existing material',
    description:
      'Creates a copy of the material. The clone gets a new id, a new dguid, and the ' +
      'next sequential code in the same category (a clone of RAW000007 becomes RAW000008). ' +
      'Every other field — descriptions, category, group, UOM, technical spec, procurement, ' +
      'inventory, quality, accounting, safety, logistics, and document URLs — is copied ' +
      'unchanged. Audit fields are stamped with the calling user.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the material to clone' })
  @ApiResponse({ status: 201, description: 'Clone created, returns the new material' })
  @ApiResponse({ status: 404, description: 'Source material not found in this organization' })
  @ApiResponse({ status: 409, description: 'Category, group, or UOM has since been deactivated' })
  async clone(@Param('id') id: string, @Request() req) {
    const data = await this.materialService.clone(id, req.user.organizationId, req.user.email);
    return ResponseDto.created(data, 'Material cloned successfully');
  }

  @Put(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'Update material (all sections)',
    description:
      'Updates the material. When isPurchaseOrderIssued is true, shortDescription and ' +
      'longDescription are silently ignored — those carry the specification the supplier ' +
      'quoted against and cannot move underneath an issued order. Every other field ' +
      'remains editable, and the response returns the unchanged descriptions. ' +
      'When the material is not PO-locked, all fields update normally.',
  })
  @ApiParam({ name: 'id', description: 'Material UUID' })
  @ApiResponse({ status: 200, description: 'Material updated' })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateMaterialDto, @Request() req) {
    const data = await this.materialService.update(id, dto, req.user.organizationId, req.user.email);
    return ResponseDto.updated(data, 'Material updated successfully');
  }

  @Patch(':id/enable')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set material status to ACTIVE' })
  @ApiParam({ name: 'id', description: 'Material UUID' })
  async enable(@Param('id') id: string, @Request() req) {
    const data = await this.materialService.enable(id, req.user.organizationId, req.user.email);
    return ResponseDto.updated(data, 'Material enabled');
  }

  @Patch(':id/disable')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set material status to INACTIVE' })
  @ApiParam({ name: 'id', description: 'Material UUID' })
  async disable(@Param('id') id: string, @Request() req) {
    const data = await this.materialService.disable(id, req.user.organizationId, req.user.email);
    return ResponseDto.updated(data, 'Material disabled');
  }

  @Patch(':id/obsolete')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set material status to OBSOLETE (end-of-life)' })
  @ApiParam({ name: 'id', description: 'Material UUID' })
  async obsolete(@Param('id') id: string, @Request() req) {
    const data = await this.materialService.obsolete(id, req.user.organizationId, req.user.email);
    return ResponseDto.updated(data, 'Material marked obsolete');
  }

  @Delete(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a material' })
  @ApiParam({ name: 'id', description: 'Material UUID' })
  @ApiResponse({ status: 200, description: 'Material deleted' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.materialService.remove(id, req.user.organizationId, req.user.email);
    return ResponseDto.deleted('Material deleted successfully');
  }

  @Post('specification/document')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Upload material specification document (image or PDF)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, description: 'Document uploaded, returns URL' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadMaterialSpecificationDocument(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.materialService.uploadMaterialSpecificationDocument(req.user.userId, file);
  }  
}
