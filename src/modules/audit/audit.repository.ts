import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountAuditLog } from './entity/account-audit-log.entity';

export interface AuditLogEntry {
  accountGuid?: string;
  userId?: string;
  apiName: string;
  method: string;
  endpoint: string;
  statusCode: number;
  duration: number;
  error?: string;
}

@Injectable()
export class AuditRepository {
  constructor(
    @InjectRepository(AccountAuditLog)
    private readonly repo: Repository<AccountAuditLog>,
  ) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.repo.save(
      this.repo.create({
        accountGuid: entry.accountGuid,
        userId: entry.userId,
        apiName: entry.apiName,
        httpMethod: entry.method,
        endpoint: entry.endpoint,
        statusCode: entry.statusCode,
        responseTimeMs: entry.duration,
        error: entry.error,
      }),
    );
  }
}
