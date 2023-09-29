import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../../src/redis/redis.service';
import { RedisListHelper } from '../../src/redis/redis.list.helper';
import { SessionHelper } from '../../src/redis/session.helper';
import { StatisticsHelper } from '../../src/redis/statistics.helper';
import { UserHelper } from '../../src/redis/user.helper';
import { VerificationHelper } from '../../src/redis/verification.helper';
import { Redis } from 'ioredis';

describe('RedisService', () => {
  let redisService: RedisService;
  let redisClientMock: jest.Mocked<Redis>;
  let redisListHelperMock: jest.Mocked<RedisListHelper>;
  let statisticsHelperMock: jest.Mocked<StatisticsHelper>;
  let sessionHelperMock: jest.Mocked<SessionHelper>;
  let userHelperMock: jest.Mocked<UserHelper>;
  let verifyHelperMock: jest.Mocked<VerificationHelper>;

  beforeEach(async () => {
    // Mock Redis Client
    redisClientMock = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      // ... 其他必要的Redis方法
    } as any;

    // Mock Helpers
    redisListHelperMock = {
      //... 你需要在這裡加入其他mock方法
    } as any;

    statisticsHelperMock = {
      recordActive: jest.fn(),
      getActiveCount: jest.fn(),
      // ... 其他方法
    } as any;

    sessionHelperMock = {
      setSessionData: jest.fn(),
      getSessionData: jest.fn(),
      clearSessionData: jest.fn(),
      setSessionBucket: jest.fn(),
      removeSessionFromBucket: jest.fn(),
      clearAllSession: jest.fn(),
      // ... 其他方法
    } as any;

    userHelperMock = {
      getUserData: jest.fn(),
      setUserData: jest.fn(),
      delUserData: jest.fn(),
      // ... 其他方法
    } as any;

    verifyHelperMock = {
      setVerificationMapping: jest.fn(),
      getVerificationInfoByToken: jest.fn(),
      delVerifyMapping: jest.fn(),
      getUserVerifyInfo: jest.fn(),
      canSendVerification: jest.fn(),
      incSendingMail: jest.fn(),
      // ... 其他方法
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: 'REDIS', useValue: redisClientMock },
        { provide: RedisListHelper, useValue: redisListHelperMock },
        { provide: StatisticsHelper, useValue: statisticsHelperMock },
        { provide: SessionHelper, useValue: sessionHelperMock },
        { provide: UserHelper, useValue: userHelperMock },
        { provide: VerificationHelper, useValue: verifyHelperMock },
      ],
    }).compile();

    redisService = module.get<RedisService>(RedisService);
  });

  describe('RedisService - storeSession', () => {
    it('should store session data and bucket', async () => {
      const sessionId = 'some-session-id';
      const userId = 123;

      await redisService.storeSession(sessionId, userId);

      expect(sessionHelperMock.setSessionData).toHaveBeenCalledWith(
        sessionId,
        userId,
      );
      expect(sessionHelperMock.setSessionBucket).toHaveBeenCalledWith(
        userId,
        sessionId,
      );
    });
  });
  describe('RedisService - getSessionData', () => {
    it('should retrieve session data by UUID', async () => {
      const uuid = 'some-session-uuid';
      sessionHelperMock.getSessionData.mockResolvedValue(123);

      const result = await redisService.getSessionData(uuid);

      expect(sessionHelperMock.getSessionData).toHaveBeenCalledWith(uuid);
      expect(result).toBe(123);
    });
  });

  describe('RedisService - clearSessionData', () => {
    it('should clear session data and bucket for a user', async () => {
      const session = 'some-session';
      const userId = 123;

      await redisService.clearSessionData(userId, session);

      expect(sessionHelperMock.clearSessionData).toHaveBeenCalledWith(session);
      expect(sessionHelperMock.removeSessionFromBucket).toHaveBeenCalledWith(
        userId,
        session,
      );
    });
  });

  describe('RedisService - clearAllSession', () => {
    it('should clear all sessions for the given user ID', async () => {
      const userId = 123;

      // Mock the clearAllSession method from sessionHelper to simulate it being called.
      sessionHelperMock.clearAllSession.mockResolvedValue(undefined);

      await redisService.clearAllSession(userId);

      expect(sessionHelperMock.clearAllSession).toHaveBeenCalledWith(userId);
    });
  });

  describe('RedisService - getUserData', () => {
    it('should retrieve user data by userId', async () => {
      const userId = 123;
      userHelperMock.getUserData.mockResolvedValue({
        id: userId,
        name: 'John',
      });

      const result = await redisService.getUserData(userId);

      expect(userHelperMock.getUserData).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ id: userId, name: 'John' });
    });
  });

  describe('RedisService - setUserData', () => {
    it('should set user data by userId', async () => {
      const userId = 123;
      const data = { id: userId, name: 'John' };

      await redisService.setUserData(userId, data);

      expect(userHelperMock.setUserData).toHaveBeenCalledWith(userId, data);
    });
  });

  describe('RedisService - recordActive', () => {
    it('should record an active user by userId', async () => {
      const userId = 123;

      await redisService.recordActive(userId);

      expect(statisticsHelperMock.recordActive).toHaveBeenCalledWith(userId);
    });
  });

  describe('RedisService - getActiveCount', () => {
    it('should retrieve the active count for a given date', async () => {
      const date = '2023-09-30';
      statisticsHelperMock.getActiveCount.mockResolvedValue(100);

      const result = await redisService.getActiveCount(date);

      expect(statisticsHelperMock.getActiveCount).toHaveBeenCalledWith(date);
      expect(result).toBe(100);
    });
  });

  describe('RedisService - delUserData', () => {
    it('should delete user data by userId', async () => {
      const userId = 123;

      await redisService.delUserData(userId);

      expect(userHelperMock.delUserData).toHaveBeenCalledWith(userId);
    });
  });

  describe('RedisService - setMergeData', () => {
    it('should set merge data with expiration', async () => {
      const key = 'some-key';
      const value = { data: 'some-data' };
      const expiration = 3600;

      await redisService.setMergeData(key, value, expiration);

      expect(redisClientMock.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(value),
        'EX',
        expiration,
      );
    });
  });

  describe('RedisService - getMergeData', () => {
    it('should retrieve merge data by key', async () => {
      const key = 'some-key';
      redisClientMock.get.mockResolvedValue(
        JSON.stringify({ data: 'some-data' }),
      );

      const result = await redisService.getMergeData(key);

      expect(redisClientMock.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(JSON.stringify({ data: 'some-data' }));
    });
  });

  describe('RedisService - delMergeData', () => {
    it('should delete merge data by key', async () => {
      const key = 'some-key';

      await redisService.delMergeData(key);

      expect(redisClientMock.del).toHaveBeenCalledWith(key);
    });
  });

  describe('RedisService - getLastWeekActiveCounts', () => {
    it('should retrieve active counts for the last week', async () => {
      statisticsHelperMock.getActiveCount.mockResolvedValue(100);

      const result = await redisService.getLastWeekActiveCounts();

      expect(result).toHaveLength(7);
      result.forEach((count) => expect(count).toBe(100));
    });
  });
  describe('RedisService - setVerificationMapping', () => {
    it('should set verification mapping using token, userId and email', async () => {
      const token = 'sample-token';
      const userId = 123;
      const email = 'test@example.com';

      await redisService.setVerificationMapping(token, userId, email);

      expect(verifyHelperMock.setVerificationMapping).toHaveBeenCalledWith(
        token,
        userId,
        email,
      );
    });
  });

  describe('RedisService - getVerificationInfoByToken', () => {
    it('should retrieve verification info using token', async () => {
      const token = 'sample-token';
      const expectedData = {
        userId: 123,
        email: 'test@example.com',
      };

      verifyHelperMock.getVerificationInfoByToken.mockResolvedValue(
        expectedData,
      );

      const result = await redisService.getVerificationInfoByToken(token);

      expect(verifyHelperMock.getVerificationInfoByToken).toHaveBeenCalledWith(
        token,
      );
      expect(result).toEqual(expectedData);
    });
  });

  describe('RedisService - delVerifyMapping', () => {
    it('should delete verification mapping using token and userId', async () => {
      const token = 'sample-token';
      const userId = 123;

      await redisService.delVerifyMapping(token, userId);

      expect(verifyHelperMock.delVerifyMapping).toHaveBeenCalledWith(
        token,
        userId,
      );
    });
  });

  describe('RedisService - getUserVerifyInfo', () => {
    it('should retrieve user verification info using userId', async () => {
      const userId = 123;
      const expectedData = {
        token: 'sample-token',
        email: 'test@example.com',
      };

      verifyHelperMock.getUserVerifyInfo.mockResolvedValue(expectedData);

      const result = await redisService.getUserVerifyInfo(userId);

      expect(verifyHelperMock.getUserVerifyInfo).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedData);
    });
  });

  describe('RedisService - canSendVerification', () => {
    it('should check if verification can be sent for a user', async () => {
      const userId = 123;

      verifyHelperMock.canSendVerification.mockResolvedValue(true);

      const canSend = await redisService.canSendVerification(userId);

      expect(verifyHelperMock.canSendVerification).toHaveBeenCalledWith(userId);
      expect(canSend).toBe(true);
    });
  });

  describe('RedisService - incSendingMail', () => {
    it('should increment sending mail count for a given token', async () => {
      const token = 'sample-token';

      await redisService.incSendingMail(token);

      expect(verifyHelperMock.incSendingMail).toHaveBeenCalledWith(token);
    });
  });
  describe('RedisService - recordActive', () => {
    it('should record an active user by their userId', async () => {
      const userId = 123;

      await redisService.recordActive(userId);

      expect(statisticsHelperMock.recordActive).toHaveBeenCalledWith(userId);
    });
  });

  describe('RedisService - getActiveCount', () => {
    it('should retrieve the active count for a given date', async () => {
      const date = '2023-10-01';
      const expectedCount = 5;

      statisticsHelperMock.getActiveCount.mockResolvedValue(expectedCount);

      const count = await redisService.getActiveCount(date);

      expect(statisticsHelperMock.getActiveCount).toHaveBeenCalledWith(date);
      expect(count).toBe(expectedCount);
    });
  });
});
