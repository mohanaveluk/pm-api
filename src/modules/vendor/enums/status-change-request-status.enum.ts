export enum StatusChangeRequestStatus {
  PENDING   = 'PENDING',
  APPROVED  = 'APPROVED',
  REJECTED  = 'REJECTED',
  CANCELLED = 'CANCELLED', // superseded or withdrawn by the requester
  EXPIRED   = 'EXPIRED',   // approval window elapsed before a decision
}
