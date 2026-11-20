// Lifecycle of a Request for Quotation.
//
//   DRAFT        written by the company buyer; every buyer tab can change
//   ISSUED       sent to the vendor (emailed); the vendor fills its parts
//   ACKNOWLEDGED the vendor confirmed participation (RFQ Acknowledgement Form); it can now respond
//   DECLINED     the vendor will not participate / not quote
//   QUOTED       the vendor submitted its response ("Response Submitted"); it can still revise it
//   COMPLETED / APPROVED   closed by the buyer — nothing changes any more
//   CANCELLED    withdrawn by the buyer; its quantities return to the requisitions
export enum RfqStatus {
  DRAFT        = 'DRAFT',
  ISSUED       = 'ISSUED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  DECLINED     = 'DECLINED',
  QUOTED       = 'QUOTED',
  COMPLETED    = 'COMPLETED',
  APPROVED     = 'APPROVED',
  CANCELLED    = 'CANCELLED',
}

/** While the vendor's response (prices, checklist, compliance answers, deviations, documents) can change: once acknowledged. */
export const RFQ_VENDOR_EDITABLE_STATUSES: readonly RfqStatus[] = [
  RfqStatus.ACKNOWLEDGED, RfqStatus.QUOTED,
];

/** While the buyer can still change the compliance requirements: until the RFQ is completed or approved. */
export const RFQ_COMPLIANCE_EDITABLE_STATUSES: readonly RfqStatus[] = [
  RfqStatus.DRAFT, RfqStatus.ISSUED, ...RFQ_VENDOR_EDITABLE_STATUSES,
];

/** Statuses the buyer can move an RFQ to by hand, from each status. */
export const RFQ_STATUS_TRANSITIONS: Record<RfqStatus, RfqStatus[]> = {
  [RfqStatus.DRAFT]: [RfqStatus.CANCELLED],
  [RfqStatus.ISSUED]: [RfqStatus.CANCELLED],
  [RfqStatus.ACKNOWLEDGED]: [RfqStatus.CANCELLED],
  [RfqStatus.DECLINED]: [RfqStatus.CANCELLED],
  [RfqStatus.QUOTED]: [RfqStatus.COMPLETED, RfqStatus.APPROVED, RfqStatus.CANCELLED],
  [RfqStatus.COMPLETED]: [RfqStatus.APPROVED],
  [RfqStatus.APPROVED]: [],
  [RfqStatus.CANCELLED]: [],
};

/** An RFQ whose quantities no longer count against its requisitions. */
export const RFQ_RELEASED_STATUSES: readonly RfqStatus[] = [RfqStatus.CANCELLED];

/** What the Non Disclosure Agreement covers (further detail in the Bid Submission Document). */
export enum RfqNdaScope {
  TECHNICAL                = 'TECHNICAL',
  COMMERCIAL               = 'COMMERCIAL',
  TECHNICAL_AND_COMMERCIAL = 'TECHNICAL_AND_COMMERCIAL',
}

/** Where in the RFQ package a document belongs. */
export enum RfqDocumentSection {
  TERMS_AND_CONDITIONS      = 'TERMS_AND_CONDITIONS',
  NON_DISCLOSURE_AGREEMENT  = 'NON_DISCLOSURE_AGREEMENT',
  INSTRUCTIONS_TO_BIDDERS   = 'INSTRUCTIONS_TO_BIDDERS',
  SCOPE_ASSOCIATED          = 'SCOPE_ASSOCIATED',
  TECHNICAL_SPECIFICATION   = 'TECHNICAL_SPECIFICATION',
  DRAWING_DATASHEET         = 'DRAWING_DATASHEET',
  /** The vendor's: chosen from its Vendor Master documents or uploaded. */
  VENDOR_QUALIFICATION      = 'VENDOR_QUALIFICATION',
  /** The vendor's, attached to its RFQ Acknowledgement Form. */
  ACKNOWLEDGEMENT           = 'ACKNOWLEDGEMENT',
}

