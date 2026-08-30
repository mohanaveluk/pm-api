// Statutory tax document types. Deliberately country-agnostic: GST is not
// universal, so the enum spans the common regimes and keeps an OTHER escape.
export enum TaxDocumentType {
  GST             = 'GST',             // India, Australia, Canada, Singapore
  VAT             = 'VAT',             // EU, GCC, UK
  TIN             = 'TIN',             // Taxpayer Identification Number
  EIN             = 'EIN',             // US Employer Identification Number
  PAN             = 'PAN',             // India Permanent Account Number
  NATIONAL_TAX_ID = 'NATIONAL_TAX_ID', // generic national registry
  OTHER           = 'OTHER',
}
