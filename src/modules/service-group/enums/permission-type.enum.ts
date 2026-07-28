export enum PermissionType {
  VIEW      = 'VIEW',
  CREATE    = 'CREATE',
  MODIFY    = 'MODIFY',
  DELETE    = 'DELETE',
  APPROVE   = 'APPROVE',
  EXPORT    = 'EXPORT',
  IMPORT    = 'IMPORT',
  PRINT     = 'PRINT',
  SHARE     = 'SHARE',
  ARCHIVE   = 'ARCHIVE',
  RESTORE   = 'RESTORE',
  EXECUTE   = 'EXECUTE',
  CONFIGURE = 'CONFIGURE',
  ASSIGN    = 'ASSIGN',
  PUBLISH   = 'PUBLISH',
}

export const CORE_PERMISSIONS: PermissionType[] = [
  PermissionType.VIEW,
  PermissionType.CREATE,
  PermissionType.MODIFY,
  PermissionType.DELETE,
  PermissionType.APPROVE,
];

export enum GroupType {
  SYSTEM = 'SYSTEM',
  CUSTOM = 'CUSTOM',
}
