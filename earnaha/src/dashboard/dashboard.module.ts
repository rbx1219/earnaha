// dashboard/dashboard.module.ts
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { DashboardController } from './dashboard.controller';
import { RedisModule } from '../redis/redis.module';
import { SessionMiddleware } from '../shared/session.middleware';
import { StatisticsService } from './statistics.service';

@Module({
  imports: [UserModule, RedisModule, UserModule],
  providers: [StatisticsService],
  controllers: [DashboardController],
})
export class DashboardModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes('dashboard/*');
  }
}
