import { Repository } from 'typeorm';
import { CacheService } from 'src/cache/cache.service';
import { CustomEnvService } from 'src/config/custom-env.service';
import { ProtectionUtil } from 'src/common/utils/protection.util';
import { EmailForwardingLogService } from 'src/logs/email-forwarding-log.service';
import { SendMailService } from 'src/mail/send-mail.service';
import { S3Service } from 'src/aws/s3/s3.service';
import { S3EventRecord, SqsService } from 'src/aws/sqs/sqs.service';
import { RelayEmail } from 'src/relay-emails/entities/relay-email.entity';
import { ReplyMasking } from 'src/relay-emails/entities/reply-masking.entity';
import { RelayEmailsService } from 'src/relay-emails/relay-emails.service';
import { ReplyEmailsService } from 'src/relay-emails/reply-emails.service';

describe('RelayEmailsService reply authorization', () => {
  const relayAddress = 'relay@example.com';
  const replyAddress = 'reply-token@example.com';
  const record = {
    s3: {
      bucket: { name: 'email-bucket' },
      object: { key: 'message.eml' },
    },
  } as S3EventRecord;

  let service: RelayEmailsService;
  let relayEmailRepository: jest.Mocked<Repository<RelayEmail>>;
  let s3Service: jest.Mocked<S3Service>;
  let sendMailService: jest.Mocked<SendMailService>;
  let replyEmailsService: jest.Mocked<ReplyEmailsService>;
  let sendMailMock: jest.Mock;
  let incrementForwardCountSpy: jest.SpiedFunction<RelayEmailsService['incrementForwardCount']>;

  beforeEach(() => {
    relayEmailRepository = {
      findOne: jest.fn().mockResolvedValue({
        relayEmail: relayAddress,
        primaryEmail: 'encrypted-primary',
        isActive: true,
      } as RelayEmail),
    } as unknown as jest.Mocked<Repository<RelayEmail>>;
    s3Service = {
      getObject: jest.fn(),
    } as unknown as jest.Mocked<S3Service>;
    sendMailMock = jest.fn();
    sendMailService = {
      sendMail: sendMailMock,
    } as unknown as jest.Mocked<SendMailService>;
    replyEmailsService = {
      findByReplyAddress: jest.fn().mockResolvedValue({
        senderAddress: 'encrypted-original-sender',
        receiverAddress: 'encrypted-relay',
      } as ReplyMasking),
    } as unknown as jest.Mocked<ReplyEmailsService>;
    const protectionUtil = {
      decrypt: jest.fn((value: string) => {
        const decrypted = {
          'encrypted-original-sender': 'original@example.net',
          'encrypted-relay': relayAddress,
          'encrypted-primary': 'owner@example.com',
        };
        return decrypted[value];
      }),
    } as unknown as jest.Mocked<ProtectionUtil>;

    service = new RelayEmailsService(
      relayEmailRepository,
      {} as CustomEnvService,
      replyEmailsService,
      s3Service,
      {} as SqsService,
      sendMailService,
      {} as CacheService,
      protectionUtil,
      {} as EmailForwardingLogService,
    );
    incrementForwardCountSpy = jest.spyOn(service, 'incrementForwardCount').mockResolvedValue();
  });

  function setMailHeaders(fromHeaders: string): void {
    const rawEmail = [fromHeaders, `To: ${replyAddress}`, 'Subject: Reply', '', 'Reply body'].join(
      '\r\n',
    );
    s3Service.getObject.mockResolvedValue(Buffer.from(rawEmail));
  }

  async function processRecord(): Promise<void> {
    await service['processS3Record'](record);
  }

  it('forwards a reply when the canonical From address matches the primary email', async () => {
    setMailHeaders('From: "Account Owner" <Owner@Example.COM>');

    await processRecord();

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'original@example.net',
        from: relayAddress,
      }),
    );
    expect(incrementForwardCountSpy).toHaveBeenCalledWith(relayAddress);
  });

  it.each([
    ['a different address', 'From: attacker@example.com'],
    ['a plus-address variant', 'From: owner+tag@example.com'],
  ])('rejects %s', async (_, fromHeader) => {
    setMailHeaders(fromHeader);

    await processRecord();

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(incrementForwardCountSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing From address', 'Return-Path: <owner@example.com>'],
    ['multiple From addresses', 'From: owner@example.com, attacker@example.com'],
  ])('rejects replies with %s', async (_, fromHeaders) => {
    setMailHeaders(fromHeaders);

    await processRecord();

    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it.each([
    ['an unknown relay address', null],
    [
      'an inactive relay address',
      {
        relayEmail: relayAddress,
        primaryEmail: 'encrypted-primary',
        isActive: false,
      } as RelayEmail,
    ],
  ])('rejects replies for %s', async (_, relayEmail) => {
    relayEmailRepository.findOne.mockResolvedValue(relayEmail);
    setMailHeaders('From: owner@example.com');

    await processRecord();

    expect(sendMailMock).not.toHaveBeenCalled();
  });
});
