import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../organization/entity/organization.entity';
import { User } from '../user/entity/user.entity';
import { OrganizationSubscription } from '../organization-subscription/entity/organization-subscription.entity';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([Organization, User, OrganizationSubscription, SubscriptionPlan])],
  providers:   [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
