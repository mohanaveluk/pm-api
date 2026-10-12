import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param,
  ParseUUIDPipe, Patch, Post, Put, Query, Request, UploadedFile, UseGuards, UseInterceptors,
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
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { DeactivateClientDto, UpdateClientDto } from './dto/update-client.dto';
import { ClientQueryDto } from './dto/client-query.dto';
import { AddClientDocumentDto } from './dto/client-document.dto';
import {
  ClientAuditEntryDto, ClientDocumentResponseDto, ClientListResponseDto,
  ClientOptionDto, ClientResponseDto,
} from './dto/client-response.dto';

@ApiTags('Clients')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  // ── POST /clients ──────────────────────────────────────────────────
  @Post()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a client',
    description:
      'The client code is server-generated as a per-organization sequence starting at 0001 and is ' +
      'immutable thereafter; any code supplied in the body is ignored. Addresses, contacts, ' +
      'commercial settings and project defaults may be sent with the client or added later with PUT.',
  })
  @ApiBody({ type: CreateClientDto })
  @ApiResponse({ status: 201, description: 'Client created', type: ClientResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid reference or rule violation' })
  @ApiResponse({ status: 409, description: 'Client code already exists' })
  async create(@Body() dto: CreateClientDto, @Request() req: any): Promise<ResponseDto<ClientResponseDto>> {
    const client = await this.clientService.create(req.user.organizationId, dto, req.user.email);
    return ResponseDto.created(client, 'Client created successfully');
  }

  // ── GET /clients ───────────────────────────────────────────────────
  @Get()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'List clients with search, filters, sorting and pagination' })
  @ApiResponse({ status: 200, type: ClientListResponseDto })
  async findAll(
    @Query() query: ClientQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<ClientListResponseDto>> {
    return ResponseDto.success(await this.clientService.findAll(req.user.organizationId, query));
  }

  // ── GET /clients/active ────────────────────────────────────────────
  @Get('active')
  @ApiOperation({ summary: 'Active clients, for dropdowns' })
  @ApiResponse({ status: 200, type: [ClientOptionDto] })
  async findActive(@Request() req: any): Promise<ResponseDto<ClientOptionDto[]>> {
    return ResponseDto.success(await this.clientService.findActive(req.user.organizationId));
  }

  // ── POST /clients/documents/upload ─────────────────────────────────
  // Declared before the ':id' routes so "documents" is never read as an id.
  @Post('documents/upload')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'Upload a client document and get its URL',
    description: 'Stores the binary in cloud storage and returns the URL; the client register keeps only the URL.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, description: 'Uploaded; returns the URL' })
  @ApiResponse({ status: 400, description: 'No file provided or file type rejected' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadDocument(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return this.clientService.uploadDocument(req.user.organizationId, file);
  }

  // ── GET /clients/:id ───────────────────────────────────────────────
  @Get(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'Get a client with its addresses, contacts, documents and settings' })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<ClientResponseDto>> {
    return ResponseDto.success(await this.clientService.findOne(req.user.organizationId, id));
  }

  // ── PUT /clients/:id ───────────────────────────────────────────────
  @Put(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'Update a client',
    description:
      'Accepts any subset of the fields. `addresses` and `contacts`, when present, are the complete ' +
      'list: entries with an id are updated, entries without one are created and the rest are removed. ' +
      'Send `version` to be told when someone else changed the client first.',
  })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiBody({ type: UpdateClientDto })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiResponse({ status: 409, description: 'The client was changed since it was loaded' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @Request() req: any,
  ): Promise<ResponseDto<ClientResponseDto>> {
    const client = await this.clientService.update(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.updated(client, 'Client updated successfully');
  }

  // ── PATCH /clients/:id/activate ────────────────────────────────────
  @Patch(':id/activate')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'Activate a client' })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<ClientResponseDto>> {
    const client = await this.clientService.activate(req.user.organizationId, id, req.user.email);
    return ResponseDto.updated(client, 'Client activated');
  }

  // ── PATCH /clients/:id/deactivate ──────────────────────────────────
  @Patch(':id/deactivate')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'Deactivate a client',
    description:
      'A soft state change: the client and everything that references it stay intact, ' +
      'so historical records keep the original client identity.',
  })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiBody({ type: DeactivateClientDto, required: false })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeactivateClientDto,
    @Request() req: any,
  ): Promise<ResponseDto<ClientResponseDto>> {
    const client = await this.clientService.deactivate(req.user.organizationId, id, req.user.email, dto?.reason);
    return ResponseDto.updated(client, 'Client deactivated');
  }

  // ── DELETE /clients/:id ────────────────────────────────────────────
  @Delete(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete a client',
    description: 'Refused while the client is the parent of other clients. Prefer deactivating a client that has history.',
  })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiResponse({ status: 200, description: 'Client deleted' })
  @ApiResponse({ status: 409, description: 'The client still has subsidiaries' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.clientService.remove(req.user.organizationId, id, req.user.email);
    return ResponseDto.deleted('Client deleted successfully');
  }

  // ── Documents ──────────────────────────────────────────────────────
  @Get(':id/documents')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'List a client\'s documents' })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiResponse({ status: 200, type: [ClientDocumentResponseDto] })
  async listDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<ClientDocumentResponseDto[]>> {
    return ResponseDto.success(await this.clientService.listDocuments(req.user.organizationId, id));
  }

  @Post(':id/documents')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register an uploaded document against a client' })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiBody({ type: AddClientDocumentDto })
  @ApiResponse({ status: 201, type: ClientDocumentResponseDto })
  async addDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddClientDocumentDto,
    @Request() req: any,
  ): Promise<ResponseDto<ClientDocumentResponseDto>> {
    const doc = await this.clientService.addDocument(req.user.organizationId, id, dto, req.user.email);
    return ResponseDto.created(doc, 'Document added successfully');
  }

  @Delete(':id/documents/:documentId')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a client document' })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiParam({ name: 'documentId', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Document removed' })
  async removeDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Request() req: any,
  ): Promise<ResponseDto<null>> {
    await this.clientService.removeDocument(req.user.organizationId, id, documentId, req.user.email);
    return ResponseDto.deleted('Document removed successfully');
  }

  // ── Audit history ──────────────────────────────────────────────────
  @Get(':id/audit')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'Change history of a client, newest first' })
  @ApiParam({ name: 'id', description: 'Client UUID' })
  @ApiResponse({ status: 200, type: [ClientAuditEntryDto] })
  async audit(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<ClientAuditEntryDto[]>> {
    return ResponseDto.success(await this.clientService.getAuditHistory(req.user.organizationId, id));
  }
}
