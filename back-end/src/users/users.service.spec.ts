import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserStatus } from './user.enums';
import { OAuthProvider } from '../common/enums/oauth-provider.enum';
import { UserActivityType } from '../common/enums/activity-type.enum';
import { User } from './entities/user.entity';
import { OAuthAccount } from './entities/oauth-account.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let oauthAccountRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    delete: jest.Mock;
  };
  let protectionUtil: {
    decrypt: jest.Mock;
    hash: jest.Mock;
  };
  let cacheService: {
    setUsernameChangeData: jest.Mock;
    getUsernameChangeData: jest.Mock;
    deleteUsernameChangeData: jest.Mock;
  };
  let sendMailService: {
    sendVerificationCodeForReturningUser: jest.Mock;
  };
  let userActivityLogService: {
    record: jest.Mock;
  };
  let customEnvService: {
    get: jest.Mock;
  };

  beforeEach(() => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    oauthAccountRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
    };
    protectionUtil = {
      decrypt: jest.fn(),
      hash: jest.fn(),
    };
    cacheService = {
      setUsernameChangeData: jest.fn(),
      getUsernameChangeData: jest.fn(),
      deleteUsernameChangeData: jest.fn(),
    };
    sendMailService = {
      sendVerificationCodeForReturningUser: jest.fn(),
    };
    userActivityLogService = {
      record: jest.fn(),
    };
    customEnvService = {
      get: jest.fn(),
    };

    service = new UsersService(
      userRepository as never,
      oauthAccountRepository as never,
      protectionUtil as never,
      cacheService as never,
      sendMailService as never,
      userActivityLogService as never,
      customEnvService as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('deactivateUser', () => {
    it('revokes provider tokens and clears linked OAuth state', async () => {
      const user = {
        id: 1n,
        status: UserStatus.ACTIVE,
        githubOAuth: 'github-oauth-id',
        appleOAuth: 'apple-oauth-id',
        googleOAuth: 'google-oauth-id',
        githubOAuthToken: 'github-token',
        googleOAuthToken: 'google-token',
      } as User;

      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue(user);
      userRepository.update.mockResolvedValue({ affected: 1 });
      oauthAccountRepository.find.mockResolvedValue([
        { provider: OAuthProvider.GITHUB } as OAuthAccount,
        { provider: OAuthProvider.APPLE } as OAuthAccount,
        { provider: OAuthProvider.GOOGLE } as OAuthAccount,
      ]);
      oauthAccountRepository.delete.mockResolvedValue({ affected: 1 });

      const fetchMock = jest.spyOn(globalThis as any, 'fetch').mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes('github.com')) {
          return { ok: true, status: 204, json: async () => ({}) } as Response;
        }
        if (url.includes('googleapis.com')) {
          return { ok: true, status: 200, json: async () => ({}) } as Response;
        }
        return { ok: true, status: 200, json: async () => ({}) } as Response;
      });

      await service.deactivateUser(1n);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.DEACTIVATED,
          deactivatedAt: expect.any(Date),
        }),
      );
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(userRepository.update).toHaveBeenCalledWith(
        { id: 1n },
        expect.objectContaining({
          githubOAuth: null,
          githubOAuthToken: null,
        }),
      );
      expect(userRepository.update).toHaveBeenCalledWith(
        { id: 1n },
        expect.objectContaining({
          appleOAuth: null,
        }),
      );
      expect(userRepository.update).toHaveBeenCalledWith(
        { id: 1n },
        expect.objectContaining({
          googleOAuth: null,
          googleOAuthToken: null,
        }),
      );
      expect(oauthAccountRepository.delete).toHaveBeenCalledWith({
        userId: 1n,
        provider: OAuthProvider.GITHUB,
      });
      expect(oauthAccountRepository.delete).toHaveBeenCalledWith({
        userId: 1n,
        provider: OAuthProvider.APPLE,
      });
      expect(oauthAccountRepository.delete).toHaveBeenCalledWith({
        userId: 1n,
        provider: OAuthProvider.GOOGLE,
      });
      expect(userActivityLogService.record).toHaveBeenCalledWith(
        1n,
        UserActivityType.ACCOUNT_DEACTIVATION,
      );
    });
  });

  describe('deactivateUser idempotency', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.deactivateUser(1n)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
