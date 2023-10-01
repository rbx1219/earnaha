import { SessionHelper } from '../../src/redis/session.helper';
import { Redis } from 'ioredis';

jest.mock('ioredis');

describe('SessionHelper', () => {
  let sessionHelper: SessionHelper;
  let mockRedisClient: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedisClient = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      smembers: jest.fn(),
    } as any;

    sessionHelper = new SessionHelper(mockRedisClient);
  });

  describe('setSessionData', () => {
    it('should set session data correctly', async () => {
      const uuid = 'testUUID';
      const userId = 1;

      await sessionHelper.setSessionData(uuid, userId);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `sess:${uuid}`,
        userId.toString(),
      );
    });
  });

  describe('getSessionData', () => {
    it('should return correct userId', async () => {
      const uuid = 'testUUID';
      mockRedisClient.get.mockResolvedValue('1');
      const result = await sessionHelper.getSessionData(uuid);
      expect(result).toBe(1);
    });

    it('should return NOTFOUND if user is not present', async () => {
      const uuid = 'testUUID';
      mockRedisClient.get.mockResolvedValue(null);
      const result = await sessionHelper.getSessionData(uuid);
      expect(result).toBe('NOTFOUND');
    });
  });

  describe('clearSessionData', () => {
    it('should clear session data correctly', async () => {
      const uuid = 'testUUID';
      await sessionHelper.clearSessionData(uuid);
      expect(mockRedisClient.del).toHaveBeenCalledWith(`sess:${uuid}`);
    });
  });

  describe('setSessionBucket', () => {
    it('should set session bucket correctly', async () => {
      const userId = 1;
      const session = 'testSession';
      await sessionHelper.setSessionBucket(userId, session);
      expect(mockRedisClient.sadd).toHaveBeenCalledWith(
        `sess:bucket:${userId}`,
        session,
      );
    });
  });

  describe('removeSessionFromBucket', () => {
    it('should remove session from bucket correctly', async () => {
      const userId = 1;
      const session = 'testSession';
      await sessionHelper.removeSessionFromBucket(userId, session);
      expect(mockRedisClient.srem).toHaveBeenCalledWith(
        `sess:bucket:${userId}`,
        session,
      );
    });
  });

  describe('clearSessionBucket', () => {
    it('should clear session bucket correctly', async () => {
      const userId = 1;
      await sessionHelper.clearSessionBucket(userId);
      expect(mockRedisClient.del).toHaveBeenCalledWith(`sess:bucket:${userId}`);
    });
  });

  describe('clearAllSession', () => {
    it('should clear all sessions for a given userId', async () => {
      const userId = 1;
      const sessions = ['testSession1', 'testSession2'];
      mockRedisClient.smembers.mockResolvedValue(sessions);

      await sessionHelper.clearAllSession(userId);

      expect(mockRedisClient.smembers).toHaveBeenCalledWith(
        `sess:bucket:${userId}`,
      );
      sessions.forEach((session) => {
        expect(mockRedisClient.del).toHaveBeenCalledWith(`sess:${session}`);
      });
      expect(mockRedisClient.del).toHaveBeenCalledWith(`sess:bucket:${userId}`);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
