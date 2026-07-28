import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, OneToMany, JoinColumn, Unique,
} from 'typeorm';
import { ServiceGroup } from './service-group.entity';
import { Activity } from '../../activity/entities/activity.entity';
import { ServiceGroupPermission } from './service-group-permission.entity';

@Entity('service_group_activities')
@Unique('UQ_sga_sg_activity', ['serviceGroupId', 'activityId'])
@Index('IDX_sga_sg',     ['serviceGroupId'])
@Index('IDX_sga_act',   ['activityId'])
@Index('IDX_sga_active', ['isActive'])
export class ServiceGroupActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  serviceGroupId: string;

  @ManyToOne(() => ServiceGroup, (sg) => sg.serviceGroupActivities, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceGroupId' })
  serviceGroup: ServiceGroup;

  @Column({ nullable: false })
  activityId: string;

  @ManyToOne(() => Activity, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'activityId' })
  activity: Activity;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ServiceGroupPermission, (perm) => perm.serviceGroupActivity, { cascade: true })
  permissions: ServiceGroupPermission[];
}
