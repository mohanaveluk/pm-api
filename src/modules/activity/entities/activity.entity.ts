import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Organization } from '../../organization/entity/organization.entity';
import { Department } from '../../department/entity/department.entity';
import { Discipline } from '../../discipline/entity/discipline.entity';
import { DepartmentDiscipline } from '../../department-discipline/entities/department-discipline.entity';

@Entity('activities')
@Unique('UQ_activity_dd_code',     ['organizationId', 'departmentDisciplineId', 'code'])
@Unique('UQ_activity_dd_name',     ['organizationId', 'departmentDisciplineId', 'name'])
@Index('IDX_activity_org',         ['organizationId'])
@Index('IDX_activity_dept',        ['departmentId'])
@Index('IDX_activity_disc',        ['disciplineId'])
@Index('IDX_activity_dd',          ['departmentDisciplineId'])
@Index('IDX_activity_code',        ['code'])
@Index('IDX_activity_name',        ['name'])
@Index('IDX_activity_active',      ['isActive'])
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  // ── Org / dept / discipline ───────────────────────────────────────

  @Column({ nullable: false })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ nullable: false })
  departmentId: string;

  @ManyToOne(() => Department, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @Column({ nullable: false })
  disciplineId: string;

  @ManyToOne(() => Discipline, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'disciplineId' })
  discipline: Discipline;

  @Column({ nullable: false })
  departmentDisciplineId: string;

  @ManyToOne(() => DepartmentDiscipline, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'departmentDisciplineId' })
  departmentDiscipline: DepartmentDiscipline;

  // ── Identity ──────────────────────────────────────────────────────

  @Column({ length: 30 })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 80, nullable: true })
  shortName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // ── Classification / navigation ───────────────────────────────────

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ length: 100, nullable: true })
  moduleGroup: string;

  @Column({ length: 100, nullable: true })
  icon: string;

  @Column({ length: 255, nullable: true })
  routeUrl: string;

  // Stable unique key used by downstream Feature/Permission/Menu modules
  @Column({ length: 100, nullable: true })
  featureKey: string;

  // ── Flags ─────────────────────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ default: false })
  isSystem: boolean;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  // ── Soft delete ───────────────────────────────────────────────────

  @Column({ default: false, name: 'is_deleted' })
  isDeleted: boolean;

  @Column({ nullable: true })
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
