// Approved Vendor List (AVL) standing. Deliberately separate from VendorStatus
// and from isActive: a vendor can be APPROVED on the AVL yet temporarily INACTIVE.
export enum VendorClassification {
  PREFERRED   = 'PREFERRED',   // first choice for enquiry/award
  APPROVED    = 'APPROVED',    // fully qualified, on the AVL
  CONDITIONAL = 'CONDITIONAL', // usable with restrictions or additional oversight
  REJECTED    = 'REJECTED',    // failed qualification; not on the AVL
}