/** Sections the company buyer manages; VENDOR_QUALIFICATION is the vendor's. */
export const BUYER_DOCUMENT_SECTIONS: readonly RfqDocumentSection[] = [
  RfqDocumentSection.TERMS_AND_CONDITIONS,
  RfqDocumentSection.NON_DISCLOSURE_AGREEMENT,
  RfqDocumentSection.INSTRUCTIONS_TO_BIDDERS,
  RfqDocumentSection.SCOPE_ASSOCIATED,
  RfqDocumentSection.TECHNICAL_SPECIFICATION,
  RfqDocumentSection.DRAWING_DATASHEET,
  // The buyer may attach qualification documents to a draft; the vendor adds its own once issued.
  RfqDocumentSection.VENDOR_QUALIFICATION,
];

export enum RfqChecklistSection {
  TECHNICAL  = 'TECHNICAL',
  COMMERCIAL = 'COMMERCIAL',
}

/** The checklist every RFQ starts with; the vendor ticks Yes / No (and says why for No). */
export const RFQ_DEFAULT_CHECKLIST: ReadonlyArray<{ section: RfqChecklistSection; key: string; label: string }> = [
  { section: RfqChecklistSection.TECHNICAL, key: 'DATASHEETS', label: 'Datasheets' },
  { section: RfqChecklistSection.TECHNICAL, key: 'COMPLIANCE_MATRIX', label: 'Compliance matrix' },
  { section: RfqChecklistSection.TECHNICAL, key: 'QAP_ITP', label: 'QAP / ITP' },
  { section: RfqChecklistSection.TECHNICAL, key: 'DELIVERY_SCHEDULE', label: 'Delivery schedule' },
  { section: RfqChecklistSection.TECHNICAL, key: 'DEVIATIONS_LIST', label: 'Deviations list' },
  { section: RfqChecklistSection.TECHNICAL, key: 'WARRANTY_DETAILS', label: 'Warranty details' },
  { section: RfqChecklistSection.COMMERCIAL, key: 'PRICE_SCHEDULE', label: 'Price schedule' },
  { section: RfqChecklistSection.COMMERCIAL, key: 'TAXES_DUTIES', label: 'Taxes & duties' },
  { section: RfqChecklistSection.COMMERCIAL, key: 'PAYMENT_TERMS', label: 'Payment terms' },
  { section: RfqChecklistSection.COMMERCIAL, key: 'DELIVERY_TERMS', label: 'Delivery terms' },
  { section: RfqChecklistSection.COMMERCIAL, key: 'VALIDITY_PERIOD', label: 'Validity period' },
  { section: RfqChecklistSection.COMMERCIAL, key: 'COMMERCIAL_DEVIATIONS', label: 'Commercial deviations' },
];

/** Roles that write RFQs (the company buyer). */
export const RFQ_BUYER_ROLES = ['OrganizationAdmin', 'SuperAdmin', 'Manager', 'ProjectManager', 'ProcurementManager'];

/** Roles that can read every RFQ of the organization. */
export const RFQ_READER_ROLES = [...RFQ_BUYER_ROLES, 'DepartmentManager', 'DisciplineLead', 'WarehouseManager', 'QAManager'];

/** The vendor-side account (sees only the RFQs issued to its own vendor). */
export const RFQ_VENDOR_ROLE = ['ExternalUser', 'Vendor'];

export const RFQ_DEFAULT_SUBJECT = 'Request for Quotation for [Item/Service Name]';

export const RFQ_DEFAULT_CONTENT =
  'You are invited to submit your quotation for the scope described in this RFQ package. ' +
  'Your quotation must comply with the technical specifications, commercial terms, and submission ' +
  'requirements outlined herein.';

export const RFQ_DEFAULT_INSTRUCTIONS = [
  'Quotation must be submitted in two parts:',
  '  - Technical Offer (Unpriced)',
  '  - Commercial Offer (Priced)',
  'All deviations must be listed in the Deviation Schedule.',
  'Vendor shall acknowledge receipt of RFQ within 24 hours.',
  'All communication shall be directed only to the RFQ contact person.',
  'Late submissions will not be accepted.',
  'Vendor shall confirm compliance with all specifications.',
].join('\n');
