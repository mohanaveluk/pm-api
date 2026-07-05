import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, InternalServerErrorException, HttpException, GoneException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { TokenService } from './token.service';
import { addMinutes } from 'date-fns';
import { Request } from 'express';
import { User } from '../user/entity/user.entity';
import { PasswordArchive } from '../user/entity/password-archive.entity';
import { RoleEntity } from '../user/entity/roles.entity';
import { OTC } from '../user/entity/otc.entity';
import { DateService } from 'src/shared/services/date.service';
import { StorageService } from 'src/shared/services/storage.service';
import { EmailService } from 'src/shared/email/email.service';
import { CommonService } from 'src/common/common.service';
import { UserLoginHistoryService } from './user-login-history.service';
import { RegisterDto } from './dto/register.dto';
import { verifyEmailTemplate } from 'src/shared/email/templates/verify-email-template';
import { UpdateProfileDto } from '../user/dto/update-profile.dto';
import { VerifyEmailDto } from '../user/dto/verify-email.dto';
import { UserResponseDto } from '../user/dto/user-response.dto';
import { LoginDto } from './dto/login.dto';
import { UpdatePasswordOldDto } from '../user/dto/update-password.dto';
import { ValidateOTCDto } from '../user/dto/validate-otc.dto';
import { MobileLoginDto } from './dto/mobile-login.dto';
import { passwordResetTemplate } from 'src/shared/email/templates/password-reset.template';
import { ResetPasswordDto } from '../user/dto/reset-password.dto';
import { ResendEmailDto, ResendOTCDto } from '../user/dto/resend-otc.dto';
import { UpdateUserDto } from '../user/dto/update-user.dto';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';
import { PasswordResetToken } from './entity/password-reset-token.entity';
import { buildOtpEmailHtml } from 'src/shared/email/templates/otc-email-templates';



