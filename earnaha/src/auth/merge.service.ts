import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserService } from 'src/user/user.service';
import { Repository } from 'typeorm';
import * as UE from '../exceptions/exceptions/user-exception';
import { RedisService } from '../redis/redis.service';
import { User } from '../user/user.entity';

@Injectable()
export class MergeService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly redisService: RedisService,
    private userService: UserService,
  ) {}

  async mergeAccounts(
    mergeKey: string,
    incomingAuthMethod: 'email' | 'google_oauth',
  ): Promise<User> {
    const key = `merge:${incomingAuthMethod}:${mergeKey}`;
    const mergeDataString = await this.redisService.getMergeData(key);

    console.log(key, mergeDataString);

    if (!mergeDataString) throw new UE.InvalidMergeKeyException();

    const mergeData = JSON.parse(mergeDataString);
    const user = await this.userService.getUserWithCache(mergeData.userId);

    if (!user) throw new UE.UserNotFoundException();
    if (!user.authMethods.includes(incomingAuthMethod)) {
      user.authMethods.push(incomingAuthMethod);
    }

    if (incomingAuthMethod === 'email') {
      user.password = mergeData.password;
      user.isVerified = false;
    } else if (incomingAuthMethod === 'google_oauth') {
      user.isVerified = true;
    }

    await Promise.all([
      this.usersRepository.save(user),
      this.redisService.delMergeData(key),
    ]);

    return user;
  }
}
