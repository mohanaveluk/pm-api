import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { User } from '../user/entity/user.entity';
import { RefreshToken } from '../user/entity/refresh-token.entity';
import { PasswordArchive } from '../user/entity/password-archive.entity';
import { RoleEntity } from '../user/entity/roles.entity';
import { OTC } from '../user/entity/otc.entity';
import { UserLoginHistory } from './entity/user-login-history.entity';
import { AuthController } from './auth.controller';
import { TokenController } from './token.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from 'src/common/middleware/jwt.strategy';
import { DateService } from 'src/shared/services/date.service';
import { TokenService } from './token.service';
import { StorageService } from 'src/shared/services/storage.service';
import { EmailService } from 'src/shared/email/email.service';
import { CommonService } from 'src/common/common.service';
import { UserLoginHistoryService } from './user-login-history.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AuthorizationGuard } from 'src/common/guards/jwt-authorization.guard';
import { LogModule } from '../logger/log.module';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';
import { PasswordResetToken } from './entity/password-reset-token.entity';

dotenv.config();

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, PasswordArchive, RoleEntity, OTC, PasswordResetToken, UserLoginHistory]),
    PassportModule.register({ defaultStrategy: 'jwt' ,
      session: false}),
    
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { 
        expiresIn: `${parseInt(process.env.JWT_EXPIRES_IN || '4')}h`,
        issuer: 'auth-service' 
      },
    }),
      LogModule,
    // JwtModule.registerAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: async (configService: ConfigService) => ({
    //     secret: configService.get<string>('JWT_SECRET'),
    //     signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') },
    //   }),
    // }),

  ],
  controllers: [
    AuthController, 
    TokenController, 
    //UsersController
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    AuthorizationGuard,
    DateService,
    TokenService,
    StorageService,
    CloudStorageService,
    EmailService,
    CommonService,
    //UsersService,
    UserLoginHistoryService,
    
  
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // },
    /*{
      provide: JwtAuthGuard,
      useFactory: (reflector: Reflector, jwtService: JwtService) => {
        return new JwtAuthGuard(jwtService, reflector);
      },
      inject: [Reflector, JwtService]
    }*/
  ],
  exports: [AuthService,  PassportModule, DateService, TokenService, StorageService, UserLoginHistoryService],
})
export class AuthModule { }