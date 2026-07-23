import { Repository } from 'typeorm';
import { ProtectionUtil } from 'src/common/utils/protection.util';
import { CustomEnvService } from 'src/config/custom-env.service';
import { ReplyMasking } from 'src/relay-emails/entities/reply-masking.entity';
import { ReplyEmailsService } from 'src/relay-emails/reply-emails.service';

describe('ReplyEmailsService', () => {
  let service: ReplyEmailsService;
  let repository: jest.Mocked<Repository<ReplyMasking>>;
  let protectionUtil: jest.Mocked<ProtectionUtil>;
  let createMock: jest.Mock;
  let saveMock: jest.Mock;
  let hmacMock: jest.Mock;

  beforeEach(() => {
    createMock = jest.fn((entity) => entity as ReplyMasking);
    saveMock = jest.fn((entity) => Promise.resolve(entity as ReplyMasking));
    repository = {
      findOne: jest.fn(),
      create: createMock,
      save: saveMock,
    } as unknown as jest.Mocked<Repository<ReplyMasking>>;
    hmacMock = jest.fn(() => 'signature');
    protectionUtil = {
      encrypt: jest.fn((value: string) => `encrypted:${value}`),
      hashEmailAddress: jest.fn((value: string) => `hash:${value}`),
      hmac: hmacMock,
    } as unknown as jest.Mocked<ProtectionUtil>;
    const customEnvService = {
      get: jest.fn().mockReturnValue('private-mailhub.com'),
    } as unknown as jest.Mocked<CustomEnvService>;

    service = new ReplyEmailsService(repository, protectionUtil, customEnvService);
  });

  it('normalizes addresses before creating an HMAC reply address', async () => {
    repository.findOne.mockResolvedValue(null);

    const result = await service.create(' Sender@Example.COM ', ' Relay@Example.COM ');

    expect(hmacMock).toHaveBeenCalledWith('sender@example.com:relay@example.com');
    expect(createMock).toHaveBeenCalledWith({
      replyAddress: 'reply-signature@private-mailhub.com',
      senderAddress: 'encrypted:sender@example.com',
      senderAddressHash: 'hash:sender@example.com',
      receiverAddress: 'encrypted:relay@example.com',
      receiverAddressHash: 'hash:relay@example.com',
    });
    expect(saveMock).toHaveBeenCalled();
    expect(result.replyAddress).toBe('reply-signature@private-mailhub.com');
  });

  it('returns an existing reply masking record without creating another one', async () => {
    const existing = {
      id: 1n,
      replyAddress: 'reply-signature@private-mailhub.com',
    } as ReplyMasking;
    repository.findOne.mockResolvedValue(existing);

    await expect(service.create('sender@example.com', 'relay@example.com')).resolves.toBe(existing);

    expect(createMock).not.toHaveBeenCalled();
    expect(saveMock).not.toHaveBeenCalled();
  });
});
