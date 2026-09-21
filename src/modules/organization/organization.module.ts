import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entity/organization.entity';
import { EmailVerificationToken } from './entity/email-verification-token.entity';
import { OrganizationSettings } from './entity/organization-settings.entity';
import { OrganizationDocument } from './entity/organization-document.entity';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';
import { User } from '../user/entity/user.entity';
import { RoleEntity } from '../user/entity/roles.entity';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { EmailModule } from 'src/shared/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, EmailVerificationToken, OrganizationSettings, OrganizationDocument, User, RoleEntity]),
    EmailModule,
  ],
  providers:   [OrganizationService, CloudStorageService],
  controllers: [OrganizationController],
  exports:     [OrganizationService, TypeOrmModule],
})
export class OrganizationModule {}
