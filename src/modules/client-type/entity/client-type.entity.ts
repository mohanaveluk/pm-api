import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Organization } from '../../organization/entity/organization.entity';

// Client Type master — the administrable classification of what kind of
// organization a client is (owner, operator, EPC contractor, consultant,
// government, …).
//
// Structurally identical to the Vendor Type and Department masters:
// organization-scoped, server-generated code, soft delete, audit columns.
// Every organization administers its own client types here; a default set is
// seeded the first time an organization uses the master.
@Entity('client_types')
@Index(['organizationId', 'code'], { unique: true })
export class ClientType {
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

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, nullable: true })
  shortName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

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
}
