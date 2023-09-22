// redis/statistics.helper.ts

import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class StatisticsHelper {
  constructor(@Inject('REDIS') private readonly redisClient: Redis) {}

  private genKey(date: string): string {
    return `active:user:${date}`;
  }

  async recordActive(userId: number): Promise<void> {
    const key = this.genKey(new Date().toLocaleDateString());
    await this.redisClient.sadd(key, userId);
  }

  async getActiveCount(date: string): Promise<number> {
    const key = this.genKey(date);

    return await this.redisClient.scard(key);
  }
}
