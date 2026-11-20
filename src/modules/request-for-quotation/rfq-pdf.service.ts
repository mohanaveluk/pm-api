import { Injectable } from '@nestjs/common';
import type { Content, ContextPageSize, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { RfqDocumentSection, RfqNdaScope, RfqStatus } from './enums/rfq.enums';
import { RfqDocumentResponseDto, RfqResponseDto } from './dto/rfq-response.dto';

// pdfmake's server build is CommonJS; its fonts ship base64-encoded in vfs_fonts.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vfsModule = require('pdfmake/build/vfs_fonts.js');
const vfs: Record<string, string> = vfsModule.pdfMake?.vfs ?? vfsModule;
const font = (file: string) => Buffer.from(vfs[file], 'base64');

const printer = new PdfPrinter({
  Roboto: {
    normal: font('Roboto-Regular.ttf'),
    bold: font('Roboto-Medium.ttf'),
    italics: font('Roboto-Italic.ttf'),
    bolditalics: font('Roboto-MediumItalic.ttf'),
  },
});

// Same blues as the web app and the emails.
const COLOR = {
  primary: '#1565c0',
  text: '#1b2433',
  muted: '#6f87a3',
  border: '#c9d6e3',
  headBg: '#e8f1fc',
  zebra: '#f7f9fc',
  yes: '#2e7d32',
  no: '#b26a00',
};

const STATUS_LABELS: Record<RfqStatus, string> = {
  [RfqStatus.DRAFT]: 'Draft',
  [RfqStatus.ISSUED]: 'Issued',
  [RfqStatus.ACKNOWLEDGED]: 'Acknowledged',
  [RfqStatus.DECLINED]: 'Declined',
  [RfqStatus.QUOTED]: 'Response Submitted',
  [RfqStatus.COMPLETED]: 'Completed',
  [RfqStatus.APPROVED]: 'Approved',
  [RfqStatus.CANCELLED]: 'Cancelled',
};

const NDA_LABELS: Record<RfqNdaScope, string> = {
  [RfqNdaScope.TECHNICAL]: 'Technical',
  [RfqNdaScope.COMMERCIAL]: 'Commercial',
  [RfqNdaScope.TECHNICAL_AND_COMMERCIAL]: 'Technical and Commercial',
};

const SECTION_LABELS: Record<RfqDocumentSection, string> = {
  [RfqDocumentSection.TERMS_AND_CONDITIONS]: 'Terms and Conditions',
  [RfqDocumentSection.NON_DISCLOSURE_AGREEMENT]: 'Non-Disclosure Agreement',
  [RfqDocumentSection.INSTRUCTIONS_TO_BIDDERS]: 'Instructions to Bidders',
  [RfqDocumentSection.SCOPE_ASSOCIATED]: 'Scope — Associated Documents',
  [RfqDocumentSection.TECHNICAL_SPECIFICATION]: 'Technical Specifications',
  [RfqDocumentSection.DRAWING_DATASHEET]: 'Drawings & Datasheets',
  [RfqDocumentSection.VENDOR_QUALIFICATION]: 'Vendor Qualification',
  [RfqDocumentSection.ACKNOWLEDGEMENT]: 'Acknowledgement',
};

const SCOPE: Array<[keyof RfqResponseDto, string]> = [
  ['scopeDescription', 'Description of Items / Services'],
  ['scopeQuantityNotes', 'Quantity & Unit of Measurement'],
  ['deliveryLocation', 'Delivery Location'],
  ['deliverySchedule', 'Delivery Schedule'],
];
const TECHNICAL: Array<[keyof RfqResponseDto, string]> = [
  ['materialGradeStandards', 'Material Grade & Standards'],
  ['designConditions', 'Design Conditions'],
  ['dimensionalRequirements', 'Dimensional Requirements'],
  ['applicableCodes', 'Applicable Codes'],
  ['qualityRequirements', 'Quality Requirements'],
  ['regulatoryCompliance', 'Regulatory Compliance'],
  ['inspectionTesting', 'Inspection & Testing'],
  ['documentationRequirements', 'Documentation Requirements'],
];
const COMMERCIAL: Array<[keyof RfqResponseDto, string]> = [
  ['pricingFormat', 'Pricing Format'],
  ['incoterms', 'Incoterms'],
  ['paymentTerms', 'Payment Terms'],
  ['taxesDuties', 'Taxes & Duties'],
  ['warranty', 'Warranty Terms'],
  ['liquidatedDamages', 'Liquidated Damages (LD)'],
  ['performanceGuarantee', 'Performance Guarantee'],
  ['insuranceRequirements', 'Insurance Requirements'],
  ['packingMarking', 'Packing & Marking'],
  ['commercialDocumentation', 'Documentation'],
];

const dash = (v: unknown): string => (v === null || v === undefined || v === '' ? '—' : String(v));
const num = (v: number | null | undefined, digits = 2): string =>
  v == null ? '—' : new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 4) }).format(v);
