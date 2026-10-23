// State of one project ↔ user assignment. A removed assignment is soft-deleted
// rather than given a third status, so a project's mapping as a whole reads
// ACTIVE (at least one user active) or INACTIVE (users kept, all switched off).
export enum UserProjectMappingStatus {
  ACTIVE   = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

// Roles that see every project of their organization; everyone else sees the
// projects they are mapped to (plus those they manage or created).
export const UNRESTRICTED_PROJECT_ROLES = ['OrganizationAdmin', 'SuperAdmin'];
