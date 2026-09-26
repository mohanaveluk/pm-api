import { Module, Global } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthorizationGuard } from './guards/jwt-authorization.guard';
import { ClinicContextGuard } from './guards/clinic-context.guard';
import { ClinicContext } from './context/clinic-context.provider';
import { CommonService } from './common.service';
import { LogModule } from '../modules/logger/log.module';

// Global so CustomLoggerService (via LogModule) is injectable anywhere in the
// app without every feature module having to import LogModule itself — it is
// used across most services now, not just a handful.
@Global()
@Module({
  imports: [
    LogModule,
  ],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    AuthorizationGuard,
    ClinicContext,
    //ClinicContextGuard,
    CommonService
  ],
  exports: [
    JwtAuthGuard,
    RolesGuard,
    AuthorizationGuard,
    ClinicContext,
    //ClinicContextGuard,
    CommonService,
    LogModule,
  ],

})
export class CommonModule {}