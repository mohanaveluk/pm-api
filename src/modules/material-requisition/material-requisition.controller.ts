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
  AssignedRequisitionQueryDto, MaterialRequisitionQueryDto, ProjectItemsQueryDto, RequisitionMaterialQueryDto,
} from './dto/material-requisition-query.dto';
import {
  ApproveRequisitionDto, ReviewRequisitionDto, UpdateRequisitionParticipantsDto,
} from './dto/requisition-decision.dto';
import { RequisitionParticipantRole } from './enums/material-requisition.enums';
import {
  MaterialRequisitionWorkflowService, REQUISITION_INTERNAL_ROLES, REQUISITION_READER_ROLES,
  REQUISITION_WRITER_ROLES, RequisitionActor,
} from './material-requisition-workflow.service';
import {
  BomColumnsDto, BomPreviewDto, MaterialRequisitionListResponseDto,
  MaterialRequisitionResponseDto, RequisitionCandidateDto, RequisitionCandidateListDto,
  RequisitionUserOptionDto,
} from './dto/material-requisition-response.dto';

const READERS = REQUISITION_READER_ROLES;
const WRITERS = REQUISITION_WRITER_ROLES;
// Any internal user can be a reviewer or approver. These routes check, per
// requisition, that the caller raised it or is assigned to it.
const INTERNAL = REQUISITION_INTERNAL_ROLES;

