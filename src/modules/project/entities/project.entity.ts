import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Organization } from '../../organization/entity/organization.entity';
import { Client }       from '../../client/entities/client.entity';
import { ProjectType }  from '../../project-type/entity/project-type.entity';
import { User }         from '../../user/entity/user.entity';
import { MeasurementSystem } from '../../client/enums/client.enums';
import { ProjectStatus } from '../enums/project.enums';

// Project Master — one engineering / procurement / construction project of a
// client. Deliberately light: WBS, cost codes, areas, systems and work packages
// are configured after the project exists and hang off it later.
//
// The table is `project_masters` because `projects` is already taken by the
// user profile's work-history entries.
//
// The client is held by id only. The client's name is read through the
// relationship, never stored here, so a renamed client is renamed everywhere.

@Entity('project_masters')
@Index('UQ_project_org_code',    ['organizationId', 'code'], { unique: true })
@Index('IDX_project_org_status', ['organizationId', 'status'])
@Index('IDX_project_org_client', ['organizationId', 'clientId'])
@Index('IDX_project_org_name',   ['organizationId', 'projectName'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  // ── Organization scope ────────────────────────────────────────────

  @Column({ nullable: false })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // ── Identity ──────────────────────────────────────────────────────

  // Project number. Server-generated per-organization sequence (0001, 0002, …)
  // like the other masters; immutable once the project exists.
  @Column({ length: 20 })
  code: string;

  @Column({ length: 255 })
  projectName: string;

  @Column({ nullable: false })
  clientId: string;

  @ManyToOne(() => Client, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ nullable: false })
  projectTypeId: string;

  @ManyToOne(() => ProjectType, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'projectTypeId' })
  projectType: ProjectType;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.PLANNED })
  status: ProjectStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // ── Schedule ──────────────────────────────────────────────────────

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  // ── Ownership ─────────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 36, nullable: true })
  projectManagerId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'projectManagerId' })
  projectManager: User | null;

  // ── Site ──────────────────────────────────────────────────────────
  // The project's own site — not the client's registered address, since one
  // client may own several plants or facilities.

  @Column({ type: 'varchar', length: 255, nullable: true })
  siteLocation: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  addressLine1: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode: string | null;

  // ISO 3166-1 alpha-2.
  @Column({ type: 'varchar', length: 2, nullable: true })
  countryCode: string | null;

  // ── Contract & reporting ──────────────────────────────────────────

  @Column({ type: 'varchar', length: 100, nullable: true })
  contractNumber: string | null;

  // The client's own identifier for this project.
  @Column({ type: 'varchar', length: 100, nullable: true })
  clientProjectReference: string | null;

  // ISO 4217 — reporting and budgeting currency.
  @Column({ type: 'varchar', length: 3, nullable: true })
  currencyCode: string | null;

  @Column({ type: 'enum', enum: MeasurementSystem, nullable: true })
  measurementSystem: MeasurementSystem | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  timeZone: string | null;

  // ── Last status change ────────────────────────────────────────────

  @Column({ type: 'varchar', length: 500, nullable: true })
  statusReason: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  statusChangedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  statusChangedAt: Date | null;

  // ── Soft delete ───────────────────────────────────────────────────

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
