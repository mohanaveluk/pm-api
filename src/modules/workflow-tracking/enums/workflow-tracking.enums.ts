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
  // Master data. Not part of a procurement cycle: each record has its own
  // trackingId (materials.trackingId, vendors.trackingId) so its history and
  // notifications read the same way.
  MATERIAL             = 'MATERIAL',
  VENDOR               = 'VENDOR',
  // Users given or denied access to a project (entityId = the project).
  PROJECT_ASSIGNMENT   = 'PROJECT_ASSIGNMENT',
}

// What happened. Free to grow as later stages are built.
// Enable / disable / obsolete / hold / reopen are STATUS_CHANGED with
// fromStatus → toStatus; decisions use their own action.
// Both enums are MySQL ENUM columns: a new value needs an ALTER TABLE in any
// database that is not synchronized (see the pm-conventions skill).
export enum WorkflowAction {
  CREATED        = 'CREATED',
  UPDATED        = 'UPDATED',
  SUBMITTED      = 'SUBMITTED',
  RESUBMITTED    = 'RESUBMITTED',
  EDITED_IN_REVIEW = 'EDITED_IN_REVIEW',
  EDITED_IN_APPROVAL = 'EDITED_IN_APPROVAL',
  REVIEWED       = 'REVIEWED',
  REVIEW_COMPLETED = 'REVIEW_COMPLETED',
  APPROVED       = 'APPROVED',
  APPROVAL_COMPLETED = 'APPROVAL_COMPLETED',
  RETURNED       = 'RETURNED',
  REJECTED       = 'REJECTED',
  CANCELLED      = 'CANCELLED',
  // A change that waits for someone else's decision (e.g. a vendor blacklist request).
  REQUESTED      = 'REQUESTED',
  DELETED        = 'DELETED',
  // Access given to / taken from users (project assignment).
  ASSIGNED       = 'ASSIGNED',
  UNASSIGNED     = 'UNASSIGNED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  LOCKED         = 'LOCKED',
  NOTIFIED       = 'NOTIFIED',
}

// Tracking ids look like TRK-7F3A9C2E-B41D0A55-9E2C6B10: a keyed hash, so one id
// says nothing about another and cannot be guessed (see generateTrackingId).
export const TRACKING_ID_PREFIX = 'TRK';
