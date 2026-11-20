import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe,
  Patch, Post, Put, Query, Request, StreamableFile, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';
import { RfqActor, RfqService } from './rfq.service';
import { RFQ_BUYER_ROLES, RFQ_READER_ROLES, RFQ_VENDOR_ROLE } from './enums/rfq.enums';
import {
  CreateRfqDto, RfqAcknowledgementDto, RfqQueryDto, RfqRequisitionContentQueryDto, RfqRequisitionOptionsQueryDto,
  RfqVendorOptionsQueryDto, RfqVendorResponseDto, UpdateRfqDto, UpdateRfqStatusDto,
} from './dto/rfq-request.dto';
import {
  RfqAcknowledgementFormDto, RfqDefaultsDto, RfqListResponseDto, RfqVendorSummaryDto, RfqRequisitionContentDto, RfqRequisitionOptionDto, RfqResponseDto,
  RfqVendorDocumentDto, RfqVendorOptionDto,
} from './dto/rfq-response.dto';

const BUYERS = typeof RFQ_BUYER_ROLES === 'string' ? [RFQ_BUYER_ROLES] : RFQ_BUYER_ROLES;
// Readers plus the vendor's own account (the service limits it to its RFQs).
const VIEWERS = [
  ...(typeof RFQ_READER_ROLES === 'string' ? [RFQ_READER_ROLES] : RFQ_READER_ROLES),
  ...(typeof RFQ_VENDOR_ROLE === 'string' ? [RFQ_VENDOR_ROLE] : RFQ_VENDOR_ROLE),
];

const actorOf = (req: any): RfqActor => ({
  userId: req.user.userId,
  email: req.user.email,
  name: [req.user.firstName, req.user.lastName].filter(Boolean).join(' ').trim() || req.user.email,
  role: req.user.role,
  isInternal: req.user.isInternal !== false,
});

const uploadFile = () => FileInterceptor('file', { storage: memoryStorage() });
const uploadBody = { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } };

@ApiTags('Requests for Quotation')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rfqs')
export class RfqController {
  constructor(private readonly service: RfqService) {}

