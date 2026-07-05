import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles('OrganizationAdmin', 'Manager')
  @Get('summary')
  @ApiOperation({ summary: 'Get organization dashboard summary' })
  @ApiResponse({
    status: 200,
    description: 'Summary of users, subscription, and organization status',
    schema: {
      example: {
        organization: { id: 'uuid', name: 'Acme Corp', code: 'ORG-ABCD1234', status: 'ACTIVE' },
        users: { total: 8, active: 7, inactive: 1, maxAllowed: 10, utilizationPercent: 80 },
        subscription: {
          planName: 'Business', billingCycle: 'MONTHLY', status: 'ACTIVE',
          startDate: '2026-01-01', endDate: '2026-02-01', renewalDate: '2026-02-01', amount: 99,
        },
      },
    },
  })
  getSummary(@Request() req: any) {
    return this.dashboardService.getSummary(req.user.organizationId);
  }
}
