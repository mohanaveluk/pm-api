import { UserService } from './modules/user/user.service';
import { UserController } from './modules/user/user.controller';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { adminConfig, getDatabaseConfig, googleCloudConfig, jwtConfig, smtpConfig } from './config/configuration';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/typeorm.config';
import { AuditModule } from './modules/audit/audit.module';
import { CommonModule } from './common/common.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContactModule } from './modules/contact/contact.module';
import { ChatModule } from './modules/chat/chat.module';
import { BlogModule } from './modules/blog/blog.module';
import { CountryModule } from './modules/country/country.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { SubscriptionPlanModule } from './modules/subscription-plan/subscription-plan.module';
import { OrganizationSubscriptionModule } from './modules/organization-subscription/organization-subscription.module';
import { PaymentModule } from './modules/payment/payment.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SubscriptionEnforcementGuard } from './common/guards/subscription-enforcement.guard';
import { OrganizationSubscription } from './modules/organization-subscription/entity/organization-subscription.entity';
import { User } from './modules/user/entity/user.entity';


@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      load: [getDatabaseConfig, jwtConfig, adminConfig, googleCloudConfig, smtpConfig],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: typeOrmConfig,
    }),
    TypeOrmModule.forFeature([OrganizationSubscription, User]),
    CommonModule,
    AuthModule,
    AuditModule,
    UserModule,
    ContactModule,
    ChatModule,
    BlogModule,
    CountryModule,
    OrganizationModule,
    SubscriptionPlanModule,
    OrganizationSubscriptionModule,
    PaymentModule,
    DashboardModule,
  ],
  controllers: [
    UserController,
    AppController,
  ],
  providers: [
    UserService,
    AppService,
    {
      provide: APP_GUARD,
      useClass: SubscriptionEnforcementGuard,
    },
  ],
})
export class AppModule {}
