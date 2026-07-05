import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicContext } from 'src/common/context/clinic-context.provider';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditModule } from '../audit/audit.module';
import { User } from './entity/user.entity';
import { RoleEntity } from './entity/roles.entity';

@Module({
  imports: [HttpModule, AuditModule, TypeOrmModule.forFeature([User, RoleEntity])],
  controllers: [UserController],
  providers: [UserRepository, UserService, AuditInterceptor, ClinicContext],
  exports: [UserService, UserRepository],
})
export class UserModule {}