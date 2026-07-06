import { ForbiddenException } from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { OAuthProvider } from '../common/enums/oauth-provider.enum';
import { UserStatus } from '../users/user.enums';

describe('OAuthService', () => {
  let service: OAuthService;
  let tokenService: {
    generateTokens: jest.Mock;
  };
  let cacheService: {
    setSession: jest.Mock;
  };
  let usersService: {
    findByOAuthId: jest.Mock;
    findByUsernameHash: jest.Mock;
    linkOAuth: jest.Mock;
    createOAuthUser: jest.Mock;
    updateUser: jest.Mock;
  };
  let customEnvService: {
    get: jest.Mock;
  };
  let protectionUtil: {
    encrypt: jest.Mock;
    hash: jest.Mock;
  };
  let userActivityLogService: {
    record: jest.Mock;
  };

  beforeEach(() => {
    tokenService = {
      generateTokens: jest.fn().mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
    };
    cacheService = {
      setSession: jest.fn(),
    };
    usersService = {
      findByOAuthId: jest.fn(),
      findByUsernameHash: jest.fn(),
      linkOAuth: jest.fn(),
      createOAuthUser: jest.fn(),
      updateUser: jest.fn(),
    };
    customEnvService = {
      get: jest.fn(),
    };
    protectionUtil = {
      encrypt: jest.fn((value: string) => `enc:${value}`),
      hash: jest.fn((value: string) => `hash:${value}`),
    };
    userActivityLogService = {
      record: jest.fn(),
    };

    service = new OAuthService(
      tokenService as never,
      cacheService as never,
      usersService as never,
      customEnvService as never,
      protectionUtil as never,
      userActivityLogService as never,
    );
  });

  describe('processOAuthUser', () => {
    it('rejects a deactivated user found by OAuth identity', async () => {
      usersService.findByOAuthId.mockResolvedValue({
        id: 1n,
        status: UserStatus.DEACTIVATED,
        username: 'encrypted@example.com',
        usernameHash: 'hash:user@example.com',
      });

      await expect(
        (service as any).processOAuthUser(
          'user@example.com',
          OAuthProvider.GITHUB,
          'oauth-id',
          '127.0.0.1',
          'agent',
          'encrypted-token',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(usersService.linkOAuth).not.toHaveBeenCalled();
      expect(tokenService.generateTokens).not.toHaveBeenCalled();
    });

    it('rejects a deactivated user found by email when no OAuth identity exists', async () => {
      usersService.findByOAuthId.mockResolvedValue(null);
      usersService.findByUsernameHash.mockResolvedValue({
        id: 1n,
        status: UserStatus.DEACTIVATED,
        username: 'encrypted@example.com',
        usernameHash: 'hash:user@example.com',
      });

      await expect(
        (service as any).processOAuthUser(
          'user@example.com',
          OAuthProvider.GOOGLE,
          'oauth-id',
          '127.0.0.1',
          'agent',
          'encrypted-token',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(usersService.linkOAuth).not.toHaveBeenCalled();
      expect(usersService.createOAuthUser).not.toHaveBeenCalled();
    });
  });
});