  @Post()
  @Roles(...BUYERS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a draft RFQ',
    description: 'Saves the RFQ package as a draft. The RFQ number defaults to the generated code; ' +
      'items must belong to the selected approved requisitions and stay within each line\'s open quantity.',
  })
  @ApiBody({ type: CreateRfqDto })
  @ApiResponse({ status: 201, type: RfqResponseDto })
  async create(@Body() dto: CreateRfqDto, @Request() req: any): Promise<ResponseDto<RfqResponseDto>> {
    return ResponseDto.created(await this.service.create(req.user.organizationId, dto, actorOf(req)), 'RFQ created successfully');
  }

  @Get()
  @Roles(...VIEWERS)
  @ApiOperation({ summary: 'List RFQs (a vendor sees only the RFQs issued to it)' })
  @ApiResponse({ status: 200, type: RfqListResponseDto })
  async findAll(@Query() query: RfqQueryDto, @Request() req: any): Promise<ResponseDto<RfqListResponseDto>> {
    return ResponseDto.success(await this.service.findAll(req.user.organizationId, query, actorOf(req)));
  }

  @Get('defaults')
  @Roles(...BUYERS)
  @ApiOperation({ summary: 'Defaults for a new RFQ (letter text, instructions, contact person)' })
  @ApiResponse({ status: 200, type: RfqDefaultsDto })
  async defaults(@Request() req: any): Promise<ResponseDto<RfqDefaultsDto>> {
    return ResponseDto.success(await this.service.defaults(actorOf(req)));
  }

  @Get('requisition-options')
  @Roles(...BUYERS)
  @ApiOperation({ summary: 'Approved material requisitions an RFQ can be raised from' })
  @ApiResponse({ status: 200, type: [RfqRequisitionOptionDto] })
  async requisitionOptions(
    @Query() query: RfqRequisitionOptionsQueryDto, @Request() req: any,
  ): Promise<ResponseDto<RfqRequisitionOptionDto[]>> {
    return ResponseDto.success(await this.service.requisitionOptions(req.user.organizationId, query, actorOf(req)));
  }

  @Get('requisition-content')
  @Roles(...BUYERS)
  @ApiOperation({
    summary: 'Lines (with open quantity), compliance items, deviations and documents of the given requisitions',
  })
  @ApiResponse({ status: 200, type: RfqRequisitionContentDto })
  async requisitionContent(
    @Query() query: RfqRequisitionContentQueryDto, @Request() req: any,
  ): Promise<ResponseDto<RfqRequisitionContentDto>> {
    return ResponseDto.success(await this.service.requisitionContent(req.user.organizationId, query, actorOf(req)));
  }

  @Get('vendor-options')
  @Roles(...BUYERS)
  @ApiOperation({ summary: 'Active vendors an RFQ can be addressed to, with their primary address' })
  @ApiResponse({ status: 200, type: [RfqVendorOptionDto] })
  async vendorOptions(@Query() query: RfqVendorOptionsQueryDto, @Request() req: any): Promise<ResponseDto<RfqVendorOptionDto[]>> {
    return ResponseDto.success(await this.service.vendorOptions(req.user.organizationId, query, actorOf(req)));
  }

  @Get('vendor/summary')
  @Roles(...RFQ_VENDOR_ROLE)
  @ApiOperation({ summary: 'Vendor: my RFQs by stage (awaiting acknowledgement, acknowledged, responded)' })
  @ApiResponse({ status: 200, type: RfqVendorSummaryDto })
  async vendorSummary(@Request() req: any): Promise<ResponseDto<RfqVendorSummaryDto>> {
    return ResponseDto.success(await this.service.vendorSummary(req.user.organizationId, actorOf(req)));
  }

  @Get('vendors/:vendorId/documents')
  @Roles(...BUYERS)
  @ApiParam({ name: 'vendorId', format: 'uuid' })
  @ApiOperation({ summary: 'A vendor\'s Vendor Master documents (Vendor Qualification tab)' })
  @ApiResponse({ status: 200, type: [RfqVendorDocumentDto] })
  async documentsOfVendor(
    @Param('vendorId', ParseUUIDPipe) vendorId: string, @Request() req: any,
  ): Promise<ResponseDto<RfqVendorDocumentDto[]>> {
    return ResponseDto.success(await this.service.documentsOfVendor(req.user.organizationId, vendorId, actorOf(req)));
  }

  @Post('documents/upload')
  @Roles(...VIEWERS)
  @ApiOperation({ summary: 'Upload an RFQ document and get its URL' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(uploadBody)
  @UseInterceptors(uploadFile())
  async uploadDocument(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return this.service.uploadDocument(req.user.organizationId, file);
  }

  @Get(':id')
  @Roles(...VIEWERS)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Get an RFQ with its package, the vendor\'s answers, history and the caller\'s permissions' })
  @ApiResponse({ status: 200, type: RfqResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any): Promise<ResponseDto<RfqResponseDto>> {
    return ResponseDto.success(await this.service.findOne(req.user.organizationId, id, actorOf(req)));
  }

  @Get(':id/pdf')
  @Roles(...VIEWERS)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    summary: 'Download the RFQ as a PDF (issued RFQs and later)',
    description: 'The package, the price schedule, documents, and the vendor\'s acknowledgement, checklist, compliance and deviations.',
  })
  @ApiResponse({ status: 200, description: 'application/pdf' })
  @ApiResponse({ status: 409, description: 'The RFQ is still a draft' })
  async pdf(@Param('id', ParseUUIDPipe) id: string, @Request() req: any): Promise<StreamableFile> {
    const { fileName, buffer } = await this.service.pdf(req.user.organizationId, id, actorOf(req));
    req.res?.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
      length: buffer.length,
    });
  }

  @Get(':id/vendor-documents')
  @Roles(...VIEWERS)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'The vendor\'s Vendor Master documents (to choose qualification documents from)' })
  @ApiResponse({ status: 200, type: [RfqVendorDocumentDto] })
  async vendorDocuments(@Param('id', ParseUUIDPipe) id: string, @Request() req: any): Promise<ResponseDto<RfqVendorDocumentDto[]>> {
    return ResponseDto.success(await this.service.vendorDocuments(req.user.organizationId, id, actorOf(req)));
  }

  @Get(':id/acknowledgement')
  @Roles(...VIEWERS)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'The RFQ Acknowledgement Form: the RFQ, the vendor\'s defaults and any acknowledgement given' })
  @ApiResponse({ status: 200, type: RfqAcknowledgementFormDto })
  async acknowledgementForm(@Param('id', ParseUUIDPipe) id: string, @Request() req: any): Promise<ResponseDto<RfqAcknowledgementFormDto>> {
    return ResponseDto.success(await this.service.acknowledgementForm(req.user.organizationId, id, actorOf(req)));
  }

  @Post(':id/acknowledge')
  @Roles(...RFQ_VENDOR_ROLE)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    summary: 'Vendor: submit the RFQ Acknowledgement Form',
    description: 'Participating and quoting → Acknowledged (the vendor can respond); otherwise → Declined.',
  })
  @ApiBody({ type: RfqAcknowledgementDto })
  @ApiResponse({ status: 200, type: RfqAcknowledgementFormDto })
  async acknowledge(
    @Param('id', ParseUUIDPipe) id: string, @Body() dto: RfqAcknowledgementDto, @Request() req: any,
  ): Promise<ResponseDto<RfqAcknowledgementFormDto>> {
    const form = await this.service.acknowledge(req.user.organizationId, id, dto, actorOf(req));
    return ResponseDto.success(form, form.status === 'DECLINED' ? 'RFQ declined' : 'RFQ acknowledged');
  }

  @Put(':id')
  @Roles(...BUYERS)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Update an RFQ (a draft fully; once issued only its compliance requirements)' })
  @ApiBody({ type: UpdateRfqDto })
  @ApiResponse({ status: 200, type: RfqResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRfqDto, @Request() req: any,
  ): Promise<ResponseDto<RfqResponseDto>> {
    return ResponseDto.updated(await this.service.update(req.user.organizationId, id, dto, actorOf(req)), 'RFQ updated successfully');
  }

  @Post(':id/issue')
  @Roles(...BUYERS)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Issue a draft RFQ to its vendor (emails the vendor with Acknowledge / View links)' })
  @ApiResponse({ status: 200, type: RfqResponseDto })
  async issue(@Param('id', ParseUUIDPipe) id: string, @Request() req: any): Promise<ResponseDto<RfqResponseDto>> {
    return ResponseDto.success(await this.service.issue(req.user.organizationId, id, actorOf(req)), 'RFQ issued to the vendor');
  }

  @Put(':id/vendor-response')
  @Roles(...RFQ_VENDOR_ROLE)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    summary: 'Vendor: save the quotation (prices, other charges, checklist, compliance, deviations, qualification documents)',
    description: 'With `submit: true` the RFQ is marked Quoted once every required answer is filled.',
  })
  @ApiBody({ type: RfqVendorResponseDto })
  @ApiResponse({ status: 200, type: RfqResponseDto })
  async vendorResponse(
    @Param('id', ParseUUIDPipe) id: string, @Body() dto: RfqVendorResponseDto, @Request() req: any,
  ): Promise<ResponseDto<RfqResponseDto>> {
    const saved = await this.service.saveVendorResponse(req.user.organizationId, id, dto, actorOf(req));
    return ResponseDto.updated(saved, dto.submit ? 'Quotation submitted' : 'Quotation saved');
  }

  @Patch(':id/status')
  @Roles(...BUYERS)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Complete, approve or cancel an RFQ' })
  @ApiBody({ type: UpdateRfqStatusDto })
  @ApiResponse({ status: 200, type: RfqResponseDto })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRfqStatusDto, @Request() req: any,
  ): Promise<ResponseDto<RfqResponseDto>> {
    return ResponseDto.updated(await this.service.changeStatus(req.user.organizationId, id, dto, actorOf(req)), 'RFQ status updated');
  }

  @Delete(':id')
  @Roles(...BUYERS)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Delete a draft RFQ' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any): Promise<ResponseDto<null>> {
    await this.service.remove(req.user.organizationId, id, actorOf(req));
    return ResponseDto.deleted('RFQ deleted successfully');
  }
}
