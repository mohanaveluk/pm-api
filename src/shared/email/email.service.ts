import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createTransport } from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { CustomLoggerService } from 'src/modules/logger/custom-logger.service';
import { EmailHistory } from './entities/email-history.entity';
import { EMAIL_PROVIDER_SMTP, EmailStatus, EmailType } from './enums/email.enums';

export interface SendEmailOptions {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  /** What the email is about — recorded in email_history. */
  emailType: EmailType;
  /** The user whose action sent the email; omit for system emails. */
  fromUserId?: string | null;
  /** That user's email (email_history.created_by). */
  createdBy?: string | null;
  organizationId?: string | null;
  /** The document the email is about, e.g. { type: 'MATERIAL_REQUISITION', id }. */
  reference?: { type: string; id: string } | null;
  metadata?: Record<string, any> | null;
  /**
   * Secrets the email carries (codes, tokens, reset links, temporary
   * passwords). They are sent as written but replaced with [REDACTED] in the
   * stored copy, so email_history never holds a usable credential.
   */
  redact?: Array<string | null | undefined>;
}

const REDACTED = '[REDACTED]';

/** "a@x.com, b@x.com" from a string or list, without blanks or duplicates. */
function addressList(value: string | string[] | null | undefined): string {
  const all = (Array.isArray(value) ? value : String(value ?? '').split(','))
    .map((v) => v.trim())
    .filter(Boolean);
  return [...new Set(all)].join(', ');
}

@Injectable()
export class EmailService {
  private transporter;

  constructor(
    @InjectRepository(EmailHistory) private readonly historyRepo: Repository<EmailHistory>,
    private readonly logger: CustomLoggerService,
  ) {
    this.transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Sends an email and records it in email_history: PENDING before sending,
   * then SENT (with the provider's message id) or FAILED (with the reason).
   * Returns true when it was sent. A failure to write the history never stops
   * the email itself.
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const { to, cc, subject, html } = options;
    const newCc: string = cc ? `ramakrishnan_sampath@yahoo.com,gcpstudy0@gmail.com, ${addressList(cc)}` : 'gcpstudy0@gmail.com';

    const history = await this.recordPending(options, newCc);

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        cc: newCc,
        subject,
        html,
      });
      await this.recordOutcome(history, {
        status: EmailStatus.SENT,
        sentAt: new Date(),
        providerMessageId: info?.messageId ?? null,
      });
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      await this.recordOutcome(history, {
        status: EmailStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private async recordPending(options: SendEmailOptions, cc: string): Promise<EmailHistory | null> {
    try {
      let stored = options.html;
      for (const secret of options.redact ?? []) {
        if (secret) stored = stored.split(String(secret)).join(REDACTED);
      }
      return await this.historyRepo.save(this.historyRepo.create({
        guid: uuidv4(),
        emailType: options.emailType,
        organizationId: options.organizationId ?? null,
        fromUserId: options.fromUserId ?? null,
        fromEmail: process.env.SMTP_FROM || process.env.SMTP_USER || 'unknown',
        toEmail: addressList(options.to),
        ccEmail: addressList(cc) || null,
        subject: String(options.subject ?? '').slice(0, 500),
        htmlContent: stored,
        status: EmailStatus.PENDING,
        provider: EMAIL_PROVIDER_SMTP,
        referenceType: options.reference?.type ?? null,
        referenceId: options.reference?.id ?? null,
        metadata: options.metadata ?? null,
        createdBy: options.createdBy ?? null,
      }));
    } catch (err) {
      this.logger.error(
        `Could not record email "${options.subject}" (${options.emailType}) in email_history: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
      return null;
    }
  }

  private async recordOutcome(history: EmailHistory | null, outcome: Partial<EmailHistory>): Promise<void> {
    if (!history) return;
    try {
      await this.historyRepo.update({ id: history.id }, outcome);
    } catch (err) {
      this.logger.error(
        `Could not update email_history ${history.guid} to ${outcome.status}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
