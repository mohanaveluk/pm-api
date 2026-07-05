import {
  Injectable, CanActivate, ExecutionContext,
  ForbiddenException, HttpException, HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { OrganizationSubscription, SubscriptionStatusEnum } from 'src/modules/organization-subscription/entity/organization-subscription.entity';
import { User } from 'src/modules/user/entity/user.entity';

@Injectable()
export class SubscriptionEnforcementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(OrganizationSubscription)
    private readonly subRepo: Repository<OrganizationSubscription>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.organizationId) return true;

    const activeSub = await this.subRepo.findOne({
      where: { organizationId: user.organizationId, status: SubscriptionStatusEnum.ACTIVE },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });

    if (!activeSub) {
      throw new HttpException(
        'Your organization does not have an active subscription. Please subscribe to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    if (activeSub.endDate < new Date()) {
      throw new HttpException(
        'Your subscription has expired. Please renew to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const userCount = await this.userRepo.count({ where: { organizationId: user.organizationId } });
    if (activeSub.plan?.maxUsers && userCount > activeSub.plan.maxUsers) {
      throw new ForbiddenException(
        `User limit exceeded. Your plan allows ${activeSub.plan.maxUsers} users.`,
      );
    }

    return true;
  }
}
