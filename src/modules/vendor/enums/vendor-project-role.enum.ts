// The capacity in which the vendor executed a past project. Materially changes
// how much weight the reference carries: a main contractor on a USD 40m package
// is not the same evidence as a sub-supplier on one line item.
export enum VendorProjectRole {
  MAIN_CONTRACTOR = 'MAIN_CONTRACTOR',
  SUBCONTRACTOR   = 'SUBCONTRACTOR',
  EPC_CONTRACTOR  = 'EPC_CONTRACTOR',
  SUPPLIER        = 'SUPPLIER',
  MANUFACTURER    = 'MANUFACTURER',
  CONSULTANT      = 'CONSULTANT',
  JOINT_VENTURE   = 'JOINT_VENTURE',
  OTHER           = 'OTHER',
}
