// Document classes held against a material.
//
// The first eight members map 1:1 onto the legacy flat URL columns on the
// materials table (datasheetUrl, drawingSketchUrl, …, photos), so migrating an
// existing row into material_documents is a mechanical column→type mapping with
// no information loss.
export enum MaterialDocumentType {
  DATASHEET              = 'DATASHEET',              // ← materials.datasheetUrl
  DRAWING_SKETCH         = 'DRAWING_SKETCH',         // ← materials.drawingSketchUrl
  TECHNICAL_SPEC_SHEET   = 'TECHNICAL_SPEC_SHEET',   // ← materials.technicalSpecSheetUrl
  QUALITY_CERTIFICATE    = 'QUALITY_CERTIFICATE',    // ← materials.qualityCertificatesUrl
  COMPLIANCE_CERTIFICATE = 'COMPLIANCE_CERTIFICATE', // ← materials.complianceCertificatesUrl
  VENDOR_QUOTATION       = 'VENDOR_QUOTATION',       // ← materials.vendorQuotationUrl
  INSPECTION_REPORT      = 'INSPECTION_REPORT',      // ← materials.inspectionReportsUrl
  PHOTO                  = 'PHOTO',                  // ← materials.photos[]

  // Types with no legacy column — available from day one on the new table.
  MSDS                   = 'MSDS',
  MILL_CERTIFICATE       = 'MILL_CERTIFICATE',
  TEST_REPORT            = 'TEST_REPORT',
  INSTALLATION_MANUAL    = 'INSTALLATION_MANUAL',
  WARRANTY               = 'WARRANTY',
  OTHER                  = 'OTHER',
}

// Types that hold at most one current document. PHOTO and OTHER are
// multi-instance: a material legitimately has many photos side by side, so the
// service does not treat a second PHOTO as a revision of the first.
export const SINGLETON_DOCUMENT_TYPES: ReadonlySet<MaterialDocumentType> = new Set([
  MaterialDocumentType.DATASHEET,
  MaterialDocumentType.DRAWING_SKETCH,
  MaterialDocumentType.TECHNICAL_SPEC_SHEET,
  MaterialDocumentType.VENDOR_QUOTATION,
  MaterialDocumentType.MSDS,
]);
