import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReplyMasking } from './entities/reply-masking.entity';
import { ProtectionUtil } from 'src/common/utils/protection.util';
import { CustomEnvService } from 'src/config/custom-env.service';

@Injectable()
export class ReplyEmailsService {
  private readonly logger = new Logger(ReplyEmailsService.name);

  constructor(
    @InjectRepository(ReplyMasking)
    private readonly replyMaskingRepository: Repository<ReplyMasking>,
    private readonly protectionUtil: ProtectionUtil,
    private readonly customEnvService: CustomEnvService,
  ) {}

  async findByReplyAddress(replyAddress: string): Promise<ReplyMasking | null> {
    return await this.replyMaskingRepository.findOne({
      where: { replyAddress },
    });
  }
  async create(sender: string, receiver: string): Promise<ReplyMasking> {
    const normalizedSender = this.normalizeEmailAddress(sender);
    const normalizedReceiver = this.normalizeEmailAddress(receiver);
    const replyAddress = this.generateReplyMaskingEmail(normalizedSender, normalizedReceiver);

    // check if its existing
    const existing = await this.replyMaskingRepository.findOne({ where: { replyAddress } });

    if (existing) {
      return existing;
    }

    // create
    const entity = this.replyMaskingRepository.create({
      replyAddress,
      senderAddress: this.protectionUtil.encrypt(normalizedSender),
      senderAddressHash: this.protectionUtil.hashEmailAddress(normalizedSender),
      receiverAddress: this.protectionUtil.encrypt(normalizedReceiver),
      receiverAddressHash: this.protectionUtil.hashEmailAddress(normalizedReceiver),
    });

    return this.replyMaskingRepository.save(entity);
  }

  private generateReplyMaskingEmail(sender: string, receiver: string): string {
    const domain = this.customEnvService.get<string>('APP_DOMAIN');
    const signature = this.protectionUtil.hmac(`${sender}:${receiver}`);
    return `reply-${signature}@${domain}`;
  }

  private normalizeEmailAddress(address: string): string {
    return address.trim().toLowerCase();
  }
}
