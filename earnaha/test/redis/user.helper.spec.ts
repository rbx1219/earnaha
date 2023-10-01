import { UserHelper } from '../../src/redis/user.helper';
import { Redis } from 'ioredis';

jest.mock('ioredis');

describe('UserHelper', () => {
  let userHelper: UserHelper;
  let mockRedisClient: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as any;

    userHelper = new UserHelper(mockRedisClient);
  });

  describe('getUserData', () => {
    it('should return user data if present', async () => {
      const userId = 1;
      const userData = { name: 'John Doe' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(userData));
      const result = await userHelper.getUserData(userId);
      expect(result).toEqual(JSON.stringify(userData));
    });

    it('should return NOTFOUND if user data is not present', async () => {
      const userId = 1;
      mockRedisClient.get.mockResolvedValue(null);
      const result = await userHelper.getUserData(userId);
      expect(result).toEqual('NOTFOUND');
    });
  });

  describe('setUserData', () => {
    it('should set user data correctly', async () => {
      const userId = 1;
      const userData = { name: 'John Doe' };
      await userHelper.setUserData(userId, userData);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `userdata:${userId}`,
        JSON.stringify(userData),
      );
    });
  });

  describe('delUserData', () => {
    it('should delete user data correctly', async () => {
      const userId = 1;
      await userHelper.delUserData(userId);
      expect(mockRedisClient.del).toHaveBeenCalledWith(`userdata:${userId}`);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
