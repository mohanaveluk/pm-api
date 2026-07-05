import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from './entity/subscription-plan.entity';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPlanController } from './subscription-plan.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([SubscriptionPlan])],
  providers:   [SubscriptionPlanService],
  controllers: [SubscriptionPlanController],
  exports:     [SubscriptionPlanService, TypeOrmModule],
})
export class SubscriptionPlanModule {}
