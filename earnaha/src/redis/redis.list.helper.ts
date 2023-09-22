// redis/redis.list.helper.ts

import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisListHelper {
  constructor(@Inject('REDIS') private readonly redisClient: Redis) {}

  private generateTokenTsListKey(token: string): string {
    return `token:mail:ts:${token}`;
  }

  async pushToUserList(token: string): Promise<boolean> {
    try {
      const key = this.generateTokenTsListKey(token);
      const now = Math.floor(Date.now());
      const maxLength = 10;
      const length = await this.trimList(token, now);

      if (length < maxLength) {
        await this.redisClient.rpush(key, now.toString());
        return true;
      } else {
        console.error("it's full, now:", now);
        return false;
      }
    } catch (error) {
      console.error('Error pushing to token list:', error);
      return false;
    }
  }

  async activeLength(token: string): Promise<number> {
    const now = Math.floor(Date.now());

    return await this.trimList(token, now);
  }

  private async trimList(token: string, ts: number): Promise<number> {
    const key = this.generateTokenTsListKey(token);
    let expired = true;

    while (expired) {
      const firstTimestamp = await this.redisClient.lindex(key, 0);
      if (firstTimestamp && parseInt(firstTimestamp, 10) < ts - 10 * 60) {
        await this.redisClient.lpop(key);
      } else {
        expired = false;
      }
    }

    return await this.redisClient.llen(key);
  }
}
