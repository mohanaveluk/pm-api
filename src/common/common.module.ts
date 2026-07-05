import { Module, Global } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthorizationGuard } from './guards/jwt-authorization.guard';
import { ClinicContextGuard } from './guards/clinic-context.guard';
import { ClinicContext } from './context/clinic-context.provider';
import { CommonService } from './common.service';

@Global()
@Module({
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
    CommonService
  ],
  
})
export class CommonModule {}