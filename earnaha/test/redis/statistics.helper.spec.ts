import { StatisticsHelper } from '../../src/redis/statistics.helper';
import { Redis } from 'ioredis';

jest.mock('ioredis');

describe('StatisticsHelper', () => {
  let statisticsHelper: StatisticsHelper;
  let mockRedisClient: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedisClient = {
      sadd: jest.fn(),
      scard: jest.fn(),
    } as any;

    statisticsHelper = new StatisticsHelper(mockRedisClient);
  });

  describe('recordActive', () => {
    it('should record user activity correctly', async () => {
      const userId = 1;
      const date = new Date().toLocaleDateString();
      await statisticsHelper.recordActive(userId);
      expect(mockRedisClient.sadd).toHaveBeenCalledWith(
        `active:user:${date}`,
        userId,
      );
    });
  });

  describe('getActiveCount', () => {
    it('should return the count of active users', async () => {
      const date = '2023-10-01';
      mockRedisClient.scard.mockResolvedValue(5);
      const result = await statisticsHelper.getActiveCount(date);
      expect(result).toEqual(5);
      expect(mockRedisClient.scard).toHaveBeenCalledWith(`active:user:${date}`);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
