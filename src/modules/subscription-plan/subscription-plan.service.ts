import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingCycle, SubscriptionPlan } from './entity/subscription-plan.entity';

@Injectable()
export class SubscriptionPlanService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
  ) {}

  async findAll(): Promise<{ monthly: SubscriptionPlan[]; yearly: SubscriptionPlan[] }> {
    const plans = await this.planRepo.find({ where: { isActive: true }, order: { amount: 'ASC' } });
    return {
      monthly: plans.filter((p) => p.billingCycle === BillingCycle.MONTHLY),
      yearly:  plans.filter((p) => p.billingCycle === BillingCycle.YEARLY),
    };
  }

  async findById(id: string): Promise<SubscriptionPlan> {
    const plan = await this.planRepo.findOne({ where: { id, isActive: true } });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return plan;
  }
}
