import { SetMetadata } from '@nestjs/common';

export const INTERNAL_ONLY_KEY = 'internalOnly';

/**
 * Company users only: external (vendor) accounts — users with is_internal = 0 —
 * get 403 on the route or the whole controller, whatever their role.
 * Checked by RolesGuard. Put it on any feature vendors must not reach
 * (material requisitions today; more as they come).
 *
 * The web app applies the same rule in src/app/core/rbac/external-access.config.ts.
 */
export const InternalOnly = () => SetMetadata(INTERNAL_ONLY_KEY, true);
