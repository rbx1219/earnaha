// redis/verification.helper.ts

import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { RedisListHelper } from './redis.list.helper';

@Injectable()
export class VerificationHelper {
  constructor(
    @Inject('REDIS') private readonly redisClient: Redis,
    private readonly redisListHelper: RedisListHelper,
  ) {}

  private genTokenKey(token: string): string {
    return `verification:token:${token}`;
  }

  private genUserKey(userId: number): string {
    return `verification:user:${userId}`;
  }

  async setVerificationMapping(
    token: string,
    userId: number,
    email: string,
  ): Promise<void> {
    this.setTokenVerifyInfo(token, userId, email);
    this.setUserVerifyInfo(userId, token, email);
  }

  async setTokenVerifyInfo(
    token: string,
    userId: number,
    email: string,
  ): Promise<void> {
    const key = this.genTokenKey(token);

    await this.redisClient.hmset(key, {
      userId: userId.toString(),
      email,
    });

    await this.redisClient.expire(key, 24 * 60 * 60);
  }

  async getVerificationInfoByToken(
    token: string,
  ): Promise<{ userId: number | null; email: string | null }> {
    const key = this.genTokenKey(token);
    const data = await this.redisClient.hgetall(key);

    if (data && data.userId && data.email) {
      return {
        userId: parseInt(data.userId, 10),
        email: data.email,
      };
    } else {
      return {
        userId: null,
        email: null,
      };
    }
  }

  async delVerifyMapping(token, userId): Promise<void> {
    Promise.all([
      this.redisClient.del(this.genUserKey(userId)),
      this.redisClient.del(this.genTokenKey(token)),
    ]);
  }

  async getUserVerifyInfo(
    userId: number,
  ): Promise<{ token: string | null; email: string | null }> {
    const key = this.genUserKey(userId);
    const data = await this.redisClient.hgetall(key);

    if (data && data.token && data.email) {
      return {
        token: data.token,
        email: data.email,
      };
    } else {
      return {
        token: null,
        email: null,
      };
    }
  }

  async setUserVerifyInfo(
    userId: number,
    token: string,
    email: string,
  ): Promise<void> {
    const key = this.genUserKey(userId);

    await this.redisClient.hmset(key, {
      token,
      email,
    });
  }

  async canSendVerification(userId: number): Promise<boolean> {
    const t = await this.getUserVerifyInfo(userId);
    const l = await this.redisListHelper.activeLength(t.token);

    return l < 10;
  }

  async incSendingMail(token: string): Promise<void> {
    await this.redisListHelper.pushToUserList(token);
  }
}