@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PasswordArchive)
    private passwordArchiveRepository: Repository<PasswordArchive>,
    @InjectRepository(RoleEntity)
    private rolesRepository: Repository<RoleEntity>,   
    @InjectRepository(OTC)
    private otcRepository: Repository<OTC>, 
    @InjectRepository(PasswordResetToken)
    private readonly tokenRepo: Repository<PasswordResetToken>,    

    private jwtService: JwtService,
    private dateService: DateService,
    private tokenService: TokenService,
    private storageService: StorageService,
    private cloudStorageService: CloudStorageService,
    private emailService: EmailService,
    private commonService: CommonService,
    private userLoginHistoryService: UserLoginHistoryService,
    private logger: CustomLoggerService
  ) {}

  async register(registerDto: RegisterDto, domain: string) : Promise<{ detail: any, message: string }> {
    try {

      const existingUser = await this.userRepository.findOne({
        where: { email: registerDto.email, is_email_verified: true },
      });

      if (existingUser) {
        throw new BadRequestException('Email already exist');
      }

      const unverifiedUser = await this.userRepository.findOne({
        where: { email: registerDto.email, is_email_verified: false },
      });

      let role = await this.rolesRepository.findOne({ where: { guid: registerDto.role_guid } });
      if (!role) {
        role = await this.rolesRepository.findOne({ where: { name: 'user' } });
        if (!role) {
          throw new Error('Default role not found');
        }
      }

      const hashedPassword = await bcrypt.hash(registerDto.password, 10);
      const verificationCode = this.generateOTC();
      const verificationCodeExpiry = new Date(Date.now() + 30 * 60 * 1000); // 15 minutes

      if(unverifiedUser){
        // Update user properties
        Object.assign(unverifiedUser, registerDto);
        unverifiedUser.password = hashedPassword;
        unverifiedUser.updated_at = new Date();
        unverifiedUser.verification_code = verificationCode;
        unverifiedUser.verification_code_expiry = verificationCodeExpiry;
        unverifiedUser.is_email_verified = false;
        unverifiedUser.is_active = 0;
      }

      const user = unverifiedUser ? unverifiedUser : (this.userRepository.create({
        ...registerDto,
        password: hashedPassword,
        uguid: uuidv4(),
        role,
        role_id: role.guid,
        created_at: new Date(await this.dateService.getCurrentDateTime()),
        verification_code: verificationCode,
        verification_code_expiry: verificationCodeExpiry,
        is_email_verified: false,
        is_active: 0
      }));

      const savedUser = await this.userRepository.save(user);
      const tokens = await this.tokenService.generateTokens(savedUser);

      // Send verification email
      this.logger.debug('Sending email...');
      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Verify Your Email Address',
        html: verifyEmailTemplate(verificationCode, user.uguid, user.first_name, domain),
      });
      this.logger.debug('Email has been sent');

      //await this.userRepository.save(user);
      return { detail: savedUser, message: 'User registered successfully. Please check your email for verification code.' };
    } catch (err) {
      throw err;
    }
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Check if email is being updated and is unique
      if (updateProfileDto.email && updateProfileDto.email !== user.email) {
        const existingUser = await this.userRepository.findOne({
          where: { email: updateProfileDto.email },
        });
        if (existingUser) {
          throw new BadRequestException('Email already exists');
        }
      }

      if(!this.commonService.isNullOrEmpty(updateProfileDto.password)){
        const hashedPassword = await bcrypt.hash(updateProfileDto.password, 10);
        updateProfileDto.password = hashedPassword;
      }

      // Update user properties
      Object.assign(user, updateProfileDto);
      user.updated_at = new Date();

      await this.userRepository.save(user);
      return { message: 'Profile updated successfully', profileImage: user.profile_image };
    } catch (error) {
      throw error;
    }
  }

  
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { uguid: verifyEmailDto.uguid }
    });

    if (!user) {
      throw new BadRequestException('Invalid verification link');
    }

    if (user.is_email_verified) {
      return { message: 'Email already verified' };
    }

    // check if the updatedat or createdAt os greater than 15 mins then return expired code message
    const referenceTime = user.verification_code_expiry;
    if (referenceTime < new Date()) {
      throw new HttpException('Verification code has expired. Please request a new verification mail.', 410);
    }

    if (!user.verification_code || 
        user.verification_code !== verifyEmailDto.code ||
        new Date() > user.verification_code_expiry) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    user.is_email_verified = true;
    user.verification_code = null;
    user.verification_code_expiry = null;
    user.is_active = 1;
    user.updated_at = user.last_active = new Date();
    await this.userRepository.save(user);

    return { message: 'Email verified successfully' };
  }

  async getAllUsers(): Promise<UserResponseDto[]> {
    const users =  await this.userRepository.find({
        where: { is_active: 1, is_email_verified: true },
    });

    let userResponses = [];
    users.forEach(user => {
      const detail = {
        uguid: user.uguid,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        mobile: user.mobile,
        dob: user.dob,
        position: user.position,
        location: user.location,
        reportTo: user.report_to,
        worksWith: user.worksWith,
        projectName: user.projectName,
        projectsWorkedOn: user.projectsWorkedOn,
        profileImage: user.profile_image
      };
      userResponses.push(detail);
    });
    return userResponses;
  }
  
  async login(loginDto: LoginDto, req: Request) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: ['role', 'organization', 'projects']
    });

    if (!user) {
      throw new NotFoundException('Oops, Invalid User Id.');
    }

    if (user.is_active == 0 || !user.is_email_verified) {
      throw new UnauthorizedException('Oops, User is disabled or email is not verified.');
    }

    if (!user.is_email_verified) {
      // Generate new verification code if needed
      if (!user.verification_code || new Date() > user.verification_code_expiry) {
        const verificationCode = this.generateOTC();
        const verificationCodeExpiry = new Date(Date.now() + 30 * 60 * 1000);

        user.verification_code = verificationCode;
        user.verification_code_expiry = verificationCodeExpiry;
        user.updated_at = new Date();
        const domain = `${req.protocol}://${req.get('host')}`;
        await this.userRepository.save(user);

        // Send verification email
        await this.emailService.sendEmail({
          to: user.email,
          subject: 'Verify Your Email Address',
          html: verifyEmailTemplate(verificationCode, user.uguid, user.first_name, domain),
        });
      }

      throw new UnauthorizedException('Please verify your email address. A verification code has been sent to your email.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Oops, Password is incorrect.');
    }

    // Record login
    const loginTime = new Date();
    await this.userLoginHistoryService.recordLogin(
      user.id,
      user.uguid,
      loginTime,
      req.ip,
      req.headers['user-agent']
    );

    user.last_login = loginTime;
    user.last_active = loginTime;
    this.userRepository.save(user);
    /*const payload = { 
      sub: user.uguid, 
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    };
    
    return {
      status: true,
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.uguid,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      }      
   };*/
    this.logger.debug(`user: '${user.email}' Logged in successfully, generating tokens...`);
    return this.tokenService.generateTokens(user);

  }

  async updatePassword_old(userId: string, updatePasswordDto: UpdatePasswordOldDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      updatePasswordDto.currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Archive the current password
    const passwordArchive = this.passwordArchiveRepository.create({
      password: user.password,
      userId: user.id,
      user: user
    });
    await this.passwordArchiveRepository.save(passwordArchive);

    // Update to new password
    const hashedNewPassword = await bcrypt.hash(updatePasswordDto.newPassword, 10);
    user.password = hashedNewPassword;
    await this.userRepository.save(user);

    return { message: 'Password updated successfully' };
  }

  async getUserInfo(userId: string){
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    user.password = "";
    return user;
  }

  async logout(userId: string, uguid: string) {
    await this.tokenService.revokeAllUserRefreshTokens(userId);
    await this.userLoginHistoryService.recordLogout(uguid);
    return { message: 'Logged out successfully' };
  }


  async uploadProfileImage(userId: string, file: Express.Multer.File): Promise<{ message: string; imageUrl: string }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      //const imageUrl = await this.storageService.uploadFile(file);
      const imageUrl = await this.cloudStorageService.uploadFile(file);
      
      user.profile_image = imageUrl;
      user.updated_at = new Date();
      await this.userRepository.save(user);

      return {
        message: 'Profile image uploaded successfully',
        imageUrl,
      };
    } catch (error) {
      throw error;
    }
  }


  

  private generateOTC(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendMobileOTC(mobile: string): Promise<{ message: string }> {
    try {
      // Deactivate any existing OTCs for this mobile
      await this.otcRepository.update(
        { mobile, is_active: 1 },
        { is_active: 0 }
      );

      const code = this.generateOTC();
      const otc = this.otcRepository.create({
        mobile,
        code,
        expiry_datetime: addMinutes(new Date(), 10), // 10 minutes expiry
      });

      await this.otcRepository.save(otc);

      // TODO: Integrate with SMS service
      console.log(`OTC for ${mobile}: ${code}`);

      return { message: 'OTC sent successfully' };
    } catch (error) {
      throw error;
    }
  }

  async validateOTC(validateOTCDto: ValidateOTCDto): Promise<{ access_token?: string; message: string }> {
    try {
      const otc = await this.otcRepository.findOne({
        where: {
          mobile: validateOTCDto.mobile,
          code: validateOTCDto.code,
          is_active: 1,
        },
      });

      if (!otc) {
        throw new BadRequestException('Invalid OTC');
      }

      if (new Date() > otc.expiry_datetime) {
        throw new BadRequestException('OTC has expired');
      }

      // Deactivate the OTC
      otc.is_active = 0;
      await this.otcRepository.save(otc);

      // Find or create user
      let user = await this.userRepository.findOne({
        where: { mobile: validateOTCDto.mobile },
      });

      if (!user) {
        user = this.userRepository.create({
          mobile: validateOTCDto.mobile,
          created_at: new Date(),
        });
        await this.userRepository.save(user);
      }

      // Generate JWT token
      const payload = { sub: user.id, mobile: user.mobile };
      return {
        access_token: this.jwtService.sign(payload),
        message: 'OTC validated successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async loginWithMobile(mobileLoginDto: MobileLoginDto): Promise<{ message: string }> {
    try {
      const user = await this.userRepository.findOne({
        where: { mobile: mobileLoginDto.mobile },
      });

      if (!user) {
        throw new BadRequestException('Mobile number not registered');
      }

      return this.sendMobileOTC(mobileLoginDto.mobile);
      
    } catch (error) {
      throw error;
    }
  }

  private async generateResetToken(userId: string): Promise<string> {
    const payload = { sub: userId, type: 'password_reset' };
    return this.jwtService.sign(payload, { expiresIn: '1h' });
  }
  
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    try {
      const user = await this.userRepository.findOne({
        where: { email },
      });
  
      if (!user) {
        // Return success even if user doesn't exist (security best practice)
        return { message: 'If your email is registered, you will receive password reset instructions' };
      }
  
      const token = await this.generateResetToken(user.uguid);
      const resetLink = `${process.env.FRONTEND_URL}/auth/reset?token=${token}`;
        // Send password reset email
      this.logger.debug(`Sending email with reset link for user: '${user.email}'`);
      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        html: passwordResetTemplate(resetLink),
      });
  
      return { message: 'If your email is registered, you will receive password reset instructions' };
    } catch (error) {
      throw error;
    }
  }
  
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    try {
      const payload = this.jwtService.verify(resetPasswordDto.token);
      
      if (payload.type !== 'password_reset') {
        throw new BadRequestException('Invalid reset token');
      }
  
      const user = await this.userRepository.findOne({
        where: { uguid: payload.sub },
      });
  
      if (!user) {
        throw new BadRequestException('Invalid reset token');
      }
  
      // Archive current password
      const passwordArchive = this.passwordArchiveRepository.create({
        password: user.password,
        userId: user.id,
        user: user
      });
      await this.passwordArchiveRepository.save(passwordArchive);
  
      // Update password
      const hashedPassword = await bcrypt.hash(resetPasswordDto.password, 10);
      user.password = hashedPassword;
      user.updated_at = new Date();
      await this.userRepository.save(user);
      this.logger.debug(`Password reset successfully for user: '${user.email}'`);
      return { message: 'Password reset successfully' };
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'name' in error && (error as { name: string }).name === 'JsonWebTokenError') {
        throw new BadRequestException('Invalid or expired reset token');
      }
      if (typeof error === 'object' && error !== null && 'name' in error && (error as { name: string }).name === 'TokenExpiredError') {
        throw new BadRequestException('Invalid or expired reset token');
      }
      throw error;
    }
  }

  async resendVerificationCode(resendOTCDto: ResendOTCDto): Promise<{ message: string }>{
    try {
      const user = await this.userRepository.findOne({
        where: { email: resendOTCDto.email },
      });

      if (!user) {
        // Return success even if user doesn't exist (security best practice)
        return { message: 'If your email is registered, you will receive verification code' };
      }
      const verificationCode = this.generateOTC();
      const verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
      
      user.verification_code = verificationCode;
      user.verification_code_expiry = verificationCodeExpiry;
      await this.userRepository.save(user);
      
      // Send verification email
      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Verify Your Email Address',
        html: verifyEmailTemplate(verificationCode, user.uguid, user.first_name, "domain"),
      });

      return { message: 'The verification code has been sent again. Please check your email for verification code' };

    } catch (error) {
      throw error;
    }
  }

  async resendVerificationMail(resendEmailDto: ResendEmailDto, domain: string): Promise<{ message: string }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: resendEmailDto.userId },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const verificationCode = this.generateOTC();
      const verificationCodeExpiry = new Date(Date.now() + 30 * 60 * 1000);
      user.verification_code = verificationCode;
      user.verification_code_expiry = verificationCodeExpiry;
      user.updated_at = new Date();
      
      await this.userRepository.save(user);
      // Send verification email
      
      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Verify Your Email Address',
        html: verifyEmailTemplate(verificationCode, user.uguid, user.first_name, domain),
      });
      
      return { message: 'Verification email sent successfully. Please check your email for verification code' };

    } catch (error) {
      throw error;
    }
  }

  // ── STEP 1: Forgot password — generate and email OTP ─────────────────────
  async forgotPassword(email: string): Promise<void> {
    // Look up the user — but DON'T throw if not found (prevents enumeration)
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) return; // silently return — frontend sees the same 200 either way
 
    // Invalidate any existing unused tokens for this email
    await this.tokenRepo.delete({ email, used: false });
 
    // Generate a cryptographically-safe 6-digit OTP
    const otp = this.generateOTC();
 
    // Hash the OTP before storing (treat like a password)
    const otpHash = await bcrypt.hash(otp, 10);
 
    // Save the token record with a 5-minute expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await this.tokenRepo.save(
      this.tokenRepo.create({
        email,
        otpHash,
        resetToken: null,   // populated in step 2 after OTP verified
        expiresAt,
        used: false,
      }),
    );
 
    // Send OTP email
    await this.emailService.sendEmail({
      to:      email,
      subject: 'Your password reset code',
      html:    buildOtpEmailHtml(otp, user.first_name ?? 'there'),
    });
  }


