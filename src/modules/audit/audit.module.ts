import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditRepository } from './audit.repository';
import { AuditInterceptor } from './audit.interceptor';
import { AccountAuditLog } from './entity/account-audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccountAuditLog])],
  providers: [
    AuditRepository,
    AuditInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditRepository],
})
export class AuditModule {}
