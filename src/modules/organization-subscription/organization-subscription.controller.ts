import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { OrganizationSubscriptionService } from './organization-subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('Subscriptions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subscriptions')
export class OrganizationSubscriptionController {
  constructor(private readonly subService: OrganizationSubscriptionService) {}

  @Roles('OrganizationAdmin')
  @Post()
  @ApiOperation({ summary: 'Create a subscription for the organization (OrganizationAdmin only)' })
  @ApiBody({ type: CreateSubscriptionDto })
  @ApiResponse({ status: 201, description: 'Subscription created with plan and billing summary' })
  @ApiResponse({ status: 400, description: 'Invalid plan or billing cycle mismatch' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  create(@Body() dto: CreateSubscriptionDto, @Request() req: any) {
    return this.subService.create(req.user.organizationId, dto);
  }

  @Roles('OrganizationAdmin')
  @Get('active')
  @ApiOperation({ summary: 'Get active subscription for the organization' })
  @ApiResponse({ status: 200, description: 'Active subscription details' })
  getActive(@Request() req: any) {
    return this.subService.findActiveByOrg(req.user.organizationId);
  }
}
