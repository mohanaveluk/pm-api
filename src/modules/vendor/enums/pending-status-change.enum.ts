// An in-flight status change awaiting manager approval.
//
// Deliberately a SEPARATE column from VendorStatus rather than two extra
// VendorStatus members. A vendor whose blacklisting is only requested is not
// yet blacklisted: its settled business status stays ACTIVE until a manager
// approves, and reverts cleanly if the request is rejected. Folding 'pending'
// into VendorStatus would lose the underlying state to revert to.
export enum PendingStatusChange {
  PENDING_BLACKLIST   = 'PENDING_BLACKLIST',   // blacklisting requested, awaiting approval
  PENDING_UNBLACKLIST = 'PENDING_UNBLACKLIST', // lifting requested, awaiting approval
}
