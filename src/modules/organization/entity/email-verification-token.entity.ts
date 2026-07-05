import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

@Entity('email_verification_tokens')
export class EmailVerificationToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.emailVerificationTokens)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 10 })
  otpCode: string;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  verifiedAt: Date;

  @Column({ default: 0 })
  attemptCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
