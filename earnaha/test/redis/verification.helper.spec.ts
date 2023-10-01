import { VerificationHelper } from '../../src/redis/verification.helper';
import { Redis } from 'ioredis';
import { RedisListHelper } from '../../src/redis/redis.list.helper';

jest.mock('ioredis');

describe('VerificationHelper', () => {
  let verificationHelper: VerificationHelper;
  let mockRedisClient: jest.Mocked<Redis>;
  let mockRedisListHelper: jest.Mocked<RedisListHelper>;

  beforeEach(() => {
    mockRedisClient = {
      hmset: jest.fn(),
      expire: jest.fn(),
      hgetall: jest.fn(),
      del: jest.fn(),
    } as any;

    mockRedisListHelper = {
      activeLength: jest.fn(),
      pushToUserList: jest.fn(),
    } as any;

    verificationHelper = new VerificationHelper(
      mockRedisClient,
      mockRedisListHelper,
    );
  });

  describe('setVerificationMapping', () => {
    it('should set verification mapping correctly', async () => {
      const token = 'testToken';
      const userId = 1;
      const email = 'test@example.com';

      await verificationHelper.setVerificationMapping(token, userId, email);
      expect(mockRedisClient.hmset).toHaveBeenCalled();
    });
  });

  describe('getVerificationInfoByToken', () => {
    it('should return verification info by token', async () => {
      const token = 'testToken';
      mockRedisClient.hgetall.mockResolvedValue({
        userId: '1',
        email: 'test@example.com',
      });
      const result = await verificationHelper.getVerificationInfoByToken(token);
      expect(result).toEqual({ userId: 1, email: 'test@example.com' });
    });

    it('should return null if data is not found', async () => {
      const token = 'testToken';
      mockRedisClient.hgetall.mockResolvedValue({});
      const result = await verificationHelper.getVerificationInfoByToken(token);
      expect(result).toEqual({ userId: null, email: null });
    });
  });

  describe('delVerifyMapping', () => {
    it('should delete verification mapping', async () => {
      const token = 'testToken';
      const userId = 1;
      await verificationHelper.delVerifyMapping(token, userId);
      expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUserVerifyInfo', () => {
    it('should return user verification info', async () => {
      const userId = 1;
      mockRedisClient.hgetall.mockResolvedValue({
        token: 'testToken',
        email: 'test@example.com',
      });
      const result = await verificationHelper.getUserVerifyInfo(userId);
      expect(result).toEqual({ token: 'testToken', email: 'test@example.com' });
    });

    it('should return null if data is not found', async () => {
      const userId = 1;
      mockRedisClient.hgetall.mockResolvedValue({});
      const result = await verificationHelper.getUserVerifyInfo(userId);
      expect(result).toEqual({ token: null, email: null });
    });
  });

  describe('canSendVerification', () => {
    it('should return false if limit is reached', async () => {
      const userId = 1;
      mockRedisClient.hgetall.mockResolvedValue({
        token: 'testToken',
        email: 'test@example.com',
      });
      mockRedisListHelper.activeLength.mockResolvedValue(10);
      const result = await verificationHelper.canSendVerification(userId);
      expect(result).toBeFalsy();
    });

    it('should return true if limit is not reached', async () => {
      const userId = 1;
      mockRedisClient.hgetall.mockResolvedValue({
        token: 'testToken',
        email: 'test@example.com',
      });
      mockRedisListHelper.activeLength.mockResolvedValue(5);
      const result = await verificationHelper.canSendVerification(userId);
      expect(result).toBeTruthy();
    });
  });

  describe('incSendingMail', () => {
    it('should increase mail count', async () => {
      const token = 'testToken';
      await verificationHelper.incSendingMail(token);
      expect(mockRedisListHelper.pushToUserList).toHaveBeenCalledWith(token);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
