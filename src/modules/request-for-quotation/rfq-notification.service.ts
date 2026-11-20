import { Injectable } from '@nestjs/common';
import { EmailService } from 'src/shared/email/email.service';
import { EmailType } from 'src/shared/email/enums/email.enums';
import {
  rfqIssuedSubject, rfqIssuedTemplate, rfqResponseSubmittedSubject, rfqResponseSubmittedTemplate,
} from 'src/shared/email/templates/rfq-issued-template';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { RfqNdaScope } from './enums/rfq.enums';
import { RfqResponseDto } from './dto/rfq-response.dto';

const NDA_LABELS: Record<string, string> = {
  [RfqNdaScope.TECHNICAL]: 'Technical',
  [RfqNdaScope.COMMERCIAL]: 'Commercial',
  [RfqNdaScope.TECHNICAL_AND_COMMERCIAL]: 'Technical and Commercial',
};

/**
 * RFQ emails. Safe to call without awaiting: a failed email is logged and never
 * undoes the step that triggered it. Links land on the application, where the
 * vendor signs in.
 */
@Injectable()
export class RfqNotificationService {
  constructor(
    private readonly emailService: EmailService,
    private readonly logger: CustomLoggerService,
  ) {}

  private url(path: string): string {
    return `${(process.env.FRONTEND_URL ?? '').replace(/\/$/, '')}${path}`;
  }

  /** The buyer's RFQ screen. */
  viewUrl(id: string): string { return this.url(`/rfqs/${id}`); }
  /** The vendor's screens (external users sign in first, then land here). */
  vendorViewUrl(id: string): string { return this.url(`/vendor-rfqs/${id}`); }
  acknowledgeUrl(id: string): string { return this.url(`/vendor-rfqs/${id}/acknowledge`); }

  /** Issued: the vendor gets the RFQ letter with Acknowledge and View buttons; the buyer is copied. */
  async issued(rfq: RfqResponseDto, organizationId: string, sender: { userId?: string | null; email?: string | null }): Promise<void> {
    const to = rfq.vendorEmail;
    if (!to) return;
    const data = {
      rfqNumber: rfq.rfqNumber,
      revisionNo: rfq.revisionNo,
      subject: rfq.subject ?? 'Request for Quotation',
      content: rfq.content,
      vendorName: rfq.vendorName ?? 'Vendor',
      vendorAddress: rfq.vendorAddress,
      projectCode: rfq.projectCode,
      projectName: rfq.projectName,
      clientName: rfq.clientName,
      requisitions: rfq.requisitions.map((r) => r.mrNumber),
      issueDate: rfq.issueDate,
      bidClosingDate: rfq.bidClosingDate,
      sealedBid: rfq.sealedBid,
      ndaScope: rfq.ndaScope ? NDA_LABELS[rfq.ndaScope] ?? rfq.ndaScope : null,
      itemCount: rfq.items.length,
      lines: rfq.items.map((i) => ({
        lineNumber: i.lineNumber, itemCode: i.itemCode, description: i.description, uom: i.uom, rfqQuantity: i.rfqQuantity,
      })),
      contactName: rfq.contactName,
      contactEmail: rfq.contactEmail,
      contactPhone: rfq.contactPhone,
      trackingId: rfq.trackingId,
      acknowledgeUrl: this.acknowledgeUrl(rfq.id),
      viewUrl: this.vendorViewUrl(rfq.id),
    };
    const subject = rfqIssuedSubject(data);
    try {
      const cc = rfq.contactEmail && rfq.contactEmail.toLowerCase() !== to.toLowerCase() ? rfq.contactEmail : undefined;
      const sent = await this.emailService.sendEmail({
        to: [to],
        cc,
        subject,
        html: rfqIssuedTemplate(data),
        emailType: EmailType.SEND_RFQ_TO_VENDOR,
        fromUserId: sender.userId ?? null,
        createdBy: sender.email ?? null,
        organizationId,
        reference: { type: 'RFQ', id: rfq.id },
        metadata: { rfqNumber: rfq.rfqNumber, revisionNo: rfq.revisionNo, trackingId: rfq.trackingId, status: rfq.status },
      });
      if (!sent) this.logger.warn(`RFQ email "${subject}" was not sent (${rfq.rfqNumber})`, RfqNotificationService.name);
    } catch (err) {
      this.logger.error(
        `Failed to send RFQ email "${subject}" for ${rfq.rfqNumber}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  /** The vendor submitted (or updated) its response: the buyer is told, with a summary. */
  async responseSubmitted(
    rfq: RfqResponseDto, organizationId: string, buyers: string[],
    sender: { userId?: string | null; email?: string | null }, resubmitted: boolean,
  ): Promise<void> {
    const to = [...new Set(buyers.filter(Boolean).map((e) => e.toLowerCase()))];
    if (!to.length) return;
    const data = {
      rfqNumber: rfq.rfqNumber,
      revisionNo: rfq.revisionNo,
      subject: rfq.subject,
      vendorName: rfq.vendorName ?? 'The vendor',
      projectCode: rfq.projectCode,
      projectName: rfq.projectName,
      clientName: rfq.clientName,
      bidClosingDate: rfq.bidClosingDate,
      submittedBy: sender.email ?? '',
      submittedAt: rfq.quotedAt ?? new Date(),
      resubmitted,
      quotedCurrency: rfq.quotedCurrency,
      quotedTotal: rfq.quotedTotal,
      quotedTotalUsd: rfq.quotedTotalUsd,
      itemCount: rfq.items.length,
      pricedCount: rfq.items.filter((i) => i.unitPrice != null).length,
      compliant: rfq.compliances.filter((c) => c.compliant === true).length,
      nonCompliant: rfq.compliances.filter((c) => c.compliant === false).length,
      deviationCount: rfq.deviations.length,
      checklistProvided: rfq.checklist.filter((c) => c.provided === true).length,
      checklistTotal: rfq.checklist.length,
      trackingId: rfq.trackingId,
      viewUrl: this.viewUrl(rfq.id),
    };
    const subject = rfqResponseSubmittedSubject(data);
    try {
      const sent = await this.emailService.sendEmail({
        to,
        subject,
        html: rfqResponseSubmittedTemplate(data),
        emailType: EmailType.RFQ_QUOTATION_RECEIVED,
        fromUserId: sender.userId ?? null,
        createdBy: sender.email ?? null,
        organizationId,
        reference: { type: 'RFQ', id: rfq.id },
        metadata: { rfqNumber: rfq.rfqNumber, revisionNo: rfq.revisionNo, trackingId: rfq.trackingId, status: rfq.status, resubmitted },
      });
      if (!sent) this.logger.warn(`RFQ email "${subject}" was not sent (${rfq.rfqNumber})`, RfqNotificationService.name);
    } catch (err) {
      this.logger.error(
        `Failed to send RFQ email "${subject}" for ${rfq.rfqNumber}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
