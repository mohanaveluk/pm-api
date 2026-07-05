import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../organization/entity/organization.entity';
import { User } from '../user/entity/user.entity';
import { OrganizationSubscription, SubscriptionStatusEnum } from '../organization-subscription/entity/organization-subscription.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(OrganizationSubscription)
    private readonly subRepo: Repository<OrganizationSubscription>,
  ) {}

  async getSummary(organizationId: string) {
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const totalUsers = await this.userRepo.count({ where: { organizationId } });
    const activeUsers = await this.userRepo.count({ where: { organizationId, is_active: 1 } });

    const activeSub = await this.subRepo.findOne({
      where: { organizationId, status: SubscriptionStatusEnum.ACTIVE },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });

    const maxUsers = activeSub?.plan?.maxUsers ?? 0;
    const userUtilization = maxUsers > 0 ? Math.round((totalUsers / maxUsers) * 100) : 0;

    return {
      organization: {
        id: org.id,
        name: org.organizationName,
        code: org.organizationCode,
        status: org.subscriptionStatus,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        maxAllowed: maxUsers,
        utilizationPercent: userUtilization,
      },
      subscription: activeSub ? {
        planName:    activeSub.plan?.planName,
        billingCycle: activeSub.billingCycle,
        status:      activeSub.status,
        startDate:   activeSub.startDate,
        endDate:     activeSub.endDate,
        renewalDate: activeSub.renewalDate,
        amount:      activeSub.amount,
      } : null,
    };
  }
}
