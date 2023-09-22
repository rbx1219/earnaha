// mail/mail.module.ts

import { Module } from '@nestjs/common';
import { SendGridModule } from '@ntegral/nestjs-sendgrid';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [SendGridModule.forRoot({ apiKey: process.env.SENDGRID_KEY })],
  providers: [MailService, ConfigService],
  exports: [SendGridModule, MailService],
})
export class MailModule {}
