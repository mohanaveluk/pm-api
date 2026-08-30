// Commercial payment terms. Modelled as a controlled enum for now; when a
// PaymentTerms master table is introduced, swap the column to a FK without
// changing the DTO field name.
export enum PaymentTerms {
  ADVANCE          = 'ADVANCE',
  NET_15           = 'NET_15',
  NET_30           = 'NET_30',
  NET_45           = 'NET_45',
  NET_60           = 'NET_60',
  NET_90           = 'NET_90',
  MILESTONE_BASED  = 'MILESTONE_BASED',
  LETTER_OF_CREDIT = 'LETTER_OF_CREDIT',
  OTHER            = 'OTHER',
}