const qty = (v: number | null | undefined): string =>
  v == null ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(v);
const yesNo = (v: boolean | null | undefined): Content =>
  v == null ? { text: 'Not answered', color: COLOR.muted, italics: true } : { text: v ? 'Yes' : 'No', color: v ? COLOR.yes : COLOR.no, bold: true };

function day(v: string | Date | null | undefined): string {
  if (!v) return '—';
  const iso = v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return String(v);
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

function dateTime(v: string | Date | null | undefined): string {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return `${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(d)} UTC`;
}

/** A bordered grid table with a tinted header row. */
function grid(widths: Array<string | number>, head: string[], rows: TableCell[][], empty = 'None.'): Content {
  const header: TableCell[] = head.map((h) => ({ text: h, style: 'th' }));
  const body: TableCell[][] = rows.length
    ? rows
    : [[{ text: empty, colSpan: head.length, color: COLOR.muted, italics: true, alignment: 'center' }, ...head.slice(1).map(() => '')]];
  return {
    table: { headerRows: 1, widths, dontBreakRows: true, body: [header, ...body] },
    layout: {
      hLineColor: () => COLOR.border,
      vLineColor: () => COLOR.border,
      fillColor: (row: number) => (row === 0 ? COLOR.headBg : row % 2 === 0 ? COLOR.zebra : null),
      paddingTop: () => 4,
      paddingBottom: () => 4,
      paddingLeft: () => 5,
      paddingRight: () => 5,
    },
    margin: [0, 0, 0, 10],
  };
}

/** Label / value pairs in two columns. */
function facts(pairs: Array<[string, Content | string]>): Content {
  const rows: TableCell[][] = [];
  for (let i = 0; i < pairs.length; i += 2) {
    const cell = (p?: [string, Content | string]): TableCell[] => p
      ? [{ text: p[0], style: 'label' }, typeof p[1] === 'string' ? { text: p[1] } : p[1]]
      : ['', ''];
    rows.push([...cell(pairs[i]), ...cell(pairs[i + 1])]);
  }
  return {
    table: { widths: [95, '*', 95, '*'], body: rows },
    layout: {
      hLineColor: () => COLOR.border,
      vLineColor: () => COLOR.border,
      fillColor: (_r: number, _n: unknown, col: number) => (col % 2 === 0 ? COLOR.zebra : null),
      paddingTop: () => 4,
      paddingBottom: () => 4,
      paddingLeft: () => 5,
      paddingRight: () => 5,
    },
    margin: [0, 0, 0, 10],
  };
}

/** A section heading; with `orientation` it starts a new page in that orientation. */
function heading(n: number, title: string, orientation?: 'portrait' | 'landscape'): Content {
  return {
    text: `${n}. ${title}`,
    style: 'h2',
    margin: [0, 12, 0, 6],
    ...(orientation ? { pageBreak: 'before' as const, pageOrientation: orientation } : {}),
  };
}

function textBlocks(rfq: RfqResponseDto, fields: Array<[keyof RfqResponseDto, string]>): Content[] {
  return fields.map(([key, label]) => ({
    stack: [
      { text: label, style: 'label', margin: [0, 0, 0, 2] },
      { text: dash(rfq[key] as string | null), margin: [0, 0, 0, 8] },
    ],
    unbreakable: true,
  }));
}

function documentRows(docs: RfqDocumentResponseDto[]): TableCell[][] {
  return docs.map((d, i) => [
    { text: String(i + 1), alignment: 'center' },
    { text: SECTION_LABELS[d.section] ?? d.section },
    { text: d.documentName, link: d.documentUrl, color: COLOR.primary, decoration: 'underline' },
    { text: dash(d.fileName) },
    { text: d.sourceMrNumber ? `From ${d.sourceMrNumber}` : d.vendorDocumentId ? 'Vendor Master' : 'Uploaded' },
  ]);
}

/**
 * The RFQ as a PDF: the buyer's package (letter, instructions, scope,
 * technical, commercial, price schedule, documents) and — once the vendor has
 * answered — its acknowledgement, prices, checklist, compliance answers and
 * deviations. Built with pdfmake (no browser needed).
 */
@Injectable()
export class RfqPdfService {
  async render(rfq: RfqResponseDto, organizationName: string | null): Promise<Buffer> {
    const doc = printer.createPdfKitDocument(this.definition(rfq, organizationName));
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }

  /** "RFQ-0001-Rev0.pdf" */
  fileName(rfq: Pick<RfqResponseDto, 'rfqNumber' | 'revisionNo'>): string {
    const safe = rfq.rfqNumber.replace(/[^A-Za-z0-9._-]+/g, '-');
    return `RFQ-${safe}-Rev${rfq.revisionNo}.pdf`;
  }

  definition(rfq: RfqResponseDto, organizationName: string | null): TDocumentDefinitions {
    const currency = rfq.quotedCurrency ? ` (${rfq.quotedCurrency})` : '';
    const items = rfq.items.slice().sort((a, b) => a.lineNumber - b.lineNumber);
    const charges = rfq.otherCharges.slice().sort((a, b) => a.sequence - b.sequence);
    const ack = rfq.acknowledgement;
    let n = 0;

    const content: Content[] = [
      // ── Title ──
      {
        columns: [
          {
            stack: [
              { text: organizationName ?? '', style: 'org' },
              { text: 'REQUEST FOR QUOTATION', style: 'title' },
              { text: rfq.subject ?? '', style: 'subtitle' },
            ],
          },
          {
            width: 170,
            stack: [
              { text: `RFQ No. ${rfq.rfqNumber}`, style: 'rfqNo', alignment: 'right' },
              { text: `Revision ${rfq.revisionNo}`, alignment: 'right', color: COLOR.muted },
              { text: STATUS_LABELS[rfq.status] ?? rfq.status, alignment: 'right', bold: true, color: COLOR.primary, margin: [0, 4, 0, 0] },
            ],
          },
        ],
        margin: [0, 0, 0, 6],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: COLOR.primary }], margin: [0, 0, 0, 10] },

      // ── 1. RFQ Letter ──
      heading(++n, 'RFQ Letter'),
      facts([
        ['Issue Date', rfq.issuedAt ? dateTime(rfq.issuedAt) : day(rfq.issueDate)],
        ['Bid Closing Date', { text: day(rfq.bidClosingDate), bold: true }],
        ['Project', [rfq.projectCode, rfq.projectName].filter(Boolean).join(' — ') || '—'],
        ['Client', dash(rfq.clientName)],
        ['Material Requisitions', rfq.requisitions.map((r) => r.mrNumber).join(', ') || '—'],
        ['Tracking ID', dash(rfq.trackingId)],
        ['Sealed Bid', rfq.sealedBid ? 'Yes' : 'No'],
        ['Non-Disclosure Agreement', rfq.ndaScope ? NDA_LABELS[rfq.ndaScope] : 'Not required'],
        ['Contact Person', [rfq.contactName, rfq.contactEmail, rfq.contactPhone].filter(Boolean).join('\n') || '—'],
        ['Quoted Currency', dash(rfq.quotedCurrency)],
      ]),
      {
        stack: [
          { text: 'To', style: 'label' },
          { text: dash(rfq.vendorName), bold: true },
          ...(rfq.vendorAddress ? [{ text: rfq.vendorAddress, color: COLOR.muted }] : []),
          ...(rfq.vendorEmail ? [{ text: rfq.vendorEmail, color: COLOR.muted }] : []),
        ],
        margin: [0, 0, 0, 8],
      },
      { text: [{ text: 'Subject: ', bold: true }, dash(rfq.subject)], margin: [0, 0, 0, 6] },
      { text: dash(rfq.content), margin: [0, 0, 0, 6] },

      // ── 2. Instructions ──
      heading(++n, 'Instructions to Bidders'),
      { text: dash(rfq.instructionsToBidders) },

      // ── 3–5. Scope, technical, commercial ──
      heading(++n, 'Scope of Supply / Work'),
      ...textBlocks(rfq, SCOPE),
      heading(++n, 'Technical Specifications'),
      ...textBlocks(rfq, TECHNICAL),
      heading(++n, 'Commercial Terms'),
      ...textBlocks(rfq, COMMERCIAL),

      // ── 6. Price schedule ──
      // The price schedule is wide: landscape pages.
      heading(++n, 'Price Schedule', 'landscape'),
      grid(
        [22, 58, '*', 32, 48, 62, 68, 48, 66, 58, 90],
        ['#', 'Item Code', 'Description', 'UOM', 'RFQ Qty', `Unit Price${currency}`, `Total Price${currency}`,
          'Exch. Rate', 'Total (USD)', 'Delivery', 'Remarks'],
        items.map((i) => [
          { text: String(i.lineNumber), alignment: 'center' },
          { text: i.itemCode },
          { text: i.description },
          { text: dash(i.uom) },
          { text: qty(i.rfqQuantity), alignment: 'right' },
          { text: num(i.unitPrice), alignment: 'right' },
          { text: num(i.totalPrice), alignment: 'right' },
          { text: i.exchangeRate == null ? '—' : num(i.exchangeRate, 2), alignment: 'right' },
          { text: num(i.totalPriceUsd), alignment: 'right' },
          { text: dash(i.deliveryDuration) },
          { text: dash(i.remarks) },
        ]),
        'No items.',
      ),
      {
        stack: [
          grid(
            [22, '*', 110],
            ['#', 'Other Charges', `Amount${currency}`],
            charges.map((c, i) => [
              { text: String(i + 1), alignment: 'center' },
              { text: c.title },
              { text: num(c.amount), alignment: 'right' },
            ]),
            'No other charges.',
          ),
          {
            table: {
              widths: ['*', 130],
              body: [
                [{ text: `Quotation total${currency}`, bold: true, alignment: 'right' }, { text: num(rfq.quotedTotal), bold: true, alignment: 'right' }],
                [{ text: 'Items total (USD)', alignment: 'right', color: COLOR.muted }, { text: num(rfq.quotedTotalUsd), alignment: 'right', color: COLOR.muted }],
              ],
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 10],
          },
        ],
        // Other charges and the totals stay on one page.
        unbreakable: true,
      },

      // ── 7. Documents ──
      heading(++n, 'Documents', 'portrait'),
      grid([22, 110, '*', 120, 75], ['#', 'Section', 'Document', 'File', 'Source'], documentRows(rfq.documents), 'No documents.'),
    ];

    // ── 8. Vendor acknowledgement ──
    content.push(heading(++n, 'Vendor Acknowledgement'));
    if (ack) {
      content.push(facts([
        ['Participation', ack.participate ? 'Yes' : 'No'],
        ['Will submit a quotation', ack.willSubmitQuotation ? 'Yes' : 'No'],
        ['Vendor Name', ack.vendorName],
        ['Contact Person', ack.contactPerson],
        ['Email', ack.email],
        ['Phone', dash(ack.phone)],
        ['Name', ack.vendorName],
        ['Date', dateTime(ack.acknowledgedAt)],
      ]));
    } else {
      content.push({ text: 'Not acknowledged yet.', color: COLOR.muted, italics: true });
    }

    // ── 9. Checklist ──
    content.push(heading(++n, 'Checklist'));
    for (const [section, title] of [['TECHNICAL', 'Technical offer must include'], ['COMMERCIAL', 'Commercial offer must include']] as const) {
      const rows = rfq.checklist.filter((c) => c.section === section).sort((a, b) => a.sequence - b.sequence);
      content.push({ text: title, style: 'h3' });
      content.push(grid([22, '*', 70, '*'], ['#', 'Item', 'Included', 'Reason (if No)'],
        rows.map((c, i) => [{ text: String(i + 1), alignment: 'center' }, { text: c.label }, yesNo(c.provided), { text: dash(c.reason) }])));
    }

    // ── 10. Compliance ──
    content.push(heading(++n, 'Compliance'));
    content.push(grid([28, '*', 120, 55, 110], ['Sr#', 'Requirement', 'Vendor Response', 'Compliant', 'Remarks'],
      rfq.compliances.slice().sort((a, b) => a.sequence - b.sequence).map((c, i) => [
        { text: String(i + 1), alignment: 'center' },
        { stack: [{ text: c.requirement }, ...(c.sourceMrNumber ? [{ text: `From ${c.sourceMrNumber}`, color: COLOR.muted, fontSize: 7 }] : [])] },
        { text: dash(c.vendorResponse) },
        yesNo(c.compliant),
        { text: dash(c.remarks) },
      ]), 'No compliance items.'));

    // ── 11. Deviation ──
    content.push(heading(++n, 'Deviation'));
    content.push(grid([28, 60, '*', 60, '*'], ['Sr#', 'Clause No.', 'RFQ Requirement', 'Vendor Deviation', 'Justification'],
      rfq.deviations.slice().sort((a, b) => a.sequence - b.sequence).map((d, i) => [
        { text: String(i + 1), alignment: 'center' },
        { text: d.clauseNo },
        { text: d.rfqRequirement },
        yesNo(d.vendorDeviation),
        { text: dash(d.justification) },
      ]), 'No deviations.'));

    const generated = dateTime(new Date());
    return {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 50],
      info: { title: `RFQ ${rfq.rfqNumber} Rev ${rfq.revisionNo}`, subject: rfq.subject ?? 'Request for Quotation', creator: 'Project Management' },
      defaultStyle: { font: 'Roboto', fontSize: 8.5, color: COLOR.text, lineHeight: 1.2 },
      styles: {
        org: { fontSize: 9, color: COLOR.muted, bold: true },
        title: { fontSize: 18, bold: true, color: COLOR.primary, margin: [0, 2, 0, 2] },
        subtitle: { fontSize: 10, color: COLOR.text },
        rfqNo: { fontSize: 12, bold: true, color: COLOR.text },
        h2: { fontSize: 11.5, bold: true, color: COLOR.primary },
        h3: { fontSize: 9.5, bold: true, color: COLOR.text, margin: [0, 2, 0, 4] },
        th: { bold: true, fontSize: 8, color: COLOR.text, alignment: 'center' },
        label: { fontSize: 7.5, bold: true, color: COLOR.muted },
      },
      footer: (current: number, total: number, _size: ContextPageSize): Content => ({
        columns: [
          { width: '*', text: `RFQ ${rfq.rfqNumber} · Rev ${rfq.revisionNo}${rfq.trackingId ? ` · ${rfq.trackingId}` : ''}`, color: COLOR.muted, fontSize: 7 },
          { width: 'auto', text: `Generated ${generated}`, color: COLOR.muted, fontSize: 7, alignment: 'center', margin: [12, 0, 12, 0] },
          { width: 60, text: `Page ${current} of ${total}`, color: COLOR.muted, fontSize: 7, alignment: 'right' },
        ],
        margin: [40, 18, 40, 0],
      }),
      content,
    };
  }
}
