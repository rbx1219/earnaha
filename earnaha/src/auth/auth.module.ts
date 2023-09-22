// auth/auth.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from 'src/user/user.module';
import { MailModule } from '../mail/mail.module'; // Import the MailModule
import { RedisModule } from '../redis/redis.module'; // 引入RedisModule
import { User } from '../user/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DatabaseNotificationService } from './database-notification.service';
import { GoogleStrategy } from './google.strategy';
import { MergeService } from './merge.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    RedisModule,
    MailModule,
    UserModule,
  ],
  providers: [
    AuthService,
    DatabaseNotificationService,
    GoogleStrategy,
    MergeService,
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
