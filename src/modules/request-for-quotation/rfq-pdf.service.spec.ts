import { RfqPdfService } from './rfq-pdf.service';
import { RfqResponseDto } from './dto/rfq-response.dto';

const rfq = {
  rfqNumber: 'RFQ/0007', revisionNo: 2, status: 'ISSUED', subject: 'Request for Quotation for Pipes', projectCode: '0003',
  projectName: 'Refinery', clientName: null, vendorName: 'Acme', vendorEmail: null, vendorAddress: null, bidClosingDate: '2026-12-01',
  sealedBid: false, ndaScope: null, requisitions: [], trackingId: null, quotedCurrency: null, issuedAt: new Date(), contactName: 'Buyer',
  items: [{ lineNumber: 1, itemCode: 'M-1', description: 'Pipe', uom: 'M', rfqQuantity: 5, unitPrice: null, totalPrice: null,
    exchangeRate: null, totalPriceUsd: null, deliveryDuration: null, remarks: null }],
  documents: [], otherCharges: [], checklist: [], compliances: [], deviations: [], quotedTotal: null, quotedTotalUsd: null, acknowledgement: null,
} as unknown as RfqResponseDto;

describe('RfqPdfService', () => {
  const service = new RfqPdfService();

  it('renders a PDF', async () => {
    const pdf = await service.render(rfq, 'Demo Co');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(5000);
  });

  it('names the file after the RFQ number and revision, without unsafe characters', () => {
    expect(service.fileName(rfq)).toBe('RFQ-RFQ-0007-Rev2.pdf');
  });
});
