import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, Index, Unique,
} from 'typeorm';
import { ServiceGroupActivity } from './service-group-activity.entity';
import { PermissionType } from '../enums/permission-type.enum';

@Entity('service_group_permissions')
@Unique('UQ_sgp_sga_type', ['serviceGroupActivityId', 'permissionType'])
@Index('IDX_sgp_sga',    ['serviceGroupActivityId'])
@Index('IDX_sgp_type',   ['permissionType'])
@Index('IDX_sgp_allowed', ['isAllowed'])
export class ServiceGroupPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  serviceGroupActivityId: string;

  @ManyToOne(() => ServiceGroupActivity, (sga) => sga.permissions, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceGroupActivityId' })
  serviceGroupActivity: ServiceGroupActivity;

  @Column({ type: 'enum', enum: PermissionType })
  permissionType: PermissionType;

  @Column({ default: true })
  isAllowed: boolean;
}