// ── STEP 2: Verify OTP — return a short-lived reset token ────────────────
 
  async verifyResetCode(email: string, code: string): Promise<string> {
    const record = await this.tokenRepo.findOne({
      where: { email, used: false },
      order: { createdAt: 'DESC' }, // use the most recent one
    });
 
    // No record found
    if (!record) {
      throw new BadRequestException('Invalid or expired verification code.');
    }
 
    // Check expiry
    if (record.expiresAt < new Date()) {
      throw new GoneException('Verification code has expired. Please request a new one.');
    }
 
    // Verify OTP against stored hash
    const isMatch = await bcrypt.compare(code, record.otpHash);
    if (!isMatch) {
      throw new BadRequestException('Incorrect verification code. Please try again.');
    }
 
    // OTP is valid — generate a reset token (UUID) valid for 10 minutes
    const resetToken  = uuidv4();
    const resetExpiry = new Date(Date.now() + 10 * 60 * 1000);
 
    // Persist the reset token on the same record
    record.resetToken = resetToken;
    record.expiresAt  = resetExpiry;
    await this.tokenRepo.save(record);
 
    return resetToken;
  }
 
  // ── STEP 3: Update password ───────────────────────────────────────────────
 
  async updatePassword(
    email:       string,
    resetToken:  string,
    newPassword: string,
  ): Promise<void> {
    const record = await this.tokenRepo.findOne({
      where: { email, resetToken, used: false },
    });
 
    if (!record) {
      throw new BadRequestException('Invalid or expired reset token.');
    }
 
    if (record.expiresAt < new Date()) {
      throw new GoneException('Reset token has expired. Please restart the reset process.');
    }
 
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
 
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);
 
    // Update the user record
    await this.userRepository.update(user.id, { password: passwordHash });
 
    // Mark the token as used so it cannot be replayed
    record.used = true;
    await this.tokenRepo.save(record);
  }  

  /*async getUserPermissions(userId: string): Promise<Permission[]> {
    try {

      const userEntity = await this.userRepository.findOne({
        where: { uguid: userId },
      });

      const user = await this.userRepository.findOne({
        where: { uguid: userId },
        relations: ['groups', 'groups.permissions'] //, 'groups.permissions'
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Collect unique permissions from all user groups
      const permissions = new Set<Permission>();
      user.groups.forEach(group => {
        group.permissions.forEach(permission => {
          permissions.add(permission);
        });
      });

      return Array.from(permissions);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }*/
  
  //  user related apis
  async findAllRoles(): Promise<RoleEntity[]> {
    try {
      const roles = await this.rolesRepository.find({
        order: { name: 'ASC' }
      });
      return roles;
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  async findAllUsers(): Promise<User[]> {
    try {
      const users = await this.userRepository.find({
        where: { is_deleted: false },
        order: { created_at: 'DESC' },
        relations: ['role']
      });
      return users;
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }
  

  async updateUser(uguid: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { uguid, is_deleted: false },
        relations: ['role']
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${uguid} not found`);
      }

      const role = await this.rolesRepository.findOne({
        where: {guid: updateUserDto.roleGuid}
      });

      // Validate email uniqueness if email is being updated
      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const existingUser = await this.userRepository.findOne({
          where: { email: updateUserDto.email, is_deleted: false }
        });
        if (existingUser) {
          throw new BadRequestException('Email already exists');
        }
      }

      Object.assign(user, updateUserDto);
      user.role = role;
      user.role_id = role?.guid || null;
      return await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async toggleStatus(uguid: string, isActive: boolean): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { uguid, is_deleted: false },
        relations: ['role']
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${uguid} not found`);
      }

      user.is_active = isActive ? 1 : 0;
      user.updated_at = new Date();
      return await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update user status');
    }
  }

}