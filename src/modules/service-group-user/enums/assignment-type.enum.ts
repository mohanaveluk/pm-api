export enum AssignmentType {
  MANUAL   = 'MANUAL',    // created by an administrator via UI/API
  AD_SYNC  = 'AD_SYNC',   // synced from Microsoft Active Directory / Entra ID
  API      = 'API',       // provisioned by an external system (SCIM, JIT, etc.)
}
