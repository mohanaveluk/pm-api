import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  YEARLY  = 'YEARLY',
}

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  planCode: string;

  @Column({ length: 100 })
  planName: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: BillingCycle })
  billingCycle: BillingCycle;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 10 })
  maxUsers: number;

  @Column({ nullable: true })
  storageLimit: number;

  @Column({ nullable: true, type: 'json' })
  featuresJson: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
