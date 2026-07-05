import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationSubscription } from './entity/organization-subscription.entity';
import { Organization } from '../organization/entity/organization.entity';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';
import { OrganizationSubscriptionService } from './organization-subscription.service';
import { OrganizationSubscriptionController } from './organization-subscription.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([OrganizationSubscription, Organization, SubscriptionPlan])],
  providers:   [OrganizationSubscriptionService],
  controllers: [OrganizationSubscriptionController],
  exports:     [OrganizationSubscriptionService, TypeOrmModule],
})
export class OrganizationSubscriptionModule {}
