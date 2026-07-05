import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentInformation } from './entity/payment-information.entity';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([PaymentInformation, SubscriptionPlan])],
  providers:   [PaymentService],
  controllers: [PaymentController],
  exports:     [PaymentService],
})
export class PaymentModule {}