/** The signed-in user as the requisition workflow needs them. */
const actorOf = (req: any): RequisitionActor => ({
  userId: req.user.userId,
  email: req.user.email,
  name: [req.user.firstName, req.user.lastName].filter(Boolean).join(' ').trim() || req.user.email,
  role: req.user.role,
});

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
  constructor(
    private readonly service: MaterialRequisitionService,
    private readonly workflow: MaterialRequisitionWorkflowService,
  ) {}

  // ── POST /material-requisitions ────────────────────────────────────
  @Post()
  @Roles(...WRITERS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a material requisition',
    description:
      'Saves the header, its material lines and its documents. With `submit: true` the ' +
      'requisition goes straight to Under Review and every reviewer is emailed; otherwise it is ' +
      'kept as a draft. Submitting needs at least one reviewer and one approver (internal users). ' +
      'Lines with no quantity (empty or 0) are ignored. The client is read from the project. ' +
      'A tracking id (TRK-yyyy-nnnn) is assigned for the whole procurement workflow.',
  })
  @ApiBody({ type: CreateMaterialRequisitionDto })
  @ApiResponse({ status: 201, type: MaterialRequisitionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid project, WBS, material, date or missing submit fields' })
  @ApiResponse({ status: 409, description: 'MR number already in use' })
  async create(
    @Body() dto: CreateMaterialRequisitionDto,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialRequisitionResponseDto>> {
    const mr = await this.service.create(req.user.organizationId, dto, actorOf(req));
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

  @Get('my-reviews')
  @Roles(...INTERNAL)
  @ApiOperation({
    summary: 'Requisitions assigned to me as reviewer',
    description: 'By default only those under review and still waiting for my decision (pendingOnly=true).',
  })
  @ApiResponse({ status: 200, type: MaterialRequisitionListResponseDto })
  async myReviews(
    @Query() query: AssignedRequisitionQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialRequisitionListResponseDto>> {
    return ResponseDto.success(await this.service.findAssigned(
      req.user.organizationId, actorOf(req), RequisitionParticipantRole.REVIEWER, query,
    ));
  }

  @Get('my-approvals')
  @Roles(...INTERNAL)
  @ApiOperation({
    summary: 'Requisitions assigned to me as approver',
    description: 'By default only those reviewed and still waiting for my decision (pendingOnly=true).',
  })
  @ApiResponse({ status: 200, type: MaterialRequisitionListResponseDto })
  async myApprovals(
    @Query() query: AssignedRequisitionQueryDto,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialRequisitionListResponseDto>> {
    return ResponseDto.success(await this.service.findAssigned(
      req.user.organizationId, actorOf(req), RequisitionParticipantRole.APPROVER, query,
    ));
  }

  @Get('participant-options')
  @Roles(...INTERNAL)
  @ApiOperation({ summary: 'Internal users who can be assigned as reviewers or approvers' })
  @ApiResponse({ status: 200, type: [RequisitionUserOptionDto] })
  async participantOptions(@Request() req: any): Promise<ResponseDto<RequisitionUserOptionDto[]>> {
    return ResponseDto.success(await this.service.participantOptions(req.user.organizationId));
  }

  @Get('materials')
  @Roles(...INTERNAL)
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
  @Roles(...INTERNAL)
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
  @Roles(...INTERNAL)
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
  @Roles(...INTERNAL)
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
  @Roles(...INTERNAL)
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
  @Roles(...INTERNAL)
  @ApiOperation({
    summary: 'Get a requisition with its lines, documents, client and WBS details',
    description:
      'Includes the reviewers and approvers with their decisions, the full history (every round) and ' +
      'what the caller may do now. Readers see any requisition; other users only those they raised ' +
      'or are assigned to.',
  })
  @ApiParam({ name: 'id', description: 'Material requisition UUID' })
  @ApiResponse({ status: 200, type: MaterialRequisitionResponseDto })
  @ApiResponse({ status: 404, description: 'Requisition not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialRequisitionResponseDto>> {
    return ResponseDto.success(await this.service.findOne(req.user.organizationId, id, actorOf(req)));
  }

  // ── PUT /material-requisitions/:id ─────────────────────────────────
  @Put(':id')
  @Roles(...INTERNAL)
  @ApiOperation({
    summary: 'Update a requisition',
    description:
      'A draft or a returned requisition is changed by its requester; one under review by its ' +
      'requester or an assigned reviewer (whose review must then describe the changes). ' +
      '`items`, `documents`, `reviewerIds` and `approverIds`, when present, are complete sets ' +
      '(reviewers and approvers only change while draft or returned). `submit: true` saves and ' +
      '(re)submits in one call.',
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
    const mr = await this.service.update(req.user.organizationId, id, dto, actorOf(req));
    return ResponseDto.updated(
      mr,
      mr.status === 'DRAFT' ? 'Draft saved successfully'
        : dto.submit ? 'Material requisition submitted for review'
        : 'Material requisition updated',
    );
  }

  // ── PATCH /material-requisitions/:id/submit ────────────────────────
  @Patch(':id/submit')
  @Roles(...WRITERS)
  @ApiOperation({
    summary: 'Submit a draft, or resubmit a returned requisition — it goes to Under Review',
    description: 'Starts a new review round and emails every reviewer. Needs at least one reviewer and one approver.',
  })
  @ApiParam({ name: 'id', description: 'Material requisition UUID' })
  @ApiResponse({ status: 200, type: MaterialRequisitionResponseDto })
  @ApiResponse({ status: 400, description: 'Missing WBS, required-on-site date or materials' })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialRequisitionResponseDto>> {
    const mr = await this.service.submit(req.user.organizationId, id, actorOf(req));
    return ResponseDto.updated(mr, 'Material requisition submitted for review');
  }

  // ── PUT /material-requisitions/:id/participants ─────────────────────
  @Put(':id/participants')
  @Roles(...INTERNAL)
  @ApiOperation({
    summary: 'Change the reviewers and / or approvers',
    description:
      'Each list, when given, is the complete set in order. Reviewers can change until the ' +
      'requisition is reviewed and approvers until it is approved; only its requester (or a ' +
      'requisition writer) can change them. People who stay keep the decision they already made. ' +
      'Newly added reviewers or approvers of a live round are emailed; if the change leaves every ' +
      'remaining reviewer (approver) decided, the round completes.',
  })
  @ApiParam({ name: 'id', description: 'Material requisition UUID' })
  @ApiBody({ type: UpdateRequisitionParticipantsDto })
  @ApiResponse({ status: 200, type: MaterialRequisitionResponseDto })
  @ApiResponse({ status: 403, description: 'Not the requester' })
  @ApiResponse({ status: 409, description: 'Reviewers locked (reviewed) or approvers locked (approved)' })
  async updateParticipants(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRequisitionParticipantsDto,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialRequisitionResponseDto>> {
    const actor = actorOf(req);
    await this.workflow.updateParticipants(req.user.organizationId, id, actor, dto);
    return ResponseDto.updated(
      await this.service.findOne(req.user.organizationId, id, actor),
      'Reviewers and approvers updated',
    );
  }

  // ── POST /material-requisitions/:id/review ─────────────────────────
  @Post(':id/review')
  @Roles(...INTERNAL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record my review decision',
    description:
      'For an assigned reviewer of a requisition under review: REVIEWED, RETURNED, REJECTED or ' +
      'CANCELLED. Comments are required for every decision except REVIEWED, and when the reviewer ' +
      'edited the requisition. Once every reviewer has reviewed it the approvers are emailed; a ' +
      'return, rejection or cancellation ends the review at once and the requester is emailed.',
  })
  @ApiParam({ name: 'id', description: 'Material requisition UUID' })
  @ApiBody({ type: ReviewRequisitionDto })
  @ApiResponse({ status: 200, type: MaterialRequisitionResponseDto })
  @ApiResponse({ status: 403, description: 'Not a reviewer of this requisition' })
  @ApiResponse({ status: 409, description: 'Not under review, or already decided this round' })
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewRequisitionDto,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialRequisitionResponseDto>> {
    const actor = actorOf(req);
    await this.workflow.review(req.user.organizationId, id, actor, dto);
    return ResponseDto.updated(await this.service.findOne(req.user.organizationId, id, actor), 'Review recorded');
  }

  // ── POST /material-requisitions/:id/approval ───────────────────────
  @Post(':id/approval')
  @Roles(...INTERNAL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record my approval decision',
    description:
      'For an assigned approver of a reviewed requisition: APPROVED, RETURNED, REJECTED or CANCELLED. ' +
      'Approvers cannot edit the requisition. Comments are required for every decision except APPROVED. ' +
      'Once every approver has approved it, or any one returns, rejects or cancels it, the requester, ' +
      'the reviewers and the approvers are emailed.',
  })
  @ApiParam({ name: 'id', description: 'Material requisition UUID' })
  @ApiBody({ type: ApproveRequisitionDto })
  @ApiResponse({ status: 200, type: MaterialRequisitionResponseDto })
  @ApiResponse({ status: 403, description: 'Not an approver of this requisition' })
  @ApiResponse({ status: 409, description: 'Not reviewed yet, or already decided this round' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveRequisitionDto,
    @Request() req: any,
  ): Promise<ResponseDto<MaterialRequisitionResponseDto>> {
    const actor = actorOf(req);
    await this.workflow.approve(req.user.organizationId, id, actor, dto);
    return ResponseDto.updated(await this.service.findOne(req.user.organizationId, id, actor), 'Decision recorded');
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
    const mr = await this.service.changeStatus(req.user.organizationId, id, dto.status, actorOf(req));
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
