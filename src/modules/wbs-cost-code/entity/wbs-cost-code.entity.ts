import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Organization } from '../../organization/entity/organization.entity';
import { Discipline } from '../../discipline/entity/discipline.entity';
import { Project } from '../../project/entities/project.entity';

// WBS / Cost Code master — one row per work-breakdown / cost-code entry of a
// project: which area/facility and system it covers, the owning discipline, the
// work package it rolls up to and the schedule-level activities it contains.
//
// Organization-scoped with a server-generated sequential code, soft delete and
// audit columns, like the other masters (Vendor Type, Project Type, …).
@Entity('wbs_cost_codes')
@Index(['organizationId', 'code'], { unique: true })
@Index('IDX_wbs_cost_code_discipline', ['disciplineId'])
@Index('IDX_wbs_cost_code_project', ['projectId'])
export class WbsCostCode {
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

  @Column({ length: 20 })
  code: string;

  // The WBS / cost name.
  @Column({ length: 255 })
  projectDetails: string;

  // The project this entry belongs to. Held by id only: the project's number,
  // name and client are read through the relationship. Nullable because entries
  // created before projects existed have none.
  @Column({ type: 'varchar', length: 36, nullable: true })
  projectId: string | null;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'projectId' })
  project: Project | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  areaFacility: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  systemSubsystem: string | null;

  // Optional: a cost code is not always owned by a single discipline. RESTRICT
  // (rather than CASCADE) so removing a discipline can never silently erase
  // cost codes; disciplines are soft-deleted anyway.
  @Column({ type: 'varchar', length: 36, nullable: true })
  disciplineId: string | null;

  @ManyToOne(() => Discipline, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'disciplineId' })
  discipline: Discipline | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  workPackage: string | null;

  // Schedule-level activities — free text, may list several.
  @Column({ type: 'text', nullable: true })
  activities: string | null;

  @Column({ default: true })
  isActive: boolean;

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
}
