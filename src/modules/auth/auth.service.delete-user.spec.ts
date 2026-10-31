import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';

const ORG = 'org-1';
const ADMIN = { organizationId: ORG, role: 'OrganizationAdmin', userId: 'admin-id' };

function member(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-id', uguid: 'u-1', email: 'sam@example.com', first_name: 'Sam', last_name: 'Lee',
    organizationId: ORG, is_active: 1, is_deleted: false, role: { name: 'User' },
    ...overrides,
  };
}

describe('AuthService.deleteUser', () => {
  let service: AuthService;
  let userRepo: any;
  let tokenService: any;

  beforeEach(() => {
    userRepo = {
      findOne: jest.fn(async () => member()),
      save: jest.fn(async (u: any) => u),
      count: jest.fn(async () => 1),
    };
    tokenService = { revokeAllUserRefreshTokens: jest.fn(async () => undefined) };
    service = new (AuthService as any)(
      userRepo, {}, {}, {}, {},
      {}, {}, tokenService, {}, {},
      {}, {}, {}, { log: jest.fn(), error: jest.fn() },
    );
  });

  it('soft-deletes the user (is_active = 0, is_deleted = 1) and ends their sessions', async () => {
    const result = await service.deleteUser('u-1', ADMIN);

    const saved = userRepo.save.mock.calls[0][0];
    expect(saved).toMatchObject({ is_active: 0, is_deleted: true });
    expect(tokenService.revokeAllUserRefreshTokens).toHaveBeenCalledWith('user-id');
    expect(result.message).toBe('Sam Lee has been deleted');
  });

  it('refuses to delete your own account', async () => {
    userRepo.findOne.mockResolvedValue(member({ id: 'admin-id' }));
    await expect(service.deleteUser('u-1', ADMIN)).rejects.toThrow(BadRequestException);
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('keeps at least one active Organization Admin', async () => {
    userRepo.findOne.mockResolvedValue(member({ role: { name: 'OrganizationAdmin' } }));
    userRepo.count.mockResolvedValue(0);
    await expect(service.deleteUser('u-1', ADMIN)).rejects.toThrow(ConflictException);

    userRepo.count.mockResolvedValue(1);
    await expect(service.deleteUser('u-1', ADMIN)).resolves.toBeDefined();
  });

  it('refuses users of another organization unless the caller is SuperAdmin, and unknown users', async () => {
    userRepo.findOne.mockResolvedValue(member({ organizationId: 'org-2' }));
    await expect(service.deleteUser('u-1', ADMIN)).rejects.toThrow(ForbiddenException);
    await expect(service.deleteUser('u-1', { ...ADMIN, role: 'SuperAdmin' })).resolves.toBeDefined();

    userRepo.findOne.mockResolvedValue(null);
    await expect(service.deleteUser('nope', ADMIN)).rejects.toThrow(NotFoundException);
  });
});
