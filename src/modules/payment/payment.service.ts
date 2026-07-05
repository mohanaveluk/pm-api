import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentInformation } from './entity/payment-information.entity';
import { SubscriptionPlan, BillingCycle } from '../subscription-plan/entity/subscription-plan.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(PaymentInformation)
    private readonly paymentRepo: Repository<PaymentInformation>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
  ) {}

  async getPaymentInfo(planId: string, billingCycle: BillingCycle) {
    const plan = await this.planRepo.findOne({ where: { id: planId, isActive: true } });
    if (!plan) throw new NotFoundException('Plan not found');

    const payment = await this.paymentRepo.findOne({ where: { isActive: true } });

    const amount = plan.billingCycle === billingCycle ? plan.amount :
      (billingCycle === BillingCycle.YEARLY && payment?.yearlyAmount)
        ? payment.yearlyAmount
        : payment?.monthlyAmount ?? plan.amount;

    return {
      planName: plan.planName,
      amount: amount,
      currency: payment?.currency ?? 'USD',
      billingCycle,
      bankDetails: payment ? {
        accountName:        payment.accountName,
        bankName:           payment.bankName,
        accountNumber:      payment.accountNumber,
        routingNumber:      payment.routingNumber,
        swiftCode:          payment.swiftCode,
        iban:               payment.iban,
        paymentInstructions: payment.paymentInstructions,
      } : null,
    };
  }
}
