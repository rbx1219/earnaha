// redis/session.helper.ts

import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class SessionHelper {
  constructor(@Inject('REDIS') private readonly redisClient: Redis) {}

  private genKey(uuid: string): string {
    return `sess:${uuid}`;
  }

  private genBucketKey(userId: number): string {
    return `sess:bucket:${userId}`;
  }

  async setSessionData(uuid: string, userId: number): Promise<void> {
    const sessionKey = this.genKey(uuid);
    this.redisClient.set(sessionKey, userId.toString());
  }

  async getSessionData(uuid: string): Promise<number | 'NOTFOUND'> {
    const sessionKey = this.genKey(uuid);
    const userId = await this.redisClient.get(sessionKey);

    try {
      const uid = parseInt(userId, 10);

      if (!uid) {
        throw 'uid invalid';
      }
      return uid;
    } catch (error) {
      return 'NOTFOUND';
    }
  }

  async clearSessionData(session: string): Promise<void> {
    await this.redisClient.del(this.genKey(session));
  }

  async setSessionBucket(userId: number, session: string): Promise<void> {
    const bucketKey = this.genBucketKey(userId);

    this.redisClient.sadd(bucketKey, session);
  }

  async removeSessionFromBucket(
    userId: number,
    session: string,
  ): Promise<void> {
    const bucketKey = this.genBucketKey(userId);

    this.redisClient.srem(bucketKey, session);
  }

  async clearSessionBucket(userId: number): Promise<void> {
    this.redisClient.del(this.genBucketKey(userId));
  }

  async clearAllSession(userId: number): Promise<void> {
    const bucketKey = this.genBucketKey(userId);

    const sessions = await this.redisClient.smembers(bucketKey);
    console.log(sessions);

    await Promise.all(
      sessions.map((s) => {
        this.clearSessionData(s);
      }),
    );
    await this.clearSessionBucket(userId);
  }
}
