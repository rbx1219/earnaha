import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as SendGrid from '@sendgrid/mail';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {
    SendGrid.setApiKey(this.configService.get<string>('SENDGRID_KEY'));
  }

  async send(
    mail: SendGrid.MailDataRequired,
  ): Promise<[SendGrid.ClientResponse, NonNullable<unknown>]> {
    try {
      const transport = await SendGrid.send(mail);
      return transport;
    } catch (error) {
      console.log('send mail error: ', error);
      throw error;
    }
  }
}
