// Mock SendGrid send function
const sendMock = jest.fn();

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: sendMock,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../src/mail/mail.service';

describe('MailService', () => {
  let mailService: MailService;

  const configServiceMock = {
    get: jest.fn(() => 'SG.-your-sendgrid-api-key'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    mailService = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(mailService).toBeDefined();
  });

  describe('send', () => {
    it('should send an email', async () => {
      const mailData = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
        subject: 'Test Subject',
        text: 'Test Message',
      };

      sendMock.mockResolvedValue(['SendGrid Response']);

      const [response, unknownValue] = await mailService.send(mailData);

      expect(response).toBe('SendGrid Response');
      expect(unknownValue).toBeUndefined();
      expect(configServiceMock.get).toHaveBeenCalledWith('SENDGRID_KEY');
      expect(sendMock).toHaveBeenCalledWith(mailData);
    });

    it('should handle errors', async () => {
      const mailData = {
        to: 'qq@qq.xd',
        from: 'xd@xd.qq',
        subject: 'Verify Your Account',
        text: 'some text',
        html: 'some html',
      };

      const error = new Error('SendGrid Error');
      sendMock.mockRejectedValue(error);

      await expect(mailService.send(mailData)).rejects.toThrowError(error);
      expect(configServiceMock.get).toHaveBeenCalledWith('SENDGRID_KEY');
      expect(sendMock).toHaveBeenCalledWith(mailData);
    });
  });
});
