import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisListHelper } from './redis.list.helper';
import { RedisService } from './redis.service';
import { StatisticsHelper } from './statistics.helper';
import { SessionHelper } from './session.helper';
import { VerificationHelper } from './verification.helper';
import { UserHelper } from './user.helper';

@Module({
  providers: [
    {
      provide: 'REDIS',
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST,
          port: +process.env.REDIS_PORT,
        });
      },
    },
    RedisService,
    RedisListHelper,
    StatisticsHelper,
    UserHelper,
    SessionHelper,
    VerificationHelper,
  ],
  exports: [RedisService],
})
export class RedisModule {}
