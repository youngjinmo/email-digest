import { ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserStatus } from '../users/user.enums';

describe('AuthService', () => {
  let service: AuthService;
  let tokenService: {
    generateTokens: jest.Mock;
    parsePayloadFromToken: jest.Mock;
  };
  let cacheService: {
    setVerificationCode: jest.Mock;
    resetVerificationAttempts: jest.Mock;
    getVerificationAttempts: jest.Mock;
    getVerificationCode: jest.Mock;
    deleteVerificationCode: jest.Mock;
    incrementVerificationAttempts: jest.Mock;
    setSession: jest.Mock;
    getSession: jest.Mock;
    delSession: jest.Mock;
  };
  let usersService: {
    findByUsernameHash: jest.Mock;
    createEmailUser: jest.Mock;
    updateUser: jest.Mock;
    findById: jest.Mock;
  };
  let sendMailService: {
    sendVerificationCodeForNewUser: jest.Mock;
    sendVerificationCodeForReturningUser: jest.Mock;
    sendWelcomeEmail: jest.Mock;
  };
  let customEnvService: {
    getWithDefault: jest.Mock;
  };
  let protectionUtil: {
    decrypt: jest.Mock;
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
      parsePayloadFromToken: jest.fn().mockReturnValue({
        userId: 1n,
        username: 'user@example.com',
      }),
    };
    cacheService = {
      setVerificationCode: jest.fn(),
      resetVerificationAttempts: jest.fn(),
      getVerificationAttempts: jest.fn().mockResolvedValue(0),
      getVerificationCode: jest.fn().mockResolvedValue('123456'),
      deleteVerificationCode: jest.fn(),
      incrementVerificationAttempts: jest.fn(),
      setSession: jest.fn(),
      getSession: jest.fn().mockResolvedValue('fingerprint'),
      delSession: jest.fn(),
    };
    usersService = {
      findByUsernameHash: jest.fn(),
      createEmailUser: jest.fn(),
      updateUser: jest.fn(),
      findById: jest.fn(),
    };
    sendMailService = {
      sendVerificationCodeForNewUser: jest.fn(),
      sendVerificationCodeForReturningUser: jest.fn(),
      sendWelcomeEmail: jest.fn(),
    };
    customEnvService = {
      getWithDefault: jest.fn().mockReturnValue(3),
    };
    protectionUtil = {
      decrypt: jest.fn((value: string) => value),
      hash: jest.fn((value: string) => `hash:${value}`),
    };
    userActivityLogService = {
      record: jest.fn(),
    };

    service = new AuthService(
      tokenService as never,
      cacheService as never,
      usersService as never,
      sendMailService as never,
      customEnvService as never,
      protectionUtil as never,
      userActivityLogService as never,
    );
  });

  describe('verifyCodeAndLogin', () => {
    it('rejects a deactivated email account', async () => {
      usersService.findByUsernameHash.mockResolvedValue({
        id: 1n,
        status: UserStatus.DEACTIVATED,
        username: 'encrypted-user',
        usernameHash: 'hash:user@example.com',
      });

      await expect(
        service.verifyCodeAndLogin(
          {
            encryptedUsername: 'user@example.com',
            code: '123456',
          },
          '127.0.0.1',
          'agent',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(usersService.updateUser).not.toHaveBeenCalled();
      expect(tokenService.generateTokens).not.toHaveBeenCalled();
    });
  });

  describe('sendVerificationCode', () => {
    it('rejects a deactivated account before sending a login code', async () => {
      usersService.findByUsernameHash.mockResolvedValue({
        id: 1n,
        status: UserStatus.DEACTIVATED,
      });

      await expect(service.sendVerificationCode('user@example.com')).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(sendMailService.sendVerificationCodeForReturningUser).not.toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('clears the session and rejects a deactivated account', async () => {
      usersService.findById.mockResolvedValue({
        id: 1n,
        status: UserStatus.DEACTIVATED,
      });

      await expect(
        service.refreshTokens('refresh-token', '127.0.0.1', 'agent'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(cacheService.delSession).toHaveBeenCalledWith('refresh-token');
      expect(tokenService.generateTokens).not.toHaveBeenCalled();
    });
  });
});
