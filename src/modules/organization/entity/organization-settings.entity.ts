import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

@Entity('organization_settings')
export class OrganizationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.settings)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ nullable: true, length: 255 })
  logoUrl: string;

  @Column({ nullable: true, length: 100, default: 'UTC' })
  timezone: string;

  @Column({ nullable: true, length: 10, default: 'en' })
  language: string;

  @Column({ nullable: true, length: 20, default: 'YYYY-MM-DD' })
  dateFormat: string;

  @Column({ nullable: true, length: 10, default: 'USD' })
  currency: string;

  @Column({ nullable: true, length: 7 })
  primaryColor: string;

  @Column({ nullable: true, length: 7 })
  secondaryColor: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
