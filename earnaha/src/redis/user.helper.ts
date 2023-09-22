// redis/user.helper.ts

import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class UserHelper {
  constructor(@Inject('REDIS') private readonly redisClient: Redis) {}

  private genkey(userId: number): string {
    return `userdata:${userId}`;
  }

  async getUserData(userId: number): Promise<any | 'NOTFOUND'> {
    const userKey = this.genkey(userId);
    const userData = await this.redisClient.get(userKey);

    if (userData) {
      return userData;
    }

    return 'NOTFOUND';
  }

  async setUserData(userId: number, userData: any): Promise<void> {
    const userKey = this.genkey(userId);
    await this.redisClient.set(userKey, JSON.stringify(userData));
  }

  async delUserData(userId: number): Promise<void> {
    const userKey = this.genkey(userId);
    await this.redisClient.del(userKey);
  }
}
