import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as UE from '../exceptions/exceptions/user-exception';
import { RedisService } from '../redis/redis.service';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  async isValidSession(sessionId: string): Promise<boolean> {
    const sessionData = await this.redisService.getSessionData(sessionId);
    return sessionData !== 'NOTFOUND';
  }

  async updatePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ): Promise<string> {
    const user = await this.getUserWithCache(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!this.validatePassword(newPassword)) {
      throw new UE.PasswordInvalidException();
    }

    const isPasswordVerified = await this.verifyPassword(
      oldPassword,
      user.password,
    );
    if (!isPasswordVerified) {
      throw new UE.UserAuthenticationException();
    }

    const hashedPassword = await this.hashPassword(newPassword);
    user.password = hashedPassword;

    await this.userRepository.save(user);
    return this.loginUser(user);
  }

  async getUser(userId: number): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UE.UserNotFoundException();
    }

    return user;
  }

  async getUserBySession(sessionId: string): Promise<User | null> {
    const userId = await this.redisService.getSessionData(sessionId);

    if (userId === 'NOTFOUND') {
      throw new UE.UserNotFoundException();
    }

    const user = await this.getUserWithCache(userId);

    if (user) {
      await this.redisService.recordActive(userId);
    }

    return user;
  }

  async getUserWithCache(userId: number): Promise<User | null> {
    const userInCache = await this.redisService.getUserData(userId);

    try {
      return JSON.parse(userInCache);
    } catch (err) {
      const userInDb = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!userInDb) {
        throw new UE.UserNotFoundException();
      }

      this.redisService.setUserData(userId, userInDb);
      return userInDb;
    }
  }

  async getAllUsers(
    offset = 0,
    limit = 10,
    selectedFields: string[] = [],
  ): Promise<User[]> {
    const queryBuilder: SelectQueryBuilder<User> = this.userRepository
      .createQueryBuilder('user')
      .select(selectedFields.length > 0 ? selectedFields : ['user']);

    return queryBuilder
      .skip(offset)
      .take(limit)
      .orderBy('user.id', 'DESC')
      .getMany();
  }

  async getTotalUsersCount(): Promise<number> {
    return this.userRepository.count();
  }

  private async verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, hashedPassword);
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  validatePassword(password: string): boolean {
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecialCharacter = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(
      password,
    );
    const hasMinimumLength = password.length >= 8;

    return (
      hasLowerCase &&
      hasUpperCase &&
      hasDigit &&
      hasSpecialCharacter &&
      hasMinimumLength
    );
  }

  async loginUser(user: User): Promise<string> {
    const sessionId = uuidv4();
    user.loginCount += 1;
    user.lastSession = new Date();

    const saveUser = this.userRepository.save(user);
    const setSession = this.redisService.storeSession(sessionId, user.id);

    await Promise.all([saveUser, setSession]);
    return sessionId;
  }

  async logoutUserBySession(session: string): Promise<void> {
    const user: User = await this.getUserBySession(session);
    await this.redisService.clearSessionData(user.id, session);
  }

  async clearUserSessions(userId: number): Promise<void> {
    this.redisService.clearAllSession(userId);
  }
}
