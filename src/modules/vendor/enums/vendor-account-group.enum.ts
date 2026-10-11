// Account group classifies how the vendor is booked: a local supplier, an
// overseas (import) supplier, or a vendor used for a single transaction.
export enum VendorAccountGroup {
  DOMESTIC = 'DOMESTIC',
  IMPORT   = 'IMPORT',
  ONE_TIME = 'ONE_TIME',
}
