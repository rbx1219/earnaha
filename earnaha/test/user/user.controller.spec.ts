import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../../src/user/user.controller';
import { UserService } from '../../src/user/user.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../src/user/user.entity';
import { UpdatePasswordDto } from '../../src/user/dto/update-password.dto';
import { ErrorCode } from '../../src/exceptions/error-code.enum';
import * as UE from '../../src/exceptions/exceptions/user-exception';
import { RedisService } from '../../src/redis/redis.service';

describe('UserController', () => {
  let userController: UserController;
  let userService: UserService;
  let mockRedisService: Partial<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService, // Use the mock instead of the real service.
        },
      ],
    }).compile();

    userController = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  describe('updatePassword', () => {
    it('should update the user password and return success', async () => {
      // Arrange
      const updatePasswordDto: UpdatePasswordDto = {
        oldPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      };
      const userId = 1;
      const newSession = 'newSession123';

      jest.spyOn(userService, 'clearUserSessions').mockResolvedValue(undefined);
      jest.spyOn(userService, 'updatePassword').mockResolvedValue(newSession);

      const req = {
        user: { id: userId, authMethods: ['email'] },
      };
      const res = {
        cookie: jest.fn(),
        send: jest.fn(),
      };

      // Act
      await userController.updatePassword(updatePasswordDto, req, res);

      // Assert
      expect(userService.clearUserSessions).toHaveBeenCalledWith(userId);
      expect(userService.updatePassword).toHaveBeenCalledWith(
        userId,
        updatePasswordDto.oldPassword,
        updatePasswordDto.newPassword,
      );
      expect(res.cookie).toHaveBeenCalledWith('SESSIONID', newSession, {
        httpOnly: true,
        secure: true,
        path: '/',
      });
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Password updated successfully.',
        errCode: ErrorCode.SUCCESS,
      });
    });

    it('should throw PassTheSameException if oldPassword is the same as newPassword', async () => {
      // Arrange
      const updatePasswordDto: UpdatePasswordDto = {
        oldPassword: 'password123',
        newPassword: 'password123',
      };
      const req = {
        user: { id: 1 },
      };
      const res = {
        send: jest.fn(),
      };

      // Act & Assert
      await expect(
        userController.updatePassword(updatePasswordDto, req, res),
      ).rejects.toThrow(UE.PassTheSameException);
      expect(res.send).not.toHaveBeenCalled();
    });

    it('should throw InvalidChangePassReqException if authMethods do not include "email"', async () => {
      // Arrange
      const updatePasswordDto: UpdatePasswordDto = {
        oldPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      };
      const req = {
        user: { id: 1, authMethods: [] },
      };
      const res = {
        send: jest.fn(),
      };

      // Act & Assert
      await expect(
        userController.updatePassword(updatePasswordDto, req, res),
      ).rejects.toThrow(UE.InvalidChangePassReqException);
      expect(res.send).not.toHaveBeenCalled();
    });
  });

  describe('getUserBySession', () => {
    it('should return user details if user is present in the request', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        isVerified: true,
      };
      const req = {
        cookies: { SESSIONID: 'some-session-id' },
        user: mockUser,
      };

      const result = await userController.getUserBySession(req as any);

      expect(result).toEqual({
        success: true,
        errCode: ErrorCode.SUCCESS,
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          isVerified: mockUser.isVerified,
        },
      });
    });

    it('should call userService.getUserBySession if user is not present in the request', async () => {
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
      const req = {
        cookies: { SESSIONID: 'some-session-id' },
      };

      jest.spyOn(userService, 'getUserBySession').mockResolvedValue(mockUser);

      const result = await userController.getUserBySession(req as any);

      expect(userService.getUserBySession).toHaveBeenCalledWith(
        req.cookies.SESSIONID,
      );
      expect(result).toEqual({
        success: true,
        errCode: ErrorCode.SUCCESS,
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          isVerified: mockUser.isVerified,
        },
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
