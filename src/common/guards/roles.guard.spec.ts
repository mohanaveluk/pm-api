import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { INTERNAL_ONLY_KEY } from '../decorators/internal-only.decorator';

function contextFor(user: Record<string, unknown> | undefined): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardWith(metadata: Record<string, unknown>): RolesGuard {
  const reflector = { getAllAndOverride: (key: string) => metadata[key] } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('checks the role list as before', () => {
    const guard = guardWith({ [ROLES_KEY]: ['OrganizationAdmin'] });
    expect(guard.canActivate(contextFor({ role: 'OrganizationAdmin', isInternal: true }))).toBe(true);
    expect(guard.canActivate(contextFor({ role: 'User', isInternal: true }))).toBe(false);
  });

  it('@InternalOnly() refuses external (vendor) accounts whatever their role', () => {
    const guard = guardWith({ [INTERNAL_ONLY_KEY]: true, [ROLES_KEY]: ['User', 'ExternalUser'] });
    expect(guard.canActivate(contextFor({ role: 'ExternalUser', isInternal: false }))).toBe(false);
    expect(guard.canActivate(contextFor({ role: 'User', isInternal: false }))).toBe(false);
    expect(guard.canActivate(contextFor({ role: 'User', isInternal: true }))).toBe(true);
  });

  it('leaves routes without @InternalOnly() open to external accounts', () => {
    const guard = guardWith({ [ROLES_KEY]: ['ExternalUser'] });
    expect(guard.canActivate(contextFor({ role: 'ExternalUser', isInternal: false }))).toBe(true);
  });
});
