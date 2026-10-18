// Lifecycle of a material requisition.
//
//   DRAFT        saved by its creator, still editable, not yet with a reviewer
//   UNDER_REVIEW submitted — waiting for every assigned reviewer
//   REVIEWED     every reviewer has reviewed it — waiting for the approvers
//   APPROVED     every approver has approved it
//   RETURNED     a reviewer or approver sent it back for changes; the creator
//                edits it and resubmits, which starts a new review round
//   REJECTED / CANCELLED  ended by a reviewer or approver
//   ON_HOLD / DISABLED / OBSOLETE are administrative states a submitted
//   requisition can be moved to from the list (see REQUISITION_STATUS_TRANSITIONS).
export enum MaterialRequisitionStatus {
  DRAFT        = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  REVIEWED     = 'REVIEWED',
  APPROVED     = 'APPROVED',
  RETURNED     = 'RETURNED',
  REJECTED     = 'REJECTED',
  CANCELLED    = 'CANCELLED',
  ON_HOLD      = 'ON_HOLD',
  DISABLED     = 'DISABLED',
  OBSOLETE     = 'OBSOLETE',
}

// Statuses a requisition can be moved to by hand. A draft is never moved —
// it is edited, submitted or deleted. Review and approval decisions go through
// their own endpoints, not this table. Releasing a hold returns the requisition
// to where it was held from; re-enabling returns it to review, so an approval
// is never silently restored.
export const REQUISITION_STATUS_TRANSITIONS: Record<MaterialRequisitionStatus, MaterialRequisitionStatus[]> = {
  [MaterialRequisitionStatus.DRAFT]: [],
  [MaterialRequisitionStatus.UNDER_REVIEW]: [
    MaterialRequisitionStatus.ON_HOLD, MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE,
  ],
  [MaterialRequisitionStatus.REVIEWED]: [
    MaterialRequisitionStatus.ON_HOLD, MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE,
  ],
  [MaterialRequisitionStatus.APPROVED]: [
    MaterialRequisitionStatus.ON_HOLD, MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE,
  ],
  [MaterialRequisitionStatus.RETURNED]: [
    MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE,
  ],
  [MaterialRequisitionStatus.REJECTED]: [
    MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE,
  ],
  [MaterialRequisitionStatus.CANCELLED]: [MaterialRequisitionStatus.OBSOLETE],
  [MaterialRequisitionStatus.ON_HOLD]: [
    MaterialRequisitionStatus.UNDER_REVIEW, MaterialRequisitionStatus.REVIEWED, MaterialRequisitionStatus.APPROVED,
    MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE,
  ],
  [MaterialRequisitionStatus.DISABLED]: [
    MaterialRequisitionStatus.UNDER_REVIEW, MaterialRequisitionStatus.OBSOLETE,
  ],
  [MaterialRequisitionStatus.OBSOLETE]: [],
};

// Statuses whose content can still be changed (by the creator, or by a
// reviewer while it is under review).
export const EDITABLE_REQUISITION_STATUSES: readonly MaterialRequisitionStatus[] = [
  MaterialRequisitionStatus.DRAFT,
  MaterialRequisitionStatus.UNDER_REVIEW,
  MaterialRequisitionStatus.RETURNED,
];

// Statuses from which the requisition can be (re)submitted for review.
export const SUBMITTABLE_REQUISITION_STATUSES: readonly MaterialRequisitionStatus[] = [
  MaterialRequisitionStatus.DRAFT,
  MaterialRequisitionStatus.RETURNED,
];

// While the reviewers can still be changed: until the requisition is reviewed.
export const REVIEWER_EDITABLE_STATUSES: readonly MaterialRequisitionStatus[] = [
  MaterialRequisitionStatus.DRAFT,
  MaterialRequisitionStatus.RETURNED,
  MaterialRequisitionStatus.UNDER_REVIEW,
];

// While the approvers can still be changed: until the requisition is approved.
export const APPROVER_EDITABLE_STATUSES: readonly MaterialRequisitionStatus[] = [
  ...REVIEWER_EDITABLE_STATUSES,
  MaterialRequisitionStatus.REVIEWED,
];

// Where a requisition line came from. Every source feeds the same lines table.
export enum RequisitionLineSource {
  MATERIAL_MASTER = 'MATERIAL_MASTER',
  EARLIER_MR      = 'EARLIER_MR',
  BOM             = 'BOM',
  PURCHASE_ORDER  = 'PURCHASE_ORDER',
  PROJECT         = 'PROJECT',
}

export enum RequisitionDocumentType {
  // The covering document template — one, replaced when uploaded again.
  COVERING_DOCUMENT = 'COVERING_DOCUMENT',
  // Specifications and project documents listed in the covering document.
  SPECIFICATION     = 'SPECIFICATION',
  PROJECT_DOCUMENT  = 'PROJECT_DOCUMENT',
}

// The two parts an internal user can play on a requisition.
export enum RequisitionParticipantRole {
  REVIEWER = 'REVIEWER',
  APPROVER = 'APPROVER',
}

// A reviewer's or approver's decision for the current round.
export enum RequisitionDecision {
  REVIEWED  = 'REVIEWED',
  APPROVED  = 'APPROVED',
  RETURNED  = 'RETURNED',
  REJECTED  = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export const REVIEW_DECISIONS: readonly RequisitionDecision[] = [
  RequisitionDecision.REVIEWED, RequisitionDecision.RETURNED,
  RequisitionDecision.REJECTED, RequisitionDecision.CANCELLED,
];

export const APPROVAL_DECISIONS: readonly RequisitionDecision[] = [
  RequisitionDecision.APPROVED, RequisitionDecision.RETURNED,
  RequisitionDecision.REJECTED, RequisitionDecision.CANCELLED,
];

// The status a decision that ends the round moves the requisition to.
export const DECISION_STATUS: Record<RequisitionDecision, MaterialRequisitionStatus> = {
  [RequisitionDecision.REVIEWED]:  MaterialRequisitionStatus.REVIEWED,
  [RequisitionDecision.APPROVED]:  MaterialRequisitionStatus.APPROVED,
  [RequisitionDecision.RETURNED]:  MaterialRequisitionStatus.RETURNED,
  [RequisitionDecision.REJECTED]:  MaterialRequisitionStatus.REJECTED,
  [RequisitionDecision.CANCELLED]: MaterialRequisitionStatus.CANCELLED,
};
