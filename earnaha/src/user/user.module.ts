import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { RedisModule } from '../redis/redis.module';
import { User } from './user.entity'; // 引入 User 實體
import { SessionMiddleware } from '../shared/session.middleware'; // 確保引入 SessionMiddleware

@Module({
  imports: [TypeOrmModule.forFeature([User]), RedisModule],
  controllers: [UserController],
  providers: [UserService, SessionMiddleware],
  exports: [UserService],
})
export class UserModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes('user/*'); // 在所有路由上应用中间件
  }
}
