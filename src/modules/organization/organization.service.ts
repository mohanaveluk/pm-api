import {
  Injectable, BadRequestException, NotFoundException,
  ConflictException, HttpException, HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { Organization, SubscriptionStatus } from './entity/organization.entity';
import { EmailVerificationToken } from './entity/email-verification-token.entity';
import { User } from '../user/entity/user.entity';
import { RoleEntity } from '../user/entity/roles.entity';
import { EmailService } from 'src/shared/email/email.service';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { VerifyOrganizationEmailDto } from './dto/verify-email.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { orgRegistrationTemplate } from 'src/shared/email/templates/org-registration.template';
import { orgAdminCredentialsTemplate } from 'src/shared/email/templates/org-admin-credentials.template';
import { VerifyOrganizationRegistration } from 'src/shared/email/templates/verify-email-template';

const OTP_EXPIRY_MINUTES = 30;
const MAX_OTP_ATTEMPTS   = 5;
const MAX_RESENDS        = 5;

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(EmailVerificationToken)
    private readonly tokenRepo: Repository<EmailVerificationToken>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterOrganizationDto, domain: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.orgRepo.findOne({ where: { email: dto.email } });
    if (existing && existing.emailVerified) {
      throw new ConflictException('An organization with this email already exists');
    }

    let org = existing;
    if (!org) {
      org = this.orgRepo.create({
        ...dto,
        oguid: uuidv4(),
        organizationCode: this.generateOrgCode(),
        subscriptionStatus: SubscriptionStatus.PENDING,
        emailVerified: false,
        isActive: false,
      });
      org = await this.orgRepo.save(org);
    }

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.tokenRepo.delete({ organizationId: org.id });

    await this.tokenRepo.save(
      this.tokenRepo.create({
        organizationId: org.id,
        email: dto.email,
        otpCode: otp,
        expiresAt,
        attemptCount: 0,
      }),
    );

    await this.emailService.sendEmail({
      to: dto.email,
      subject: 'Verify Your Organization Email',
      //html: orgRegistrationTemplate(otp, org.oguid, dto.organizationName),
      html: VerifyOrganizationRegistration(otp, org.oguid, dto.organizationName, domain),
    });

    return { success: true, message: 'Verification code sent to your email' };
  }

  async verifyEmail(dto: VerifyOrganizationEmailDto): Promise<{ success: boolean, organizationId: string }> {
    const org = await this.orgRepo.findOne({ where: [{ oguid: dto.oguid }, { email: dto.email }] });
    if (!org) throw new NotFoundException('Organization not found');

    if (org.emailVerified) {
      return { success: true, organizationId: org.id };
    }

    const token = await this.tokenRepo.findOne({
      where: { organizationId: org.id },
      order: { createdAt: 'DESC' },
    });

    if (!token) throw new BadRequestException('No verification code found. Please request a new one.');

    if (token.attemptCount >= MAX_OTP_ATTEMPTS) {
      throw new HttpException('Too many failed attempts. Please request a new OTP.', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (token.expiresAt < new Date()) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    if (token.otpCode !== dto.otp) {
      token.attemptCount += 1;
      await this.tokenRepo.save(token);
      throw new BadRequestException('Invalid verification code');
    }

    token.verifiedAt = new Date();
    await this.tokenRepo.save(token);

    org.emailVerified = true;
    org.isActive = true;
    org.subscriptionStatus = SubscriptionStatus.ACTIVE;
    await this.orgRepo.save(org);

    await this.createOrgAdmin(org);

    return { success: true, organizationId: org.id };
  }

  async resendOtp(email: string, domain: string): Promise<{ success: boolean; message: string }> {
    const org = await this.orgRepo.findOne({ where: { email } });
    if (!org) throw new NotFoundException('Organization not found');

    if (org.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const recentTokens = await this.tokenRepo.count({ where: { organizationId: org.id } });
    if (recentTokens >= MAX_RESENDS) {
      throw new HttpException('Maximum OTP resend limit reached. Please contact support.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.tokenRepo.delete({ organizationId: org.id });
    await this.tokenRepo.save(
      this.tokenRepo.create({
        organizationId: org.id,
        email,
        otpCode: otp,
        expiresAt,
        attemptCount: 0,
      }),
    );

    await this.emailService.sendEmail({
      to: email,
      subject: 'Your New Verification Code',
      //html: orgRegistrationTemplate(otp, org.oguid, org.organizationName),
      html: VerifyOrganizationRegistration(otp, org.oguid, org.organizationName, domain),
    });

    return { success: true, message: 'New verification code sent' };
  }

  async getProfile(organizationId: string): Promise<Organization> {
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async updateProfile(organizationId: string, dto: UpdateOrganizationDto, updatedBy: string): Promise<Organization> {
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    if (dto.email && dto.email !== org.email) {
      const conflict = await this.orgRepo.findOne({ where: { email: dto.email } });
      if (conflict) throw new ConflictException('Email already in use');
    }

    Object.assign(org, dto);
    org.updatedBy = updatedBy;
    return this.orgRepo.save(org);
  }

  private async createOrgAdmin(org: Organization): Promise<void> {
    const adminRole = await this.roleRepo.findOne({ where: { name: 'OrganizationAdmin' } });
    if (!adminRole) return;

    const existing = await this.userRepo.findOne({ where: { email: org.email, organizationId: org.id } });
    if (existing) return;

    const tempPassword = this.generateTempPassword();
    const hashed = await bcrypt.hash(tempPassword, 10);

    const admin = this.userRepo.create({
      first_name: org.organizationName,
      last_name: 'Admin',
      email: org.email,
      password: hashed,
      uguid: uuidv4(),
      organizationId: org.id,
      role: adminRole,
      role_guid: adminRole.guid,
      is_email_verified: true,
      is_active: 1,
      created_at: new Date(),
    });

    await this.userRepo.save(admin);

    await this.emailService.sendEmail({
      to: org.email,
      subject: `Welcome to the Platform — Your Admin Credentials`,
      html: orgAdminCredentialsTemplate(org.organizationName, org.email, tempPassword),
    });
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateOrgCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const suffix = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `ORG-${suffix}`;
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}
