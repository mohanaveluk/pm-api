import {
  BadRequestException,
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Put, Query, Request, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiQuery,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard }   from 'src/common/guards/roles.guard';
import { Roles }        from 'src/common/decorators/roles.decorator';
import { ResponseDto }  from 'src/common/dto/response.dto';

import { VendorService }   from './vendor.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorQueryDto }  from './dto/vendor-query.dto';
import {
  VendorAddressResponseDto,
  VendorBankAccountResponseDto,
  VendorCertificationResponseDto,
  VendorContactResponseDto,
  VendorDocumentResponseDto,
  VendorDropdownDto,
  VendorEvaluationResponseDto,
  VendorListResponseDto,
  VendorMaterialResponseDto,
  VendorPerformanceResponseDto,
  VendorResponseDto,
} from './dto/vendor-response.dto';
import {
  DecideVendorStatusChangeDto,
  RequestVendorStatusChangeDto,
  VendorStatusChangeAcceptedDto,
  VendorStatusChangeRequestResponseDto,
} from './dto/vendor-status-change.dto';

// RBAC uses the existing @Roles decorator + RolesGuard (role string on the JWT
// payload). The permission names in the specification map onto these role sets:
//
//   Vendor.View              → OrganizationAdmin, SuperAdmin, Manager
//   Vendor.Create/Modify     → OrganizationAdmin, SuperAdmin, Manager
//   Vendor.Delete            → OrganizationAdmin, SuperAdmin
//   Vendor.Enable/Disable    → OrganizationAdmin, SuperAdmin
//   Vendor.Approve/Evaluate  → OrganizationAdmin, SuperAdmin
//   Vendor.ViewSensitiveData → SuperAdmin, OrganizationAdmin, FinanceAdmin
//                              (enforced in VendorService, so every read path
//                               is covered rather than just this controller)
@ApiTags('Vendor Master')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendors')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  // ── Static routes first (must precede /:id) ───────────────────────────

  @Get('active')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager', 'user')
  @ApiOperation({
    summary: 'Get selectable vendors for dropdown/lookup',
    description:
      'Returns vendors that are ACTIVE and isActive=true. Vendors that are ' +
      'UNDER_EVALUATION, INACTIVE, BLACKLISTED, or deleted are never returned.',
  })
  @ApiQuery({ name: 'industryCategoryId', required: false, description: 'Filter by Industry Category UUID' })
  @ApiQuery({ name: 'vendorType',         required: false, description: 'Filter by vendor type' })
  @ApiResponse({ status: 200, description: 'Selectable vendors', type: [VendorDropdownDto] })
  async findActive(
    @Request() req,
    @Query('industryCategoryId') industryCategoryId?: string,
    @Query('vendorType')         vendorType?: string,
  ) {
    const data = await this.vendorService.findActive(
      req.user.organizationId,
      industryCategoryId,
      vendorType,
    );
    return ResponseDto.success(data);
  }

  @Get('status-requests/pending')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'Approver inbox: every pending blacklist / un-blacklist request',
    description:
      'Lets a manager action requests from inside the application when the approval ' +
      'email is unavailable. Approval tokens are never included in the response.',
  })
  @ApiResponse({
    status: 200, description: 'Pending status change requests',
    type: [VendorStatusChangeRequestResponseDto],
  })
  async findPendingStatusRequests(@Request() req) {
    const data = await this.vendorService.findPendingStatusChangeRequests(req.user.organizationId);
    return ResponseDto.success(data);
  }

  @Post('documents/upload')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'Upload a vendor document (image or PDF) and get its URL',
    description:
      'Stores the binary in cloud storage and returns the URL. The Vendor Master ' +
      'itself only ever persists URLs — never file contents.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, description: 'Document uploaded, returns URL' })
  @ApiResponse({ status: 400, description: 'No file provided or file type rejected' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadDocument(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return this.vendorService.uploadVendorDocument(req.user.userId, file);
  }

  // ── Collection routes ─────────────────────────────────────────────────

  @Post()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a vendor (code is auto-generated)',
    description:
      'The vendor code is generated server-side as <3-char Industry Category prefix> + ' +
      '<6-digit sequence> (e.g. CIV000001) using a row-locked counter, so concurrent ' +
      'creates never collide. Any client-supplied code is ignored.\n\n' +
      'A new vendor always starts UNDER_EVALUATION with isActive=false — creating a ' +
      'vendor does not approve it. Addresses, contacts, bank accounts, certifications, ' +
      'documents, materials, and turnovers are all persisted in one transaction.',
  })
  @ApiBody({ type: CreateVendorDto })
  @ApiResponse({ status: 201, description: 'Vendor created',                             type: VendorResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error (email, URL, phone, enum)'                          })
  @ApiResponse({ status: 404, description: 'Industry Category, parent vendor, or material not found'             })
  @ApiResponse({ status: 409, description: 'Duplicate vendor, or Industry Category inactive'                     })
  @ApiResponse({ status: 422, description: 'Self-referencing or circular parent company'                         })
  async create(@Body() dto: CreateVendorDto, @Request() req) {
    const data = await this.vendorService.create(dto, req.user.organizationId, req.user.email);
    return ResponseDto.created(data, 'Vendor created successfully');
  }

  @Get()
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'List vendors with search, filters, sorting and pagination',
    description:
      'Case-insensitive search spans code, vendorName, tradeName, email, ' +
      'businessRegistrationNumber and taxRegistrationNumber. Blacklisted vendors are ' +
      'excluded unless includeBlacklisted=true or vendorStatus=BLACKLISTED is requested.',
  })
  @ApiResponse({ status: 200, description: 'Paginated vendor list', type: VendorListResponseDto })
  async findAll(@Query() query: VendorQueryDto, @Request() req) {
    const data = await this.vendorService.findAll(query, req.user.organizationId);
    return ResponseDto.success(data);
  }

  // ── Item routes ───────────────────────────────────────────────────────

  @Get(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'Get complete vendor detail including child collections',
    description:
      'Bank account numbers, IBAN and SWIFT are masked unless the caller holds a ' +
      'sensitive-data role.',
  })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiResponse({ status: 200, description: 'Vendor detail', type: VendorResponseDto })
  @ApiResponse({ status: 404, description: 'Vendor not found in this organization' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const data = await this.vendorService.findOne(
      id, req.user.organizationId, req.user.email, req.user.role,
    );
    return ResponseDto.success(data);
  }

  @Put(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'Update a vendor',
    description:
      'code and industryCategoryId are immutable once the code is issued. ' +
      'vendorStatus is not patchable here — use the enable, disable, or blacklist endpoints.',
  })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiBody({ type: UpdateVendorDto })
  @ApiResponse({ status: 200, description: 'Vendor updated',                          type: VendorResponseDto })
  @ApiResponse({ status: 404, description: 'Vendor not found in this organization'                            })
  @ApiResponse({ status: 409, description: 'Duplicate vendor, or immutable field change attempted'            })
  @ApiResponse({ status: 422, description: 'Self-referencing or circular parent company'                      })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVendorDto,
    @Request() req,
  ) {
    const data = await this.vendorService.update(
      id, dto, req.user.organizationId, req.user.email, req.user.role,
    );
    return ResponseDto.updated(data, 'Vendor updated successfully');
  }

  @Delete(':id')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete a vendor',
    description:
      'Sets isDeleted=true, isActive=false and cascades the soft delete to owned child ' +
      'records. Refused when the vendor is referenced by any transactional record ' +
      '(RFQ, PO, contract, invoice, inspection, project) or has subsidiary vendors — ' +
      'those references must remain resolvable. Disable or blacklist instead.',
  })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiResponse({ status: 200, description: 'Vendor soft-deleted'                                     })
  @ApiResponse({ status: 404, description: 'Vendor not found in this organization'                   })
  @ApiResponse({ status: 409, description: 'Vendor referenced by transactions or has subsidiaries'   })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    await this.vendorService.remove(id, req.user.organizationId, req.user.email);
    return ResponseDto.deleted('Vendor deleted successfully');
  }

  // ── Lifecycle transitions ─────────────────────────────────────────────

  @Patch(':id/enable')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enable a vendor (vendorStatus=ACTIVE, isActive=true)',
    description: 'Refused for blacklisted vendors — the blacklisting must be lifted first.',
  })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiResponse({ status: 200, description: 'Vendor enabled', type: VendorResponseDto })
  @ApiResponse({ status: 404, description: 'Vendor not found'                        })
  @ApiResponse({ status: 409, description: 'Already active, or vendor is blacklisted' })
  async enable(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const data = await this.vendorService.enable(
      id, req.user.organizationId, req.user.email, req.user.role,
    );
    return ResponseDto.updated(data, 'Vendor enabled');
  }

  @Patch(':id/disable')
  @Roles('OrganizationAdmin', 'SuperAdmin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Disable a vendor (vendorStatus=INACTIVE, isActive=false)',
    description:
      'Deliberately NOT blocked by transactional history — a vendor with historical ' +
      'purchase orders can still be taken out of service, and that history stays intact.',
  })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiResponse({ status: 200, description: 'Vendor disabled', type: VendorResponseDto })
  @ApiResponse({ status: 404, description: 'Vendor not found'                         })
  @ApiResponse({ status: 409, description: 'Already inactive, or vendor is blacklisted' })
  async disable(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const data = await this.vendorService.disable(
      id, req.user.organizationId, req.user.email, req.user.role,
    );
    return ResponseDto.updated(data, 'Vendor disabled');
  }

  // ── Blacklist / un-blacklist: maker–checker ───────────────────────────
  //
  // These two endpoints REQUEST a change; they no longer apply one. The vendor
  // is flagged pending and a manager is emailed an approval link. The settled
  // status moves only when the decision is recorded below.

  @Patch(':id/blacklist')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request that a vendor be blacklisted (requires manager approval)',
    description:
      'Raises a blacklist request and emails an approval link to the organization\'s ' +
      'managers. The vendor is marked pendingStatusChange=PENDING_BLACKLIST; its ' +
      'vendorStatus and isActive are NOT changed yet.\n\n' +
      'On approval the vendor becomes BLACKLISTED and is excluded from selection lists, ' +
      'RFQ pickers, the AVL, and new purchase orders — transactional history stays intact. ' +
      'On rejection nothing changes. The requester cannot approve their own request.',
  })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiBody({ type: RequestVendorStatusChangeDto })
  @ApiResponse({ status: 202, description: 'Request raised, approval pending', type: VendorStatusChangeAcceptedDto })
  @ApiResponse({ status: 400, description: 'Reason is required'                                                    })
  @ApiResponse({ status: 404, description: 'Vendor or nominated approver not found'                                })
  @ApiResponse({ status: 409, description: 'Already blacklisted, or another request is already pending'            })
  @ApiResponse({ status: 422, description: 'No eligible approver exists in this organization'                      })
  async requestBlacklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestVendorStatusChangeDto,
    @Request() req,
  ) {
    const data = await this.vendorService.requestBlacklist(
      id, req.user.organizationId, dto, req.user.email,
    );
    return ResponseDto.created(data, 'Blacklist request submitted for manager approval');
  }

  @Patch(':id/remove-blacklist')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request that a vendor blacklisting be lifted (requires manager approval)',
    description:
      'Raises an un-blacklist request and emails an approval link to the organization\'s ' +
      'managers. The vendor is marked pendingStatusChange=PENDING_UNBLACKLIST; it stays ' +
      'BLACKLISTED until the decision lands.\n\n' +
      'On approval the vendor returns to UNDER_EVALUATION rather than straight to ACTIVE — ' +
      're-qualification is a deliberate second step, after which /enable makes it active. ' +
      'The blacklisting reason and timestamps are retained as history.',
  })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiBody({ type: RequestVendorStatusChangeDto })
  @ApiResponse({ status: 202, description: 'Request raised, approval pending', type: VendorStatusChangeAcceptedDto })
  @ApiResponse({ status: 400, description: 'Reason is required'                                                    })
  @ApiResponse({ status: 404, description: 'Vendor or nominated approver not found'                                })
  @ApiResponse({ status: 409, description: 'Vendor is not blacklisted, or another request is already pending'      })
  @ApiResponse({ status: 422, description: 'No eligible approver exists in this organization'                      })
  async requestRemoveBlacklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestVendorStatusChangeDto,
    @Request() req,
  ) {
    const data = await this.vendorService.requestRemoveBlacklist(
      id, req.user.organizationId, dto, req.user.email,
    );
    return ResponseDto.created(data, 'Un-blacklist request submitted for manager approval');
  }

  // ── Manager decisions ─────────────────────────────────────────────────
  //
  // The emailed link opens the app; the manager signs in and confirms here.
  // Both the JWT (who you are) and the emailed token (what you were asked to
  // decide) are required. A GET-to-approve URL is deliberately avoided —
  // mail scanners pre-fetch links and would approve requests nobody clicked.

  @Patch('status-requests/:requestId/approve')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a pending vendor blacklist / un-blacklist request',
    description:
      'Applies the requested change. Requires the single-use token from the approval ' +
      'email in addition to a valid session. The user who raised the request cannot ' +
      'approve it. The token is burned once a decision is recorded.',
  })
  @ApiParam({ name: 'requestId', description: 'Status change request UUID (from the approval link)' })
  @ApiBody({ type: DecideVendorStatusChangeDto })
  @ApiResponse({ status: 200, description: 'Request approved and applied', type: VendorResponseDto })
  @ApiResponse({ status: 403, description: 'Invalid token, or the requester is trying to self-approve' })
  @ApiResponse({ status: 404, description: 'Request not found in this organization'                    })
  @ApiResponse({ status: 409, description: 'Request already decided, or the approval link has expired' })
  async approveStatusChange(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: DecideVendorStatusChangeDto,
    @Request() req,
  ) {
    const data = await this.vendorService.approveStatusChange(
      requestId, req.user.organizationId, dto, req.user.email, req.user.role,
    );
    return ResponseDto.updated(data, 'Vendor status change approved');
  }

  @Patch('status-requests/:requestId/reject')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject a pending vendor blacklist / un-blacklist request',
    description:
      'Clears the pending flag and leaves the vendor exactly as it was — no ' +
      'compensating update is needed because the settled status never moved.',
  })
  @ApiParam({ name: 'requestId', description: 'Status change request UUID (from the approval link)' })
  @ApiBody({ type: DecideVendorStatusChangeDto })
  @ApiResponse({ status: 200, description: 'Request rejected', type: VendorResponseDto })
  @ApiResponse({ status: 403, description: 'Invalid token, or the requester is trying to self-reject' })
  @ApiResponse({ status: 404, description: 'Request not found in this organization'                   })
  @ApiResponse({ status: 409, description: 'Request already decided, or the approval link has expired' })
  async rejectStatusChange(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: DecideVendorStatusChangeDto,
    @Request() req,
  ) {
    const data = await this.vendorService.rejectStatusChange(
      requestId, req.user.organizationId, dto, req.user.email, req.user.role,
    );
    return ResponseDto.updated(data, 'Vendor status change rejected');
  }

  @Patch('status-requests/:requestId/cancel')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Withdraw your own pending request',
    description: 'Only the user who raised the request may cancel it. No token is required.',
  })
  @ApiParam({ name: 'requestId', description: 'Status change request UUID' })
  @ApiResponse({ status: 200, description: 'Request cancelled', type: VendorResponseDto })
  @ApiResponse({ status: 403, description: 'Only the requester may cancel'              })
  @ApiResponse({ status: 404, description: 'Pending request not found'                  })
  async cancelStatusChange(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Request() req,
  ) {
    const data = await this.vendorService.cancelStatusChange(
      requestId, req.user.organizationId, req.user.email, req.user.role,
    );
    return ResponseDto.updated(data, 'Vendor status change request cancelled');
  }

  // ── Sub-resource reads ────────────────────────────────────────────────

  @Get(':id/contacts')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'Get vendor contacts' })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiResponse({ status: 200, description: 'Vendor contacts', type: [VendorContactResponseDto] })
  @ApiResponse({ status: 404, description: 'Vendor not found'                                  })
  async findContacts(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const data = await this.vendorService.findContacts(id, req.user.organizationId);
    return ResponseDto.success(data);
  }

  @Get(':id/addresses')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({ summary: 'Get vendor addresses (registered, corporate, factory, …)' })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiResponse({ status: 200, description: 'Vendor addresses', type: [VendorAddressResponseDto] })
  @ApiResponse({ status: 404, description: 'Vendor not found'                                   })
  async findAddresses(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const data = await this.vendorService.findAddresses(id, req.user.organizationId);
    return ResponseDto.success(data);
  }

  @Get(':id/bank-accounts')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'Get vendor bank accounts (masked by default)',
    description:
      'Account number, IBAN and SWIFT are masked unless reveal=true AND the caller ' +
      'holds a sensitive-data role (SuperAdmin, OrganizationAdmin, FinanceAdmin). ' +
      'An unauthorised reveal=true is refused with 403.',
  })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiQuery({
    name: 'reveal', required: false, type: Boolean,
    description: 'Request unmasked values — requires the sensitive-data role',
  })
  @ApiResponse({ status: 200, description: 'Vendor bank accounts', type: [VendorBankAccountResponseDto] })
  @ApiResponse({ status: 403, description: 'Not authorised to view unmasked banking information'        })
  @ApiResponse({ status: 404, description: 'Vendor not found'                                           })
  async findBankAccounts(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Query('reveal') reveal?: string,
  ) {
    const data = await this.vendorService.findBankAccounts(
      id, req.user.organizationId, req.user.role, reveal === 'true',
    );
    return ResponseDto.success(data);
  }

  @Get(':id/certifications')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'Get vendor certifications',
    description: 'Each row carries derived isExpired and daysToExpiry values for re-qualification screening.',
  })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiResponse({ status: 200, description: 'Vendor certifications', type: [VendorCertificationResponseDto] })
  @ApiResponse({ status: 404, description: 'Vendor not found'                                              })
  async findCertifications(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const data = await this.vendorService.findCertifications(id, req.user.organizationId);
    return ResponseDto.success(data);
  }

  @Get(':id/documents')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'Get vendor documents',
    description: 'Returns all versions, newest first per document type. URLs only — never binaries.',
  })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiResponse({ status: 200, description: 'Vendor documents', type: [VendorDocumentResponseDto] })
  @ApiResponse({ status: 404, description: 'Vendor not found'                                    })
  async findDocuments(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const data = await this.vendorService.findDocuments(id, req.user.organizationId);
    return ResponseDto.success(data);
  }

  @Get(':id/materials')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'Get materials this vendor supplies',
    description:
      'Returns the Vendor↔Material mappings with their commercial attributes. ' +
      'isPreferred is per material, not a global vendor property.',
  })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiResponse({ status: 200, description: 'Supplied materials', type: [VendorMaterialResponseDto] })
  @ApiResponse({ status: 404, description: 'Vendor not found'                                      })
  async findMaterials(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const data = await this.vendorService.findMaterials(id, req.user.organizationId);
    return ResponseDto.success(data);
  }

  @Get(':id/performance')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'Get vendor performance history',
    description:
      'Append-only scoring history, newest first. Records are never overwritten, so ' +
      'period-over-period trends remain reconstructable.',
  })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiResponse({ status: 200, description: 'Performance history', type: [VendorPerformanceResponseDto] })
  @ApiResponse({ status: 404, description: 'Vendor not found'                                          })
  async findPerformance(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const data = await this.vendorService.findPerformance(id, req.user.organizationId);
    return ResponseDto.success(data);
  }

  @Get(':id/status-requests')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'Get the blacklist / un-blacklist request history for a vendor',
    description:
      'Full maker–checker trail, newest first: who raised each request, why, who ' +
      'decided, and when. Approval tokens are never included in the response.',
  })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiResponse({
    status: 200, description: 'Status change request history',
    type: [VendorStatusChangeRequestResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async findStatusRequests(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const data = await this.vendorService.findStatusChangeRequests(id, req.user.organizationId);
    return ResponseDto.success(data);
  }

  @Get(':id/evaluations')
  @Roles('OrganizationAdmin', 'SuperAdmin', 'Manager')
  @ApiOperation({
    summary: 'Get vendor evaluation / approval trail',
    description:
      'Append-only decision history (stage + decision + score), newest first. This is the ' +
      'integration point for a future approval workflow engine.',
  })
  @ApiParam({ name: 'id', description: 'Vendor UUID' })
  @ApiResponse({ status: 200, description: 'Evaluation history', type: [VendorEvaluationResponseDto] })
  @ApiResponse({ status: 404, description: 'Vendor not found'                                        })
  async findEvaluations(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const data = await this.vendorService.findEvaluations(id, req.user.organizationId);
    return ResponseDto.success(data);
  }
}
