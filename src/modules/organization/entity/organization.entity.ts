import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { OrganizationSubscription } from '../../organization-subscription/entity/organization-subscription.entity';
import { PaymentInformation } from '../../payment/entity/payment-information.entity';
import { EmailVerificationToken } from './email-verification-token.entity';
import { OrganizationSettings } from './organization-settings.entity';

export enum SubscriptionStatus {
  PENDING   = 'PENDING',
  ACTIVE    = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
  EXPIRED   = 'EXPIRED',
}

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  organizationCode: string;

  @Column({ length: 255 })
  organizationName: string;

  @Column({ nullable: true, length: 255 })
  legalName: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ nullable: true, length: 30 })
  phoneNumber: string;

  @Column({ nullable: true, length: 255 })
  website: string;

  @Column({ nullable: true, length: 255 })
  addressLine1: string;

  @Column({ nullable: true, length: 255 })
  addressLine2: string;

  @Column({ nullable: true, length: 100 })
  city: string;

  @Column({ nullable: true, length: 100 })
  state: string;

  @Column({ nullable: true, length: 100 })
  country: string;

  @Column({ nullable: true, length: 20 })
  postalCode: string;

  @Column({ nullable: true, length: 50 })
  taxNumber: string;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.PENDING })
  subscriptionStatus: SubscriptionStatus;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ default: false })
  isActive: boolean;

  @Column({ nullable: true, length: 255 })
  logoUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;

  @Column({ nullable: true, length: 255 })
  createdBy: string;

  @Column({ nullable: true, length: 255 })
  updatedBy: string;

  @Index({ unique: true })
  @Column({nullable: false})
  oguid: string

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToMany(() => OrganizationSubscription, (sub) => sub.organization)
  subscriptions: OrganizationSubscription[];

  @OneToMany(() => PaymentInformation, (p) => p.organization)
  payments: PaymentInformation[];

  @OneToMany(() => EmailVerificationToken, (t) => t.organization)
  emailVerificationTokens: EmailVerificationToken[];

  @OneToMany(() => OrganizationSettings, (s) => s.organization)
  settings: OrganizationSettings[];
}
