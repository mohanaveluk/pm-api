import { Injectable } from '@nestjs/common';
import { createTransport } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
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

  async sendEmail({
    to,
    cc,
    subject,
    html,
  }: {
    to: string | string[];
    cc?: string | string[];
    subject: string;
    html: string;
  }) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        cc,
        subject,
        html,
      });
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }
}