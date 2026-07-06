import { AuthGuard } from './auth.guard';
import { UserStatus } from '../../users/user.enums';

describe('AuthGuard', () => {
  it('rejects requests for deactivated users even when the access token is valid', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };
    const tokenService = {
      parsePayloadFromToken: jest.fn().mockReturnValue({
        userId: 1n,
        username: 'user@example.com',
      }),
    };
    const usersService = {
      findById: jest.fn().mockResolvedValue({
        id: 1n,
        status: UserStatus.DEACTIVATED,
      }),
    };
    const guard = new AuthGuard(reflector as never, tokenService as never, usersService as never);
    const request = {
      headers: {
        authorization: 'Bearer access-token',
      },
      method: 'GET',
      url: '/users/me',
    } as never;
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as never;

    await expect(guard.canActivate(context)).rejects.toThrow('Account is deactivated');
  });
});
