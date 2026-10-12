import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { ClientContactRole, PreferredContactMethod } from '../enums/client.enums';

// A client has many contact people. At most one active contact is flagged
// isPrimary; the project / procurement / finance flags are independent, so one
// person can hold several responsibilities.

@Entity('client_contacts')
@Index('IDX_cct_org_client',  ['organizationId', 'clientId'])
@Index('IDX_cct_org_deleted', ['organizationId', 'isDeleted'])
export class ClientContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  clientId: string;

  @ManyToOne(() => Client, c => c.contacts, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ length: 255, nullable: false })
  contactName: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  jobTitle: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string | null;

  @Column({ type: 'enum', enum: ClientContactRole, nullable: true })
  contactRole: ClientContactRole | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  // Stored as strings so international formats survive intact.
  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  mobile: string | null;

  @Column({ type: 'enum', enum: PreferredContactMethod, nullable: true })
  preferredContactMethod: PreferredContactMethod | null;

  @Column({ default: false })
  isPrimary: boolean;

  @Column({ default: false })
  isProjectContact: boolean;

  @Column({ default: false })
  isProcurementContact: boolean;

  @Column({ default: false })
  isFinanceContact: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false, name: 'is_deleted' })
  isDeleted: boolean;

  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deletedBy: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
