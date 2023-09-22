// dashboard/statistics.service.ts

import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class StatisticsService {
  constructor(private readonly redisService: RedisService) {}

  async getTodayActiveUsersCount(): Promise<number> {
    const today = new Date().toLocaleDateString();

    return this.redisService.getActiveCount(today);
  }

  async getAvgLast7DaysActiveUsersCountAvg(): Promise<number> {
    const counts = await this.redisService.getLastWeekActiveCounts();

    return (
      counts &&
      Math.round(
        (counts.reduce((a, b) => a + b, 0) / counts.length || 0) * 100,
      ) / 100
    );
  }
}
