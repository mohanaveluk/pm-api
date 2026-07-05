import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SubscriptionPlanService } from './subscription-plan.service';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Subscription Plans')
@Controller('subscription-plans')
export class SubscriptionPlanController {
  constructor(private readonly planService: SubscriptionPlanService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get all active subscription plans',
    description: 'Public endpoint. Returns plans grouped by billing cycle.',
  })
  @ApiResponse({
    status: 200,
    description: 'Plans grouped by billing cycle',
    schema: {
      example: {
        monthly: [{ id: 'uuid', planCode: 'STARTER_MONTHLY', planName: 'Starter', amount: 29, maxUsers: 10, billingCycle: 'MONTHLY', featuresJson: {} }],
        yearly:  [{ id: 'uuid', planCode: 'STARTER_YEARLY',  planName: 'Starter', amount: 290, maxUsers: 10, billingCycle: 'YEARLY', featuresJson: {} }],
      },
    },
  })
  findAll() {
    return this.planService.findAll();
  }
}
