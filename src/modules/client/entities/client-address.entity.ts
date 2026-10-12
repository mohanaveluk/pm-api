import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { ClientAddressType } from '../enums/client.enums';

// One reusable address structure for every kind of client premises: the single
// registered office plus any number of operational / regional offices.

@Entity('client_addresses')
@Index('IDX_cad_org_client',  ['organizationId', 'clientId'])
@Index('IDX_cad_org_deleted', ['organizationId', 'isDeleted'])
export class ClientAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: false })
  dguid: string;

  @Column({ nullable: false })
  organizationId: string;

  @Column({ nullable: false })
  clientId: string;

  @ManyToOne(() => Client, c => c.addresses, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ type: 'enum', enum: ClientAddressType, nullable: false })
  addressType: ClientAddressType;

  // Free label for an operational office, e.g. "Dubai Regional Office".
  @Column({ type: 'varchar', length: 100, nullable: true })
  label: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  addressLine1: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  addressLine2: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode: string | null;

  // ISO 3166-1 alpha-2.
  @Column({ type: 'varchar', length: 2, nullable: true })
  countryCode: string | null;

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
