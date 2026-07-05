import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('account_audit_log')
export class AccountAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_guid', nullable: true, length: 255 })
  accountGuid: string;

  @Column({ name: 'api_name', length: 255 })
  apiName: string;

  @Column({ name: 'http_method', length: 10 })
  httpMethod: string;

  @Column({ name: 'endpoint', length: 500 })
  endpoint: string;

  @Column({ name: 'status_code' })
  statusCode: number;

  @Column({ name: 'response_time_ms' })
  responseTimeMs: number;

  @Column({ name: 'user_id', nullable: true, length: 255 })
  userId: string;

  @Column({ nullable: true, length: 1000 })
  error: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
