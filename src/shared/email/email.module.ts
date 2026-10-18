import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './email.service';
import { EmailHistory } from './entities/email-history.entity';

// Import this module wherever email is sent; do not list EmailService in a
// module's own providers — it needs the email_history repository registered here.
@Module({
  imports: [TypeOrmModule.forFeature([EmailHistory])],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
