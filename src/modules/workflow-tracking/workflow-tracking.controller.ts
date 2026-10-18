import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';
import { WorkflowTrackingService } from './workflow-tracking.service';
import { WorkflowTimelineDto } from './dto/workflow-event-response.dto';

// Internal staff only — the timeline spans every document of the workflow.
const INTERNAL_ROLES = [
  'OrganizationAdmin', 'SuperAdmin', 'Manager', 'ProjectManager', 'DepartmentManager',
  'DisciplineLead', 'ProcurementManager', 'WarehouseManager', 'QAManager', 'User',
];

@ApiTags('Workflow Tracking')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workflow-tracking')
export class WorkflowTrackingController {
  constructor(private readonly service: WorkflowTrackingService) {}

  // ── GET /workflow-tracking/:trackingId ─────────────────────────────
  @Get(':trackingId')
  @Roles(...INTERNAL_ROLES)
  @ApiOperation({
    summary: 'The whole workflow behind a tracking id',
    description:
      'Every document raised under the tracking id (material requisition, review, approval, ' +
      'RFQ, purchase order, …) with its latest status, and every step taken, oldest first.',
  })
  @ApiParam({ name: 'trackingId', example: 'TRK-7F3A9C2E-B41D0A55-9E2C6B10' })
  @ApiResponse({ status: 200, type: WorkflowTimelineDto })
  @ApiResponse({ status: 404, description: 'No workflow recorded for this tracking id' })
  async getTimeline(
    @Param('trackingId') trackingId: string,
    @Request() req: any,
  ): Promise<ResponseDto<WorkflowTimelineDto>> {
    return ResponseDto.success(await this.service.getTimeline(req.user.organizationId, trackingId.trim()));
  }
}
