// What an email is about. Stored as text (email_history.emailType, max 50
// characters), so adding a value needs no schema change.
//
// Naming: <ACTION>_<DOCUMENT>. For a document that goes through review and
// approval:
//   REVIEW_x            the reviewers are asked to review it
//   RESUBMIT_x          it is back with the reviewers after changes
//   APPROVAL_REQUEST_x  review is complete; the approvers are asked to approve
//   APPROVE_x / REJECT_x / RETURN_x / CANCEL_x / ONHOLD_x   the outcome
export enum EmailType {
  // ── Account & sign-in ────────────────────────────────────────────────
  EMAIL_VERIFICATION          = 'EMAIL_VERIFICATION',
  PASSWORD_RESET              = 'PASSWORD_RESET',
  PASSWORD_RESET_OTC          = 'PASSWORD_RESET_OTC',
  ADMIN_PASSWORD_RESET        = 'ADMIN_PASSWORD_RESET',
  LOGIN_OTC                   = 'LOGIN_OTC',
  MOBILE_VERIFIED             = 'MOBILE_VERIFIED',
  WELCOME                     = 'WELCOME',
  ACCOUNT_ACTIVATED           = 'ACCOUNT_ACTIVATED',
  ACCOUNT_DEACTIVATED         = 'ACCOUNT_DEACTIVATED',

  // ── Organization ─────────────────────────────────────────────────────
  ORGANIZATION_VERIFICATION   = 'ORGANIZATION_VERIFICATION',
  ORGANIZATION_ADMIN_CREDENTIALS = 'ORGANIZATION_ADMIN_CREDENTIALS',

  // ── Contact us ───────────────────────────────────────────────────────
  CONTACT_ACKNOWLEDGEMENT     = 'CONTACT_ACKNOWLEDGEMENT',
  CONTACT_ADMIN_NOTIFICATION  = 'CONTACT_ADMIN_NOTIFICATION',

  // ── General ──────────────────────────────────────────────────────────
  SYSTEM_NOTIFICATION         = 'SYSTEM_NOTIFICATION',

  // ── Material requisition ─────────────────────────────────────────────
  REVIEW_MATERIAL_REQUISITION           = 'REVIEW_MATERIAL_REQUISITION',
  RESUBMIT_MATERIAL_REQUISITION         = 'RESUBMIT_MATERIAL_REQUISITION',
  APPROVAL_REQUEST_MATERIAL_REQUISITION = 'APPROVAL_REQUEST_MATERIAL_REQUISITION',
  APPROVE_MATERIAL_REQUISITION          = 'APPROVE_MATERIAL_REQUISITION',
  REJECT_MATERIAL_REQUISITION           = 'REJECT_MATERIAL_REQUISITION',
  RETURN_MATERIAL_REQUISITION           = 'RETURN_MATERIAL_REQUISITION',
  CANCEL_MATERIAL_REQUISITION           = 'CANCEL_MATERIAL_REQUISITION',
  ONHOLD_MATERIAL_REQUISITION           = 'ONHOLD_MATERIAL_REQUISITION',
  RELEASE_HOLD_MATERIAL_REQUISITION     = 'RELEASE_HOLD_MATERIAL_REQUISITION',

  // ── Vendor master ────────────────────────────────────────────────────
  VENDOR_REGISTRATION             = 'VENDOR_REGISTRATION',
  APPROVAL_REQUEST_VENDOR         = 'APPROVAL_REQUEST_VENDOR',
  APPROVE_VENDOR                  = 'APPROVE_VENDOR',
  REJECT_VENDOR                   = 'REJECT_VENDOR',
  RETURN_VENDOR                   = 'RETURN_VENDOR',
  SUSPEND_VENDOR                  = 'SUSPEND_VENDOR',
  REACTIVATE_VENDOR               = 'REACTIVATE_VENDOR',
  BLOCK_VENDOR_APPROVAL_REQUEST   = 'BLOCK_VENDOR_APPROVAL_REQUEST',
  UNBLOCK_VENDOR_APPROVAL_REQUEST = 'UNBLOCK_VENDOR_APPROVAL_REQUEST',
  BLOCK_VENDOR                    = 'BLOCK_VENDOR',
  UNBLOCK_VENDOR                  = 'UNBLOCK_VENDOR',
  REJECT_BLOCK_VENDOR_REQUEST     = 'REJECT_BLOCK_VENDOR_REQUEST',
  REJECT_UNBLOCK_VENDOR_REQUEST   = 'REJECT_UNBLOCK_VENDOR_REQUEST',
  WITHDRAW_VENDOR_STATUS_REQUEST  = 'WITHDRAW_VENDOR_STATUS_REQUEST',
  VENDOR_DOCUMENT_EXPIRING        = 'VENDOR_DOCUMENT_EXPIRING',
  VENDOR_DOCUMENT_EXPIRED         = 'VENDOR_DOCUMENT_EXPIRED',
  VENDOR_PROFILE_UPDATED          = 'VENDOR_PROFILE_UPDATED',

  // ── Request for quotation ────────────────────────────────────────────
  REVIEW_RFQ              = 'REVIEW_RFQ',
  RESUBMIT_RFQ            = 'RESUBMIT_RFQ',
  APPROVAL_REQUEST_RFQ    = 'APPROVAL_REQUEST_RFQ',
  APPROVE_RFQ             = 'APPROVE_RFQ',
  REJECT_RFQ              = 'REJECT_RFQ',
  RETURN_RFQ              = 'RETURN_RFQ',
  CANCEL_RFQ              = 'CANCEL_RFQ',
  ONHOLD_RFQ              = 'ONHOLD_RFQ',
  SEND_RFQ_TO_VENDOR      = 'SEND_RFQ_TO_VENDOR',
  RFQ_CLARIFICATION       = 'RFQ_CLARIFICATION',
  RFQ_AMENDMENT           = 'RFQ_AMENDMENT',
  RFQ_DEADLINE_REMINDER   = 'RFQ_DEADLINE_REMINDER',
  RFQ_QUOTATION_RECEIVED  = 'RFQ_QUOTATION_RECEIVED',
  RFQ_AWARDED             = 'RFQ_AWARDED',
  RFQ_NOT_AWARDED         = 'RFQ_NOT_AWARDED',

  // ── Purchase order ───────────────────────────────────────────────────
  REVIEW_PO               = 'REVIEW_PO',
  RESUBMIT_PO             = 'RESUBMIT_PO',
  APPROVAL_REQUEST_PO     = 'APPROVAL_REQUEST_PO',
  APPROVE_PO              = 'APPROVE_PO',
  REJECT_PO               = 'REJECT_PO',
  RETURN_PO               = 'RETURN_PO',
  CANCEL_PO               = 'CANCEL_PO',
  ONHOLD_PO               = 'ONHOLD_PO',
  ISSUE_PO_TO_VENDOR      = 'ISSUE_PO_TO_VENDOR',
  PO_ACKNOWLEDGED         = 'PO_ACKNOWLEDGED',
  AMEND_PO                = 'AMEND_PO',
  PO_DELIVERY_REMINDER    = 'PO_DELIVERY_REMINDER',
  PO_DELIVERED            = 'PO_DELIVERED',
  CLOSE_PO                = 'CLOSE_PO',
}

export enum EmailStatus {
  PENDING = 'PENDING',
  SENT    = 'SENT',
  FAILED  = 'FAILED',
}

/** The transport that sent the email (email_history.provider). */
export const EMAIL_PROVIDER_SMTP = 'SMTP';
