// Lifecycle of a material requisition.
//
//   DRAFT        saved by its creator, still editable, not yet with a reviewer
//   UNDER_REVIEW submitted — the status every requisition gets when it is created
//                and submitted, until the (separate) approval step acts on it
//   APPROVED / REJECTED / CANCELLED are set by that approval step, which is
//   built separately; they are declared here so the data model is complete.
//   ON_HOLD / DISABLED / OBSOLETE are administrative states a submitted
//   requisition can be moved to from the list (see REQUISITION_STATUS_TRANSITIONS).
export enum MaterialRequisitionStatus {
  DRAFT        = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED     = 'APPROVED',
  REJECTED     = 'REJECTED',
  CANCELLED    = 'CANCELLED',
  ON_HOLD      = 'ON_HOLD',
  DISABLED     = 'DISABLED',
  OBSOLETE     = 'OBSOLETE',
}

// Statuses a requisition can be moved to by hand. A draft is never moved —
// it is edited, submitted or deleted. Releasing a hold or re-enabling returns
// the requisition to review, so an approval is never silently restored.
export const REQUISITION_STATUS_TRANSITIONS: Record<MaterialRequisitionStatus, MaterialRequisitionStatus[]> = {
  [MaterialRequisitionStatus.DRAFT]: [],
  [MaterialRequisitionStatus.UNDER_REVIEW]: [
    MaterialRequisitionStatus.ON_HOLD, MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE,
  ],
  [MaterialRequisitionStatus.APPROVED]: [
    MaterialRequisitionStatus.ON_HOLD, MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE,
  ],
  [MaterialRequisitionStatus.REJECTED]: [
    MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE,
  ],
  [MaterialRequisitionStatus.CANCELLED]: [MaterialRequisitionStatus.OBSOLETE],
  [MaterialRequisitionStatus.ON_HOLD]: [
    MaterialRequisitionStatus.UNDER_REVIEW, MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE,
  ],
  [MaterialRequisitionStatus.DISABLED]: [
    MaterialRequisitionStatus.UNDER_REVIEW, MaterialRequisitionStatus.OBSOLETE,
  ],
  [MaterialRequisitionStatus.OBSOLETE]: [],
};

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
