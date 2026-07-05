import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Organization } from '../../organization/entity/organization.entity';
import { SubscriptionPlan } from '../../subscription-plan/entity/subscription-plan.entity';
import { BillingCycle } from '../../subscription-plan/entity/subscription-plan.entity';

export enum SubscriptionStatusEnum {
  ACTIVE    = 'ACTIVE',
  EXPIRED   = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  PENDING   = 'PENDING',
}

@Entity('organization_subscriptions')
export class OrganizationSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.subscriptions)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ length: 255 })
  planId: string;

  @ManyToOne(() => SubscriptionPlan)
  @JoinColumn({ name: 'planId' })
  plan: SubscriptionPlan;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: BillingCycle })
  billingCycle: BillingCycle;

  @Column({ type: 'enum', enum: SubscriptionStatusEnum, default: SubscriptionStatusEnum.ACTIVE })
  status: SubscriptionStatusEnum;

  @Column({ nullable: true, type: 'date' })
  renewalDate: Date;

  @CreateDateColumn()
  createdAt: Date;
}
