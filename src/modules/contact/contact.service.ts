import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entity/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { EmailService } from 'src/shared/email/email.service';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { contactAdminTemplate } from 'src/shared/email/templates/contact-admin.template';
import { contactAdminNotificationTemplate, contactThankYouTemplate } from 'src/shared/email/templates/contact-email.template';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    private emailService: EmailService,
    private logger: CustomLoggerService
  ) {}

  async create(createContactDto: CreateContactDto ) {
    // Save contact form data
    const contact = this.contactRepository.create(createContactDto);
    contact.created_at = new Date();
    await this.contactRepository.save(contact);

    this.logger.debug('Sending email...');
    // Send email notification to admin
    try {

      await this.emailService.sendEmail({
        to:      createContactDto.email,
        subject: 'We received your message – Voter Pulse',
        html:    contactThankYouTemplate(createContactDto),
      });
      this.logger.log('Thank you email has been sent');

      await this.emailService.sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `[Contact Us] New message from ${createContactDto.firstName} ${createContactDto.lastName} – ${createContactDto.subject}`,
        html: contactAdminNotificationTemplate(createContactDto),
      });

      this.logger.log(`Admin notification sent to ${process.env.ADMIN_EMAIL}`);
    } catch (err) {
      this.logger.error('Failed to send admin notification email', err);
    }

    return {
      message: 'Your message has been sent successfully',
      contact,
    };
  }

  async findAll() {
    return await this.contactRepository.find();
  }
}