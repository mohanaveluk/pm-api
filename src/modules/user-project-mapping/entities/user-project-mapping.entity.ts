import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Organization } from '../../organization/entity/organization.entity';
import { Project } from '../../project/entities/project.entity';
import { User } from '../../user/entity/user.entity';
import { UserProjectMappingStatus } from '../enums/user-project-mapping.enums';

// One row per project ↔ internal user. Never a list of user ids in one column:
// a row can be revoked, audited and filtered on its own.
//
// The (organization, project, user) pair is unique across deleted rows too —
// assigning a user again revives their old row instead of adding a second one,
// so a pair never has two live assignments and its history stays in one place.
@Entity('user_project_mappings')
@Unique('UQ_upm_org_project_user', ['organizationId', 'projectId', 'userId'])
@Index('IDX_upm_org_user', ['organizationId', 'userId', 'status'])
@Index('IDX_upm_org_project', ['organizationId', 'projectId'])
export class UserProjectMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  dguid: string;

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ length: 36 })
  projectId: string;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ length: 36 })
  userId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: UserProjectMappingStatus, default: UserProjectMappingStatus.ACTIVE })
  status: UserProjectMappingStatus;

  // Who gave this user the project, and when (renewed when a removed user is assigned again).
  @Column({ type: 'varchar', length: 255, nullable: true })
  assignedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  assignedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deactivatedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  deactivatedAt: Date | null;

  // Shared by every row of the project: ties the project's assignment steps in
  // workflow_events together (see UserProjectMappingService.track).
  @Column({ type: 'varchar', length: 30, nullable: true })
  trackingId: string | null;

  // ── Soft delete (a user removed from the project) ─────────────────

  @Column({ default: false, name: 'is_deleted' })
  isDeleted: boolean;

  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deletedBy: string | null;

  // ── Audit ─────────────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
