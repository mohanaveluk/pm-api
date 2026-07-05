import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { BillingCycle } from '../../subscription-plan/entity/subscription-plan.entity';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'uuid-of-plan' })
  @IsUUID()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({ enum: BillingCycle, example: BillingCycle.MONTHLY })
  @IsEnum(BillingCycle)
  @IsNotEmpty()
  billingCycle: BillingCycle;
}
