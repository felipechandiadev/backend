import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

import nodemailer from 'nodemailer';

describe('EmailService', () => {
  let service: EmailService;

  const sendMailMock = jest.fn().mockResolvedValue({ messageId: 'test-id' });
  const createTransportMock = jest
    .fn()
    .mockReturnValue({ sendMail: sendMailMock });

  beforeAll(async () => {
    // Ensure nodemailer.createTransport is our mock when EmailService is constructed
    (nodemailer as any).createTransport = createTransportMock;

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [EmailService, ConfigService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('renders template and calls transporter.sendMail', async () => {
    // Prepare a minimal template file used by EmailService
    // Spy on the actual transporter attached to the service instance
    const sendSpy = jest
      .spyOn((service as any).transporter, 'sendMail')
      .mockResolvedValue({ messageId: 'test-id' });

    const result = await service.sendMail({
      to: 'test@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
    });

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'Hello',
        html: expect.stringContaining('<p>Hi</p>'),
      }),
    );

    expect(result).toEqual({ messageId: 'test-id' });
  });
});
