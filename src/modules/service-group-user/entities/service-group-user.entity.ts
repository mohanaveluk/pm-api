import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Organization } from '../../organization/entity/organization.entity';
import { ServiceGroup } from '../../service-group/entities/service-group.entity';
import { User } from '../../user/entity/user.entity';
import { AssignmentType } from '../enums/assignment-type.enum';

@Entity('service_group_users')
@Unique('UQ_sgu_org_sg_user', ['organizationId', 'serviceGroupId', 'userId'])
@Index('IDX_sgu_org',        ['organizationId'])
@Index('IDX_sgu_sg',         ['serviceGroupId'])
@Index('IDX_sgu_user',       ['userId'])
@Index('IDX_sgu_active',     ['isActive'])
@Index('IDX_sgu_deleted',    ['isDeleted'])
export class ServiceGroupUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  // ── Foreign keys ──────────────────────────────────────────────────

  @Column({ nullable: false })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ nullable: false })
  serviceGroupId: string;

  @ManyToOne(() => ServiceGroup, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'serviceGroupId' })
  serviceGroup: ServiceGroup;

  @Column({ nullable: false })
  userId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  // ── Assignment metadata ───────────────────────────────────────────

  @Column({ type: 'enum', enum: AssignmentType, default: AssignmentType.MANUAL })
  assignmentType: AssignmentType;

  // Optional time-bound access window (for temporary / delegated access)
  @Column({ nullable: true, type: 'datetime' })
  effectiveFrom: Date;

  @Column({ nullable: true, type: 'datetime' })
  effectiveTo: Date;

  @Column({ default: false })
  isPrimary: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  // ── Disable audit ─────────────────────────────────────────────────

  @Column({ nullable: true, type: 'datetime' })
  disabledAt: Date;

  @Column({ length: 255, nullable: true })
  disabledBy: string;

  // ── Soft delete ───────────────────────────────────────────────────

  @Column({ default: false, name: 'is_deleted' })
  isDeleted: boolean;

  @Column({ nullable: true, type: 'datetime' })
  deletedAt: Date;

  @Column({ length: 255, nullable: true })
  deletedBy: string;

  // ── Audit ─────────────────────────────────────────────────────────

  @Column({ length: 255, nullable: true })
  createdBy: string;

  @Column({ length: 255, nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
