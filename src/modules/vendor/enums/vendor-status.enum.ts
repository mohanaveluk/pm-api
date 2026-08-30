export enum VendorStatus {
  UNDER_EVALUATION = 'UNDER_EVALUATION', // newly created; qualification in progress
  ACTIVE           = 'ACTIVE',           // qualified and selectable for new transactions
  INACTIVE         = 'INACTIVE',         // excluded from new transactions; history intact
  BLACKLISTED      = 'BLACKLISTED',      // barred by compliance/performance; history intact
}
