export enum MaterialStatus {
  ACTIVE   = 'ACTIVE',    // selectable for new transactions
  INACTIVE = 'INACTIVE',  // excluded from new transactions; history intact
  OBSOLETE = 'OBSOLETE',  // permanently retired; history intact; cannot be re-activated
}
