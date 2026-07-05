import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { PaymentService } from './payment.service';
import { BillingCycle } from '../subscription-plan/entity/subscription-plan.entity';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Public()
  @Get('info')
  @ApiOperation({
    summary: 'Get payment information for a plan',
    description: 'Returns bank details and amount for the selected plan and billing cycle',
  })
  @ApiQuery({ name: 'planId', type: String, description: 'UUID of the subscription plan' })
  @ApiQuery({ name: 'billingCycle', enum: BillingCycle, description: 'MONTHLY or YEARLY' })
  @ApiResponse({
    status: 200,
    description: 'Payment information',
    schema: {
      example: {
        planName: 'Business',
        amount: 99,
        currency: 'USD',
        billingCycle: 'MONTHLY',
        bankDetails: {
          accountName: 'Company Inc',
          bankName: 'First National Bank',
          accountNumber: '1234567890',
          routingNumber: '021000021',
          swiftCode: 'FNBAUS33',
          iban: null,
          paymentInstructions: 'Include your organization code in the wire reference',
        },
      },
    },
  })
  getPaymentInfo(
    @Query('planId') planId: string,
    @Query('billingCycle') billingCycle: BillingCycle,
  ) {
    return this.paymentService.getPaymentInfo(planId, billingCycle);
  }
}
