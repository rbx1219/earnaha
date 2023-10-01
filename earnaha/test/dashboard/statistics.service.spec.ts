import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../../src/redis/redis.service';
import { StatisticsService } from '../../src/dashboard/statistics.service';

describe('StatisticsService', () => {
  let statisticsService: StatisticsService;
  let redisServiceMock: jest.Mocked<RedisService>;

  beforeEach(async () => {
    redisServiceMock = {
      getActiveCount: jest.fn(),
      getLastWeekActiveCounts: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        { provide: RedisService, useValue: redisServiceMock },
      ],
    }).compile();

    statisticsService = module.get<StatisticsService>(StatisticsService);
  });

  describe('StatisticsService - getTodayActiveUsersCount', () => {
    it('should return today active users count', async () => {
      const mockCount = 5;
      redisServiceMock.getActiveCount.mockResolvedValue(mockCount);
      const result = await statisticsService.getTodayActiveUsersCount();
      expect(result).toBe(mockCount);
    });
  });
  describe('StatisticsService - getAvgLast7DaysActiveUsersCountAvg', () => {
    it('should return the average of last 7 days active users count', async () => {
      const mockCounts = [5, 6, 7, 8, 9, 10, 11];
      const expectedAverage = (
        mockCounts.reduce((a, b) => a + b, 0) / mockCounts.length
      ).toFixed(2);
      redisServiceMock.getLastWeekActiveCounts.mockResolvedValue(mockCounts);
      const result =
        await statisticsService.getAvgLast7DaysActiveUsersCountAvg();
      expect(result).toBe(Number(expectedAverage));
    });
  });
});
