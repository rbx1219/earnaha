import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../../src/user/user.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../src/user/user.entity';
import * as UE from '../../src/exceptions/exceptions/user-exception';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../../src/redis/redis.service';

describe('UserService', () => {
  let userService: UserService;
  let userRepositoryMock: jest.Mocked<Repository<User>>;
  let redisServiceMock: jest.Mocked<RedisService>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedPassword',
    name: 'John Doe',
    authMethods: ['email'],
    createdAt: new Date(),
    updatedAt: new Date(),
    loginCount: 1,
    isVerified: true,
    lastSession: null,
  };

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockUser]), // replace [mockUser] with the expected result
    // ... any other methods used in the chain
  };

  beforeEach(async () => {
    userRepositoryMock = {
      findOne: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      count: jest.fn(),
    } as any;

    redisServiceMock = {
      getSessionData: jest.fn(),
      getUserData: jest.fn(),
      setUserData: jest.fn(),
      recordActive: jest.fn(),
      storeSession: jest.fn(),
      clearAllSession: jest.fn(),
      clearSessionData: jest.fn(),
      // add other methods if needed
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepositoryMock },
        { provide: RedisService, useValue: redisServiceMock },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
  });

  describe('UserService - isValidSession', () => {
    it('should return true if session exists', async () => {
      redisServiceMock.getSessionData.mockResolvedValue(1); // assuming 1 is a valid userId
      const result = await userService.isValidSession('VALID_SESSION');
      expect(result).toBeTruthy();
    });

    it('should return false if session does not exist', async () => {
      redisServiceMock.getSessionData.mockResolvedValue('NOTFOUND');
      const result = await userService.isValidSession('INVALID_SESSION');
      expect(result).toBeFalsy();
    });
  });

  describe('UserService - updatePassword', () => {
    const oldPassword = 'OldPassword123!';
    const newPassword = 'NewPassword123!';

    it('should throw NotFoundException if user is not found', async () => {
      userRepositoryMock.findOne.mockResolvedValue(undefined);

      await expect(
        userService.updatePassword(1, oldPassword, newPassword),
      ).rejects.toThrow(UE.UserNotFoundException);
    });

    it('should throw PasswordInvalidException for invalid new password', async () => {
      userRepositoryMock.findOne.mockResolvedValue(mockUser);
      jest.spyOn(userService, 'validatePassword').mockReturnValue(false);

      await expect(
        userService.updatePassword(1, oldPassword, 'short'),
      ).rejects.toThrow(UE.PasswordInvalidException);
    });

    it('should throw UserAuthenticationException if old password is incorrect', async () => {
      userRepositoryMock.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await expect(
        userService.updatePassword(1, 'WrongOldPassword', newPassword),
      ).rejects.toThrow(UE.UserAuthenticationException);
    });

    it('should update the password and return a session ID if all data is correct', async () => {
      userRepositoryMock.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      const loginUserSpy = jest
        .spyOn(userService, 'loginUser')
        .mockResolvedValue('NEW_SESSION_ID');

      const result = await userService.updatePassword(
        1,
        oldPassword,
        newPassword,
      );
      expect(loginUserSpy).toBeCalledWith(mockUser);
      expect(result).toBe('NEW_SESSION_ID');
    });
  });

  describe('UserService - getUser', () => {
    it('should return a user if they exist', async () => {
      userRepositoryMock.findOne.mockResolvedValue(mockUser);

      const result = await userService.getUser(1);
      expect(result).toEqual(mockUser);
    });

    it('should throw UserNotFoundException if user does not exist', async () => {
      userRepositoryMock.findOne.mockResolvedValue(undefined);

      await expect(userService.getUser(999)).rejects.toThrow(
        UE.UserNotFoundException,
      );
    });
  });

  describe('UserService - getUserBySession', () => {
    it('should return a user for a valid session ID', async () => {
      redisServiceMock.getSessionData.mockResolvedValue(mockUser.id);
      jest.spyOn(userService, 'getUserWithCache').mockResolvedValue(mockUser);

      const result = await userService.getUserBySession('VALID_SESSION_ID');
      expect(result).toEqual(mockUser);
    });

    it('should throw UserNotFoundException for an invalid session ID', async () => {
      redisServiceMock.getSessionData.mockResolvedValue('NOTFOUND');

      await expect(
        userService.getUserBySession('INVALID_SESSION_ID'),
      ).rejects.toThrow(UE.UserNotFoundException);
    });
  });

  describe('UserService - getUserWithCache', () => {
    it('should return a user from cache', async () => {
      redisServiceMock.getUserData.mockResolvedValue(JSON.stringify(mockUser));

      const result = await userService.getUserWithCache(mockUser.id);

      if (result.createdAt) {
        result.createdAt = new Date(result.createdAt);
      }
      if (result.updatedAt) {
        result.updatedAt = new Date(result.updatedAt);
      }

      expect(result).toEqual(mockUser);
    });

    it('should return a user from DB and cache it if not in cache', async () => {
      redisServiceMock.getUserData.mockResolvedValue('NOTFOUND');
      userRepositoryMock.findOne.mockResolvedValue(mockUser);

      const result = await userService.getUserWithCache(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should throw UserNotFoundException if user is not in cache or DB', async () => {
      redisServiceMock.getUserData.mockResolvedValue('NOTFOUND');
      userRepositoryMock.findOne.mockResolvedValue(undefined);

      await expect(userService.getUserWithCache(999)).rejects.toThrow(
        UE.UserNotFoundException,
      );
    });
  });

  describe('UserService - getAllUsers', () => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockUser]),
    } as any;

    it('should return default number of users if no parameters are provided', async () => {
      userRepositoryMock.findAndCount.mockResolvedValue([[mockUser], 1]);

      const users = await userService.getAllUsers();

      expect(users).toHaveLength(1);
      expect(users[0]).toEqual(mockUser);
    });

    it('should return users based on provided offset and limit', async () => {
      userRepositoryMock.findAndCount.mockResolvedValue([[mockUser], 1]);

      const offset = 5;
      const limit = 5;

      const users = await userService.getAllUsers(offset, limit);

      expect(users).toHaveLength(1);
      expect(users[0]).toEqual(mockUser);
    });

    it('should return selected fields if provided', async () => {
      const partialUser = { id: mockUser.id, email: mockUser.email };

      mockQueryBuilder.getMany.mockResolvedValue([partialUser]);
      userRepositoryMock.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const users = await userService.getAllUsers(0, 10, ['id', 'email']);

      expect(users).toHaveLength(1);
      expect(users[0]).toEqual(partialUser);
    });
  });

  describe('UserService - getTotalUsersCount', () => {
    it('should return the total number of users', async () => {
      userRepositoryMock.count.mockResolvedValue(10);

      const count = await userService.getTotalUsersCount();

      expect(count).toBe(10);
    });
  });

  describe('UserService - verifyPassword', () => {
    it('should return true if the password is valid', async () => {
      const plain = 'password123';
      const hashed = 'hashedpassword123';

      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const result = await userService['verifyPassword'](plain, hashed);

      expect(result).toBeTruthy();
    });
  });

  describe('UserService - hashPassword', () => {
    it('should return a hashed password', async () => {
      const password = 'password123';
      const hashedPassword = 'hashedpassword123';

      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword);

      const result = await userService['hashPassword'](password);

      expect(result).toBe(hashedPassword);
    });
  });

  describe('UserService - loginUser', () => {
    it('should login a user, increase their login count, and update their last session', async () => {
      const prevLoginCount = mockUser.loginCount;
      userRepositoryMock.save.mockResolvedValue(mockUser);
      redisServiceMock.storeSession.mockResolvedValue(undefined);

      const sessionId = await userService.loginUser(mockUser);

      expect(sessionId).toBeDefined();
      expect(mockUser.loginCount).toBe(prevLoginCount + 1);
      expect(mockUser.lastSession).toBeDefined();
    });
  });

  describe('UserService - loginUser', () => {
    it('should login a user, increase their login count, and update their last session', async () => {
      const prevLoginCount = mockUser.loginCount;
      userRepositoryMock.save.mockResolvedValue(mockUser);
      redisServiceMock.storeSession.mockResolvedValue(undefined);

      const sessionId = await userService.loginUser(mockUser);

      expect(sessionId).toBeDefined();
      expect(mockUser.loginCount).toBe(prevLoginCount + 1);
      expect(mockUser.lastSession).toBeDefined();
    });
  });

  describe('UserService - logoutUserBySession', () => {
    it('should log out the user by clearing their session', async () => {
      redisServiceMock.getSessionData.mockResolvedValue(mockUser.id);
      userRepositoryMock.findOne.mockResolvedValue(mockUser);
      redisServiceMock.clearSessionData.mockResolvedValue(undefined);
      await userService.logoutUserBySession('some_session_id');
      expect(redisServiceMock.clearSessionData).toHaveBeenCalledWith(
        mockUser.id,
        'some_session_id',
      );
    });
  });

  describe('UserService - clearUserSessions', () => {
    it('should clear all sessions of the user', async () => {
      redisServiceMock.clearAllSession.mockResolvedValue(undefined);
      await userService.clearUserSessions(mockUser.id);
      expect(redisServiceMock.clearAllSession).toHaveBeenCalledWith(
        mockUser.id,
      );
    });
  });

  // ... subsequent tests for other methods
});
