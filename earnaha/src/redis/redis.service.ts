// redis/redis.service.ts

import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { RedisListHelper } from './redis.list.helper';
import { SessionHelper } from './session.helper';
import { StatisticsHelper } from './statistics.helper';
import { UserHelper } from './user.helper';
import { VerificationHelper } from './verification.helper';

@Injectable()
export class RedisService {
  constructor(
    @Inject('REDIS') private readonly redisClient: Redis,
    private readonly redisListHelper: RedisListHelper,
    private readonly statistics: StatisticsHelper,
    private readonly sessionHelper: SessionHelper,
    private readonly userHelper: UserHelper,
    private readonly verifyHelper: VerificationHelper,
  ) {}

  // Session service

  async storeSession(session: string, userId: number): Promise<void[]> {
    return Promise.all([
      this.sessionHelper.setSessionData(session, userId),
      this.sessionHelper.setSessionBucket(userId, session),
    ]);
  }

  async getSessionData(uuid: string): Promise<number | 'NOTFOUND'> {
    return await this.sessionHelper.getSessionData(uuid);
  }

  async clearSessionData(userId: number, session: string): Promise<void[]> {
    return Promise.all([
      this.sessionHelper.clearSessionData(session),
      this.sessionHelper.removeSessionFromBucket(userId, session),
    ]);
  }

  async clearAllSession(userId: number): Promise<void> {
    return this.sessionHelper.clearAllSession(userId);
  }

  // User data service

  async getUserData(userId: number): Promise<any | 'NOTFOUND'> {
    return await this.userHelper.getUserData(userId);
  }

  async setUserData(userId: number, userData: any): Promise<void> {
    await this.userHelper.setUserData(userId, userData);
  }

  async delUserData(userId: number): Promise<void> {
    await this.userHelper.delUserData(userId);
  }

  // Merge data

  async setMergeData(
    key: string,
    value: any,
    expiration: number,
  ): Promise<void> {
    await this.redisClient.set(key, JSON.stringify(value), 'EX', expiration);
  }

  async getMergeData(key: string): Promise<any> {
    return this.redisClient.get(key);
  }

  async delMergeData(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  // Verification

  async setVerificationMapping(
    token: string,
    userId: number,
    email: string,
  ): Promise<void> {
    await this.verifyHelper.setVerificationMapping(token, userId, email);
  }

  async getVerificationInfoByToken(
    token: string,
  ): Promise<{ userId: number | null; email: string | null }> {
    return await this.verifyHelper.getVerificationInfoByToken(token);
  }

  async delVerifyMapping(token, userId): Promise<void> {
    await this.verifyHelper.delVerifyMapping(token, userId);
  }

  async getUserVerifyInfo(
    userId: number,
  ): Promise<{ token: string | null; email: string | null }> {
    return this.verifyHelper.getUserVerifyInfo(userId);
  }

  async canSendVerification(userId: number): Promise<boolean> {
    return await this.verifyHelper.canSendVerification(userId);
  }

  async incSendingMail(token: string): Promise<void> {
    await this.verifyHelper.incSendingMail(token);
  }

  // Statistics

  async recordActive(userId: number): Promise<void> {
    return this.statistics.recordActive(userId);
  }

  async getActiveCount(date: string): Promise<number> {
    return this.statistics.getActiveCount(date);
  }

  async getLastWeekActiveCounts(): Promise<number[]> {
    const lastWeekDates: string[] = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i - 1);
      lastWeekDates.push(date.toLocaleDateString());
    }

    const activeCounts = await Promise.all(
      lastWeekDates.map(
        async (date) => await this.statistics.getActiveCount(date),
      ),
    );

    return activeCounts;
  }
}
