import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Organization }     from '../../organization/entity/organization.entity';
import { ClientType }       from '../../client-type/entity/client-type.entity';
import { IndustryCategory } from '../../industry-category/entities/industry-category.entity';
import { ProjectType }      from '../../project-type/entity/project-type.entity';
import { ClientStatus, MeasurementSystem } from '../enums/client.enums';
import { ClientAddress }  from './client-address.entity';
import { ClientContact }  from './client-contact.entity';
import { ClientDocument } from './client-document.entity';

// Client Master — the organizations a company works for (owners, operators, EPC
// companies, consultants, government bodies …). A client later has many
// projects, each with its own WBS and cost codes.
//
// Kept focused on identity and lifecycle. Repeatable data (addresses, contacts,
// documents) lives in child tables. The commercial settings and the project
// defaults are stored on this row for the first release — each is a single set
// of optional values per client — but are exposed as nested objects by the API,
// so moving them to their own tables later does not change the contract.

@Entity('clients')
@Index('UQ_client_org_code',    ['organizationId', 'code'], { unique: true })
@Index('IDX_client_org_name',   ['organizationId', 'clientName'])
@Index('IDX_client_org_type',   ['organizationId', 'clientTypeId'])
@Index('IDX_client_org_status', ['organizationId', 'status'])
@Index('IDX_client_parent',     ['parentClientId'])
export class Client {
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

  // Server-generated per-organization sequence (0001, 0002, …), like the other
  // masters. Immutable once the client exists.
  @Column({ length: 20 })
  code: string;

  @Column({ length: 255 })
  clientName: string;

  // Short name shown in dropdowns; falls back to clientName when empty.
  @Column({ type: 'varchar', length: 100, nullable: true })
  displayName: string | null;

  @Column({ nullable: false })
  clientTypeId: string;

  @ManyToOne(() => ClientType, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clientTypeId' })
  clientType: ClientType;

  @Column({ type: 'varchar', length: 36, nullable: true })
  industryCategoryId: string | null;

  @ManyToOne(() => IndustryCategory, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'industryCategoryId' })
  industryCategory: IndustryCategory | null;

  // Links a subsidiary to its parent organization.
  @Column({ type: 'varchar', length: 36, nullable: true })
  parentClientId: string | null;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parentClientId' })
  parentClient: Client | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  // ISO 3166-1 alpha-2 — country of registration.
  @Column({ type: 'varchar', length: 2, nullable: true })
  countryCode: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Internal remarks.
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // ── Lifecycle ─────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: ClientStatus, default: ClientStatus.ACTIVE })
  status: ClientStatus;

  // Mirrors `status === ACTIVE`; maintained by the service, never set directly.
  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deactivatedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  deactivatedAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  deactivationReason: string | null;

  // Incremented on every update; an update that names a stale version is
  // rejected instead of silently overwriting someone else's change.
  @Column({ type: 'int', default: 1 })
  version: number;

  // ── Addresses: client-level settings ──────────────────────────────

  @Column({ default: true })
  operationalAddressSameAsRegistered: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  timeZone: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  preferredLanguage: string | null;

  // ── Legal, commercial and contracting ─────────────────────────────

  @Column({ type: 'varchar', length: 255, nullable: true })
  legalEntityName: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  legalEntityType: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  registrationNumber: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  taxRegistrationNumber: string | null;

  // D-U-N-S or another external business identifier.
  @Column({ type: 'varchar', length: 50, nullable: true })
  externalBusinessId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contractingEntityName: string | null;

  @Column({ type: 'varchar', length: 3, nullable: true })
  defaultCurrencyCode: string | null;

  // Controlled values of the shared PaymentTerms enum (vendor module).
  @Column({ type: 'varchar', length: 30, nullable: true })
  defaultPaymentTerms: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contractReferenceFormat: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  purchaseOrderReferenceFormat: string | null;

  @Column({ type: 'varchar', length: 3, nullable: true })
  defaultIncoterms: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  taxRegion: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  dateFormat: string | null;

  // ── Project and operational defaults ──────────────────────────────
  // Defaults only: a project may override any of them.

  @Column({ type: 'varchar', length: 36, nullable: true })
  defaultProjectTypeId: string | null;

  @ManyToOne(() => ProjectType, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'defaultProjectTypeId' })
  defaultProjectType: ProjectType | null;

  @Column({ type: 'varchar', length: 3, nullable: true })
  defaultProjectCurrencyCode: string | null;

  @Column({ type: 'enum', enum: MeasurementSystem, nullable: true })
  measurementSystem: MeasurementSystem | null;

  // The following reference configuration that has no master of its own yet,
  // so they hold a descriptive name; they become lookups when those masters
  // exist.
  @Column({ type: 'varchar', length: 100, nullable: true })
  documentNumberingScheme: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  defaultWbsTemplate: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  defaultCostCodeScheme: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  defaultApprovalWorkflow: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  defaultProcurementTerms: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  documentPortalUrl: string | null;

  @Column({ default: false })
  requiresClientApproval: boolean;

  @Column({ default: false })
  requiresDocumentControl: boolean;

  // ── Children ──────────────────────────────────────────────────────

  @OneToMany(() => ClientAddress, a => a.client)
  addresses: ClientAddress[];

  @OneToMany(() => ClientContact, c => c.client)
  contacts: ClientContact[];

  @OneToMany(() => ClientDocument, d => d.client)
  documents: ClientDocument[];

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
