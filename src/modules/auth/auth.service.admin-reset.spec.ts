import * as bcrypt from 'bcrypt';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthService, ADMIN_RESET_DEFAULT_PASSWORD } from './auth.service';

const ORG = 'org-1';
const ADMIN = { organizationId: ORG, role: 'OrganizationAdmin', userId: 'admin-id', name: 'Asha Admin' };

function activeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-id', uguid: 'u-1', email: 'sam@example.com', first_name: 'Sam',
    password: 'old-hash', organizationId: ORG, is_active: 1, is_email_verified: true,
    ...overrides,
  };
}

describe('AuthService.adminResetPassword', () => {
  let service: AuthService;
  let userRepo: any;
  let archiveRepo: any;
  let tokenService: any;
  let emailService: any;
  let logger: any;

  beforeEach(() => {
    userRepo = { findOne: jest.fn(async () => activeUser()), save: jest.fn(async (u: any) => u) };
    archiveRepo = { create: jest.fn((v: any) => v), save: jest.fn(async (v: any) => v) };
    tokenService = { revokeAllUserRefreshTokens: jest.fn(async () => undefined) };
    emailService = { sendEmail: jest.fn(async () => true) };
    logger = { log: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() };

    service = new (AuthService as any)(
      userRepo, archiveRepo, {}, {}, {},
      {}, {}, tokenService, {}, {},
      emailService, {}, {}, logger,
    );
  });

  it('sets the default password, archives the old one, revokes sessions and emails the user', async () => {
    const result = await service.adminResetPassword('u-1', ADMIN, 'https://app.example.com');

    const saved = userRepo.save.mock.calls[0][0];
    expect(await bcrypt.compare(ADMIN_RESET_DEFAULT_PASSWORD, saved.password)).toBe(true);
    expect(archiveRepo.save).toHaveBeenCalledWith(expect.objectContaining({ password: 'old-hash', userId: 'user-id' }));
    expect(tokenService.revokeAllUserRefreshTokens).toHaveBeenCalledWith('user-id');

    const mail = emailService.sendEmail.mock.calls[0][0];
    expect(mail.to).toBe('sam@example.com');
    expect(mail.html).toContain(ADMIN_RESET_DEFAULT_PASSWORD);
    expect(mail.html).toContain('Asha Admin');
    expect(mail.html).toContain('https://app.example.com/auth/login');
    expect(result).toMatchObject({ emailSent: true });
  });

  it('uses Welcome@123 as the default', () => {
    expect(ADMIN_RESET_DEFAULT_PASSWORD).toBe('Welcome@123');
  });

  it('keeps the reset and reports emailSent=false when the email cannot be sent', async () => {
    emailService.sendEmail.mockRejectedValueOnce(new Error('SMTP down'));

    const result = await service.adminResetPassword('u-1', ADMIN, 'https://app.example.com');

    expect(userRepo.save).toHaveBeenCalled();
    expect(result.emailSent).toBe(false);
    expect(logger.error).toHaveBeenCalled();
  });

  it('404s an unknown user', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(service.adminResetPassword('nope', ADMIN, 'd')).rejects.toThrow(NotFoundException);
  });

  it('refuses a user in another organization unless the caller is SuperAdmin', async () => {
    userRepo.findOne.mockResolvedValue(activeUser({ organizationId: 'org-2' }));
    await expect(service.adminResetPassword('u-1', ADMIN, 'd')).rejects.toThrow(ForbiddenException);
    expect(userRepo.save).not.toHaveBeenCalled();

    await expect(
      service.adminResetPassword('u-1', { ...ADMIN, role: 'SuperAdmin' }, 'd'),
    ).resolves.toMatchObject({ emailSent: true });
  });

  it('refuses inactive or unverified users', async () => {
    userRepo.findOne.mockResolvedValue(activeUser({ is_active: 0 }));
    await expect(service.adminResetPassword('u-1', ADMIN, 'd')).rejects.toThrow(BadRequestException);

    userRepo.findOne.mockResolvedValue(activeUser({ is_email_verified: false }));
    await expect(service.adminResetPassword('u-1', ADMIN, 'd')).rejects.toThrow(BadRequestException);
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('refuses to reset the caller\'s own password', async () => {
    userRepo.findOne.mockResolvedValue(activeUser({ id: 'admin-id' }));
    await expect(service.adminResetPassword('u-1', ADMIN, 'd')).rejects.toThrow(BadRequestException);
    expect(userRepo.save).not.toHaveBeenCalled();
  });
});
