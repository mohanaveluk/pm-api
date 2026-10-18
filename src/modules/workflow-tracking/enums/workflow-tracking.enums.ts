// The documents that make up one procurement workflow. Every one of them
// carries the same trackingId as the material requisition it started from, so
// the whole cycle — requisition to purchase order and beyond — reads as one
// timeline. Types that are not built yet are declared so their modules only
// have to start recording.
export enum WorkflowEntityType {
  MATERIAL_REQUISITION = 'MATERIAL_REQUISITION',
  MR_REVIEW            = 'MR_REVIEW',
  MR_APPROVAL          = 'MR_APPROVAL',
  RFQ                  = 'RFQ',
  RFQ_APPROVAL         = 'RFQ_APPROVAL',
  PURCHASE_ORDER       = 'PURCHASE_ORDER',
  GOODS_RECEIPT        = 'GOODS_RECEIPT',
  INVOICE              = 'INVOICE',
}

// What happened. Free to grow as later stages are built.
export enum WorkflowAction {
  CREATED        = 'CREATED',
  UPDATED        = 'UPDATED',
  SUBMITTED      = 'SUBMITTED',
  RESUBMITTED    = 'RESUBMITTED',
  EDITED_IN_REVIEW = 'EDITED_IN_REVIEW',
  REVIEWED       = 'REVIEWED',
  REVIEW_COMPLETED = 'REVIEW_COMPLETED',
  APPROVED       = 'APPROVED',
  APPROVAL_COMPLETED = 'APPROVAL_COMPLETED',
  RETURNED       = 'RETURNED',
  REJECTED       = 'REJECTED',
  CANCELLED      = 'CANCELLED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  LOCKED         = 'LOCKED',
  NOTIFIED       = 'NOTIFIED',
}

// Tracking ids look like TRK-7F3A9C2E-B41D0A55-9E2C6B10: a keyed hash, so one id
// says nothing about another and cannot be guessed (see generateTrackingId).
export const TRACKING_ID_PREFIX = 'TRK';
