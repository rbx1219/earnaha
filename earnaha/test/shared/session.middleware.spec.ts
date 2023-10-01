import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response, NextFunction } from 'express';
import { SessionMiddleware } from '../../src/shared/session.middleware';
import { UserService } from '../../src/user/user.service';
import { NoValidSessionException } from '../../src/exceptions/exceptions/user-exception';
import { User } from '../../src/user/user.entity';
import { RedisService } from '../../src/redis/redis.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as UE from '../../src/exceptions/exceptions/user-exception';
import { Repository } from 'typeorm';

describe('SessionMiddleware', () => {
  let middleware: SessionMiddleware;
  let userService: UserService;
  let userRepositoryMock: jest.Mocked<Repository<User>>;
  let redisServiceMock: jest.Mocked<RedisService>;

  beforeEach(async () => {
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
        SessionMiddleware,
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepositoryMock },
        { provide: RedisService, useValue: redisServiceMock },
      ],
    }).compile();

    middleware = module.get<SessionMiddleware>(SessionMiddleware);
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should set user on request when valid session', async () => {
    // Mock the necessary dependencies and methods
    const mockRequest = {
      headers: {
        cookie: 'SESSIONID=someSessionId; otherCookie=otherValue',
      },
    } as Request;
    const mockResponse = {} as Response;
    const mockNext = jest.fn() as NextFunction;
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
    // Mock the UserService method to return a user when called
    jest.spyOn(userService, 'getUserBySession').mockResolvedValue(mockUser);

    // Call the middleware with the mock request, response, and next function
    await middleware.use(mockRequest, mockResponse, mockNext);

    // Expect that the user property is set on the request
    expect(mockRequest['user']).toEqual(mockUser);

    // Expect that the next function is called
    expect(mockNext).toHaveBeenCalled();
  });

  it('should throw NoValidSessionException when invalid session', async () => {
    // Mock the necessary dependencies and methods
    const mockRequest = {
      headers: {
        cookie: 'SESSIONID=someSessionId; otherCookie=otherValue',
      },
    } as Request;
    const mockResponse = {} as Response;
    const mockNext = jest.fn() as NextFunction;

    // Mock the UserService method to throw an error when called
    jest
      .spyOn(userService, 'getUserBySession')
      .mockRejectedValue(new UE.NoValidSessionException());

    // Call the middleware with the mock request, response, and next function
    try {
      await middleware.use(mockRequest, mockResponse, mockNext);
    } catch (error) {
      // Expect that the error is an instance of NoValidSessionException
      expect(error).toBeInstanceOf(UE.NoValidSessionException);
    }

    // Expect that the next function is not called
    expect(mockNext).not.toHaveBeenCalled();
  });
});
