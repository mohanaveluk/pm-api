import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Organization } from '../../organization/entity/organization.entity';

@Entity('payment_information')
export class PaymentInformation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.payments)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ nullable: true, length: 255 })
  accountName: string;

  @Column({ nullable: true, length: 255 })
  bankName: string;

  @Column({ nullable: true, length: 50 })
  accountNumber: string;

  @Column({ nullable: true, length: 20 })
  routingNumber: string;

  @Column({ nullable: true, length: 20 })
  swiftCode: string;

  @Column({ nullable: true, length: 50 })
  iban: string;

  @Column({ nullable: true, type: 'text' })
  paymentInstructions: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  monthlyAmount: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  yearlyAmount: number;

  @Column({ nullable: true, length: 10, default: 'USD' })
  currency: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
