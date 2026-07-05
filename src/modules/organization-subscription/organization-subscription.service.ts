import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { addMonths, addYears } from 'date-fns';
import { OrganizationSubscription, SubscriptionStatusEnum } from './entity/organization-subscription.entity';
import { Organization, SubscriptionStatus } from '../organization/entity/organization.entity';
import { SubscriptionPlan, BillingCycle } from '../subscription-plan/entity/subscription-plan.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class OrganizationSubscriptionService {
  constructor(
    @InjectRepository(OrganizationSubscription)
    private readonly subRepo: Repository<OrganizationSubscription>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
  ) {}

  async create(organizationId: string, dto: CreateSubscriptionDto): Promise<OrganizationSubscription> {
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const plan = await this.planRepo.findOne({ where: { id: dto.planId, isActive: true } });
    if (!plan) throw new NotFoundException('Subscription plan not found');

    if (plan.billingCycle !== dto.billingCycle) {
      throw new BadRequestException(`This plan only supports ${plan.billingCycle} billing`);
    }

    const startDate = new Date();
    const endDate = dto.billingCycle === BillingCycle.MONTHLY
      ? addMonths(startDate, 1)
      : addYears(startDate, 1);

    const sub = this.subRepo.create({
      organizationId,
      planId: dto.planId,
      startDate,
      endDate,
      amount: plan.amount,
      billingCycle: dto.billingCycle,
      status: SubscriptionStatusEnum.ACTIVE,
      renewalDate: endDate,
    });

    const saved = await this.subRepo.save(sub);

    org.subscriptionStatus = SubscriptionStatus.ACTIVE;
    await this.orgRepo.save(org);

    return this.subRepo.findOne({ where: { id: saved.id }, relations: ['plan', 'organization'] });
  }

  async findActiveByOrg(organizationId: string): Promise<OrganizationSubscription | null> {
    return this.subRepo.findOne({
      where: { organizationId, status: SubscriptionStatusEnum.ACTIVE },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }
}
