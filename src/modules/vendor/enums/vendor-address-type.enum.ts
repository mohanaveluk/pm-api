// A vendor may operate from several premises. Address type is a child-record
// discriminator, never a column on the vendor itself.
export enum VendorAddressType {
  REGISTERED  = 'REGISTERED',
  CORPORATE   = 'CORPORATE',
  FACTORY     = 'FACTORY',
  WORKSHOP    = 'WORKSHOP',
  WAREHOUSE   = 'WAREHOUSE',
  BRANCH      = 'BRANCH',
  SITE_OFFICE = 'SITE_OFFICE',
}
