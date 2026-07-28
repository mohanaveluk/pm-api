import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, OneToMany, JoinColumn, Unique,
} from 'typeorm';
import { Organization } from '../../organization/entity/organization.entity';
import { ServiceGroupActivity } from './service-group-activity.entity';
import { GroupType } from '../enums/permission-type.enum';

@Entity('service_groups')
@Unique('UQ_sg_org_code', ['organizationId', 'code'])
@Unique('UQ_sg_org_name', ['organizationId', 'name'])
@Index('IDX_sg_org',    ['organizationId'])
@Index('IDX_sg_active', ['isActive'])
export class ServiceGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // Immutable after creation
  @Column({ length: 50 })
  code: string;

  // Immutable after creation
  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: GroupType, default: GroupType.CUSTOM })
  groupType: GroupType;

  @Column({ default: false })
  isSystem: boolean;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ default: false, name: 'is_deleted' })
  isDeleted: boolean;

  @Column({ nullable: true })
  deletedAt: Date;

  @Column({ length: 255, nullable: true })
  deletedBy: string;

  @Column({ length: 255, nullable: true })
  createdBy: string;

  @Column({ length: 255, nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ServiceGroupActivity, (sga) => sga.serviceGroup, { cascade: true })
  serviceGroupActivities: ServiceGroupActivity[];
}
