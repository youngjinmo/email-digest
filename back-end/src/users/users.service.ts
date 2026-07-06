import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { OAuthAccount } from './entities/oauth-account.entity';
import { SubscriptionTier } from '../common/enums/subscription-tier.enum';
import { OAuthProvider } from '../common/enums/oauth-provider.enum';
import { ProtectionUtil } from 'src/common/utils/protection.util';
import { UserStatus } from './user.enums';
import { CacheService } from '../cache/cache.service';
import { SendMailService } from '../mail/send-mail.service';
import { UserActivityLogService } from '../logs/user-activity-log.service';
import { UserActivityType } from '../common/enums/activity-type.enum';
import { CustomEnvService } from '../config/custom-env.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OAuthAccount)
    private oauthAccountRepository: Repository<OAuthAccount>,
    private proectionUtil: ProtectionUtil,
    private cacheService: CacheService,
    private sendMailService: SendMailService,
    private userActivityLogService: UserActivityLogService,
    private readonly customEnvService: CustomEnvService,
  ) {}

  async findById(id: bigint): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id },
    });
  }

  async findByUsernameHash(usernameHash: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { usernameHash },
    });
  }

  async existsByUsername(usernameHash: string): Promise<boolean> {
    const user = await this.findByUsernameHash(usernameHash);
    return !!user;
  }

  async createEmailUser(encryptedUsername: string): Promise<User> {
    try {
      // Check if user already exists
      const username = this.proectionUtil.decrypt(encryptedUsername);
      const usernameHash = this.proectionUtil.hash(username);
      const existingUser = await this.findByUsernameHash(usernameHash);
      if (existingUser) {
        throw new ConflictException('User already exists');
      }

      // create account
      const user = this.userRepository.create({
        username: encryptedUsername,
        usernameHash,
      });

      return await this.userRepository.save(user);
    } catch (err) {
      this.logger.error(err, 'Failed to create user');
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async updateUser(usernameHash: string, properties: Partial<User>): Promise<void> {
    const user = await this.findByUsernameHash(usernameHash);
    if (!user) {
      throw new NotFoundException('User not found');
    } else {
      Object.assign(user, properties);
      await this.userRepository.save(user);
    }
  }

  async deactivateUser(userId: bigint): Promise<void> {
    let wasDeactivated = false;

    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.status !== UserStatus.DEACTIVATED) {
        user.status = UserStatus.DEACTIVATED;
        user.deactivatedAt = new Date();
        await this.userRepository.save(user);
        wasDeactivated = true;
      }

      await this.cleanupOAuthConnections(user);

      this.logger.log(`success to deactivate user, userId=${userId}`);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(err, `failed to deactivate user, userId=${userId}`);
      throw new InternalServerErrorException('Failed to deactivate user');
    }

    if (wasDeactivated) {
      await this.userActivityLogService.record(userId, UserActivityType.ACCOUNT_DEACTIVATION);
    }
  }

  async deleteUser(userId: bigint): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete (TypeORM will handle this automatically)
    await this.userRepository.softRemove(user);
  }

  async updateSubscriptionTier(userId: bigint, tier: SubscriptionTier): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.subscriptionTier = tier;
    return await this.userRepository.save(user);
  }

  async getUserInfo(userId: bigint): Promise<{
    username: string;
    subscriptionTier: SubscriptionTier;
    createdAt: Date;
    ghOauth: boolean;
    aaplOauth: boolean;
    googOauth: boolean;
  }> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      username: this.proectionUtil.decrypt(user.username),
      subscriptionTier: user.subscriptionTier,
      createdAt: user.createdAt,
      ghOauth: !!user.githubOAuth,
      aaplOauth: !!user.appleOAuth,
      googOauth: !!user.googleOAuth,
    };
  }

  private static readonly OAUTH_FIELD_MAP: Record<OAuthProvider, keyof User> = {
    [OAuthProvider.GITHUB]: 'githubOAuth',
    [OAuthProvider.APPLE]: 'appleOAuth',
    [OAuthProvider.GOOGLE]: 'googleOAuth',
  };

  private static readonly OAUTH_TOKEN_FIELD_MAP: Partial<Record<OAuthProvider, keyof User>> = {
    [OAuthProvider.GITHUB]: 'githubOAuthToken',
    [OAuthProvider.GOOGLE]: 'googleOAuthToken',
  };

  async findByOAuthId(provider: OAuthProvider, oauthId: string): Promise<User | null> {
    const existingIdentity = await this.oauthAccountRepository.findOne({
      where: { provider, oauthId },
    });
    if (existingIdentity) {
      return await this.findById(existingIdentity.userId);
    }

    const field = UsersService.OAUTH_FIELD_MAP[provider];
    const user = await this.userRepository.findOne({
      where: { [field]: oauthId },
    });
    return user ?? null;
  }

  async createOAuthUser(
    encryptedEmail: string,
    provider: OAuthProvider,
    oauthId: string,
    encryptedToken?: string,
  ): Promise<User> {
    try {
      const email = this.proectionUtil.decrypt(encryptedEmail);
      const usernameHash = this.proectionUtil.hash(email);

      const existingUser = await this.findByUsernameHash(usernameHash);
      if (existingUser) {
        throw new ConflictException('User already exists');
      }

      const field = UsersService.OAUTH_FIELD_MAP[provider];
      const tokenField = UsersService.OAUTH_TOKEN_FIELD_MAP[provider];
      const user = this.userRepository.create({
        username: encryptedEmail,
        usernameHash,
        [field]: oauthId,
        ...(tokenField && encryptedToken ? { [tokenField]: encryptedToken } : {}),
      });

      const savedUser = await this.userRepository.save(user);
      await this.ensureOAuthIdentity(savedUser.id, provider, oauthId);

      return savedUser;
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      this.logger.error(err, 'Failed to create OAuth user');
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async linkOAuth(
    userId: bigint,
    provider: OAuthProvider,
    oauthId: string,
    encryptedToken?: string,
    options: { recordActivity?: boolean } = {},
  ): Promise<void> {
    const field = UsersService.OAUTH_FIELD_MAP[provider];
    const tokenField = UsersService.OAUTH_TOKEN_FIELD_MAP[provider];
    await this.userRepository.update(
      { id: userId },
      {
        [field]: oauthId,
        ...(tokenField && encryptedToken ? { [tokenField]: encryptedToken } : {}),
      },
    );
    await this.ensureOAuthIdentity(userId, provider, oauthId);

    if (options.recordActivity ?? true) {
      await this.userActivityLogService.record(userId, UserActivityType.OAUTH_LINK, provider);
    }
  }

  async unlinkOAuth(userId: bigint, provider: OAuthProvider): Promise<void> {
    await this.clearOAuthLink(userId, provider);

    await this.userActivityLogService.record(userId, UserActivityType.OAUTH_UNLINK, provider);
  }

  async getOAuthToken(userId: bigint, provider: OAuthProvider): Promise<string | null> {
    const user = await this.findById(userId);
    if (!user) return null;

    return this.getOAuthTokenFromUser(user, provider);
  }

  async requestUsernameChange(userId: bigint, encryptedNewUsername: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newUsername = this.proectionUtil.decrypt(encryptedNewUsername);
    const newUsernameHash = this.proectionUtil.hash(newUsername);

    // Check if new username is same as current
    if (newUsernameHash === user.usernameHash) {
      throw new BadRequestException('New email is same as current email');
    }

    // Check if new username already exists
    const existingUser = await this.findByUsernameHash(newUsernameHash);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // Generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in cache
    await this.cacheService.setUsernameChangeData(userId, encryptedNewUsername, code);

    // Send verification code to new email
    await this.sendMailService.sendVerificationCodeForReturningUser(newUsername, code);
  }

  async verifyUsernameChange(userId: bigint, code: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get cached data
    const cachedData = await this.cacheService.getUsernameChangeData(userId);
    if (!cachedData) {
      throw new BadRequestException(
        'Verification code not found or expired. Please request a new code.',
      );
    }

    // Verify code
    if (cachedData.code !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    const newUsername = this.proectionUtil.decrypt(cachedData.encryptedNewUsername);
    const newUsernameHash = this.proectionUtil.hash(newUsername);

    // Double check new username doesn't exist
    const existingUser = await this.findByUsernameHash(newUsernameHash);
    if (existingUser) {
      await this.cacheService.deleteUsernameChangeData(userId);
      throw new ConflictException('Email already in use');
    }

    // Update username
    user.username = cachedData.encryptedNewUsername;
    user.usernameHash = newUsernameHash;
    await this.userRepository.save(user);

    // Clear cache
    await this.cacheService.deleteUsernameChangeData(userId);

    await this.userActivityLogService.record(userId, UserActivityType.USERNAME_CHANGE);
  }

  private async ensureOAuthIdentity(
    userId: bigint,
    provider: OAuthProvider,
    oauthId: string,
  ): Promise<void> {
    const existingIdentity = await this.oauthAccountRepository.findOne({
      where: { provider, oauthId },
    });

    if (existingIdentity) {
      if (existingIdentity.userId !== userId) {
        throw new ConflictException('OAuth account is already linked to another user');
      }
      return;
    }

    const staleIdentity = await this.oauthAccountRepository.findOne({
      where: { userId, provider },
    });
    if (staleIdentity) {
      await this.oauthAccountRepository.remove(staleIdentity);
    }

    const identity = this.oauthAccountRepository.create({
      userId,
      provider,
      oauthId,
    });
    await this.oauthAccountRepository.save(identity);
  }

  private async cleanupOAuthConnections(user: User): Promise<void> {
    const providers = await this.getConnectedOAuthProviders(user);

    for (const provider of providers) {
      await this.cleanupOAuthConnection(user, provider);
    }
  }

  private async getConnectedOAuthProviders(user: User): Promise<OAuthProvider[]> {
    const providers = new Set<OAuthProvider>();

    const identities = await this.oauthAccountRepository.find({
      where: { userId: user.id },
    });
    for (const identity of identities) {
      providers.add(identity.provider);
    }

    for (const provider of Object.keys(UsersService.OAUTH_FIELD_MAP) as OAuthProvider[]) {
      const field = UsersService.OAUTH_FIELD_MAP[provider];
      if (user[field]) {
        providers.add(provider);
      }
    }

    for (const provider of Object.keys(UsersService.OAUTH_TOKEN_FIELD_MAP) as OAuthProvider[]) {
      const field = UsersService.OAUTH_TOKEN_FIELD_MAP[provider];
      if (field && user[field]) {
        providers.add(provider);
      }
    }

    return [...providers];
  }

  private async cleanupOAuthConnection(user: User, provider: OAuthProvider): Promise<void> {
    const token = this.getOAuthTokenFromUser(user, provider);

    if (token) {
      try {
        await this.revokeOAuthToken(provider, token);
        this.logger.log(`Success to revoke ${provider} token while deactivating user ${user.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Failed to revoke ${provider} token for deactivated user ${user.id}: ${message}`,
        );
      }
    }

    await this.clearOAuthLink(user.id, provider);
  }

  private async clearOAuthLink(userId: bigint, provider: OAuthProvider): Promise<void> {
    const field = UsersService.OAUTH_FIELD_MAP[provider];
    const tokenField = UsersService.OAUTH_TOKEN_FIELD_MAP[provider];
    await this.userRepository.update(
      { id: userId },
      {
        [field]: null,
        ...(tokenField ? { [tokenField]: null } : {}),
      },
    );
    await this.oauthAccountRepository.delete({ userId, provider });
  }

  private getOAuthTokenFromUser(user: User, provider: OAuthProvider): string | null {
    const tokenField = UsersService.OAUTH_TOKEN_FIELD_MAP[provider];
    if (!tokenField) return null;

    return (user[tokenField] as string) || null;
  }

  private async revokeOAuthToken(provider: OAuthProvider, token: string): Promise<void> {
    if (provider === OAuthProvider.GITHUB) {
      const clientId = this.customEnvService.get<string>('GITHUB_CLIENT_ID');
      const clientSecret = this.customEnvService.get<string>('GITHUB_CLIENT_SECRET');
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const response = await fetch(`https://api.github.com/applications/${clientId}/token`, {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: token }),
      });

      if (!response.ok && response.status !== 422) {
        throw new Error(`GitHub token revocation failed with status ${response.status}`);
      }
    } else if (provider === OAuthProvider.GOOGLE) {
      const response = await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      if (!response.ok && response.status !== 400) {
        throw new Error(`Google token revocation failed with status ${response.status}`);
      }
    }
  }
}
