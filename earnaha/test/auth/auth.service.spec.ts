import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/auth/auth.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../src/user/user.entity';
import { RedisService } from '../../src/redis/redis.service';
import { MailService } from '../../src/mail/mail.service';
import { UserService } from '../../src/user/user.service';
import * as bcrypt from 'bcrypt';
import * as UE from '../../src/exceptions/exceptions/user-exception';
import { GooglePayload } from '../../src/auth/auth.interface';

describe('AuthService', () => {
  let authService: AuthService;
  let usersRepositoryMock: jest.Mocked<Repository<User>>;
  let redisServiceMock: jest.Mocked<RedisService>;
  let mailServiceMock: jest.Mocked<MailService>;
  let userServiceMock: jest.Mocked<UserService>;

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

  beforeEach(async () => {
    usersRepositoryMock = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    redisServiceMock = {
      setMergeData: jest.fn(),
      setVerificationMapping: jest.fn(),
      getVerificationInfoByToken: jest.fn(),
      delVerifyMapping: jest.fn(),
      canSendVerification: jest.fn(),
      getUserVerifyInfo: jest.fn(),
      incSendingMail: jest.fn(),
    } as any;

    mailServiceMock = {
      send: jest.fn(),
    } as any;

    userServiceMock = {
      validatePassword: jest.fn(),
      getUserWithCache: jest.fn(),
      loginUser: jest.fn(),
      logoutUserBySession: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepositoryMock,
        },
        {
          provide: RedisService,
          useValue: redisServiceMock,
        },
        {
          provide: MailService,
          useValue: mailServiceMock,
        },
        {
          provide: UserService,
          useValue: userServiceMock,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('AuthService - signup', () => {
    it('should throw UserAlreadyExistsException if user already exists and authenticated with email', async () => {
      usersRepositoryMock.findOne.mockResolvedValue(mockUser);

      await expect(
        authService.signup('test@example.com', 'password123', 'John Doe'),
      ).rejects.toThrow(UE.UserAlreadyExistsException);
    });

    it('should throw AccountConflictException if user already exists and authenticated with google_oauth', async () => {
      const googleUser = { ...mockUser, authMethods: ['google_oauth'] };
      usersRepositoryMock.findOne.mockResolvedValue(googleUser);

      await expect(
        authService.signup('test@example.com', 'password123', 'John Doe'),
      ).rejects.toThrow(UE.AccountConflictException);
    });

    it('should throw PasswordInvalidException if password is invalid', async () => {
      usersRepositoryMock.findOne.mockResolvedValue(undefined);
      jest
        .spyOn(authService['userService'], 'validatePassword')
        .mockReturnValue(false);

      await expect(
        authService.signup('test@example.com', 'invalidpassword', 'John Doe'),
      ).rejects.toThrow(UE.PasswordInvalidException);
    });

    it('should create a new user if provided data is valid', async () => {
      usersRepositoryMock.findOne.mockResolvedValue(undefined);
      jest
        .spyOn(authService['userService'], 'validatePassword')
        .mockReturnValue(true);
      jest
        .spyOn(authService['userService'], 'loginUser')
        .mockResolvedValue('mockToken');

      usersRepositoryMock.save.mockResolvedValue(mockUser);

      const result = await authService.signup(
        'test1@example.com',
        'password123',
        'John Doe',
      );
      expect(result).toBe('mockToken');
    });
  });

  describe('AuthService - login', () => {
    it('should throw UserAuthenticationException if user does not exist', async () => {
      usersRepositoryMock.findOne.mockResolvedValue(undefined);

      await expect(
        authService.login('test@example.com', 'password123'),
      ).rejects.toThrow(UE.UserAuthenticationException);
    });

    it('should throw UserAuthenticationException if user does not use email authentication', async () => {
      usersRepositoryMock.findOne.mockResolvedValue({
        ...mockUser,
        authMethods: ['google_oauth'],
      });

      await expect(
        authService.login('test@example.com', 'password123'),
      ).rejects.toThrow(UE.UserAuthenticationException);
    });

    it('should throw UserAuthenticationException if password does not match', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
      usersRepositoryMock.findOne.mockResolvedValue(mockUser);

      await expect(
        authService.login('test@example.com', 'wrongPassword'),
      ).rejects.toThrow(UE.UserAuthenticationException);
    });

    it('should return token if user exists and password matches', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      jest
        .spyOn(authService['userService'], 'loginUser')
        .mockResolvedValue('mockToken');
      usersRepositoryMock.findOne.mockResolvedValue(mockUser);

      const result = await authService.login('test@example.com', 'password123');
      expect(result).toBe('mockToken');
    });
  });

  describe('AuthService - handleGoogleLogin', () => {
    const googlePayload: GooglePayload = {
      user: {
        email: 'google@example.com',
        firstName: 'Google',
        lastName: 'User',
        picture: 'https://example.com/path/to/picture.jpg',
        accessToken: 'mockAccessToken',
      },
    };

    it('should login if user exists and uses google_oauth authentication', async () => {
      usersRepositoryMock.findOne.mockResolvedValue({
        ...mockUser,
        email: 'google@example.com',
        authMethods: ['google_oauth'],
      });
      jest
        .spyOn(authService['userService'], 'loginUser')
        .mockResolvedValue('mockToken');

      const result = await authService.handleGoogleLogin(googlePayload);
      expect(result).toBe('mockToken');
    });

    it('should throw AccountConflictException if user exists and uses email authentication', async () => {
      usersRepositoryMock.findOne.mockResolvedValue(mockUser);

      await expect(
        authService.handleGoogleLogin(googlePayload),
      ).rejects.toThrow(UE.AccountConflictException);
    });

    it('should create a new user if user does not exist and login', async () => {
      usersRepositoryMock.findOne.mockResolvedValue(undefined);
      jest
        .spyOn(authService['userService'], 'loginUser')
        .mockResolvedValue('mockToken');

      const result = await authService.handleGoogleLogin(googlePayload);
      expect(result).toBe('mockToken');
    });
  });
  describe('AuthService - verifyUser', () => {
    const mockToken = 'mockVerificationToken';

    it('should throw UserNotFoundException if token is not found in Redis', async () => {
      jest
        .spyOn(authService['redisService'], 'getVerificationInfoByToken')
        .mockResolvedValue(undefined);

      await expect(authService.verifyUser(mockToken)).rejects.toThrow(
        UE.UserNotFoundException,
      );
    });

    it('should throw UserNotFoundException if userId is not present in Redis data', async () => {
      jest
        .spyOn(authService['redisService'], 'getVerificationInfoByToken')
        .mockResolvedValue({ userId: mockUser.id, email: mockUser.email });

      await expect(authService.verifyUser(mockToken)).rejects.toThrow(
        UE.UserNotFoundException,
      );
    });

    it('should throw UserNotFoundException if user does not exist', async () => {
      jest
        .spyOn(authService['redisService'], 'getVerificationInfoByToken')
        .mockResolvedValue({ userId: mockUser.id, email: mockUser.email });
      jest
        .spyOn(authService['userService'], 'getUserWithCache')
        .mockResolvedValue(undefined);

      await expect(authService.verifyUser(mockToken)).rejects.toThrow(
        UE.UserNotFoundException,
      );
    });

    it('should verify the user if token and user data are valid', async () => {
      jest
        .spyOn(authService['redisService'], 'getVerificationInfoByToken')
        .mockResolvedValue({ userId: mockUser.id, email: mockUser.email });
      jest
        .spyOn(authService['userService'], 'getUserWithCache')
        .mockResolvedValue(mockUser);
      jest
        .spyOn(authService['userService'], 'loginUser')
        .mockResolvedValue('mockToken');

      const result = await authService.verifyUser(mockToken);
      expect(result).toBe('mockToken');
    });
  });

  describe('AuthService - canResendVerification', () => {
    it('should check if can resend verification', async () => {
      jest
        .spyOn(authService['redisService'], 'canSendVerification')
        .mockResolvedValue(true);
      const result = await authService.canResendVerification(1);
      expect(result).toBeTruthy();
    });
  });

  describe('AuthService - resendVerification', () => {
    it('should resend verification if no cached info in Redis', async () => {
      jest
        .spyOn(authService['redisService'], 'getUserVerifyInfo')
        .mockResolvedValue({ token: null, email: null });
      jest
        .spyOn(authService['userService'], 'getUserWithCache')
        .mockResolvedValue(mockUser);
      const sendVerificationSpy = jest.spyOn(authService, 'sendVerification');

      await authService.resendVerification(1);
      expect(sendVerificationSpy).toHaveBeenCalledWith(
        expect.any(String),
        mockUser.email,
      );
    });

    it('should resend verification if cached info exists in Redis', async () => {
      jest
        .spyOn(authService['redisService'], 'getUserVerifyInfo')
        .mockResolvedValue({ token: 'mockToken', email: mockUser.email });
      const sendVerificationSpy = jest.spyOn(authService, 'sendVerification');

      await authService.resendVerification(1);
      expect(sendVerificationSpy).toHaveBeenCalledWith(
        'mockToken',
        mockUser.email,
      );
    });
  });

  describe('AuthService - sendVerification', () => {
    it('should send verification email and increment Redis counter', async () => {
      const sendSpy = jest
        .spyOn(authService['mailService'], 'send')
        .mockResolvedValue(undefined);
      const incSpy = jest
        .spyOn(authService['redisService'], 'incSendingMail')
        .mockResolvedValue(undefined);

      await authService.sendVerification('mockToken', mockUser.email);
      expect(sendSpy).toHaveBeenCalled();
      expect(incSpy).toHaveBeenCalled();
    });
  });

  describe('AuthService - loginUser', () => {
    it('should call loginUser from userService', async () => {
      jest
        .spyOn(authService['userService'], 'loginUser')
        .mockResolvedValue('mockToken');
      const result = await authService.loginUser(mockUser);
      expect(result).toBe('mockToken');
    });
  });

  describe('AuthService - logoutUserBySession', () => {
    it('should call logoutUserBySession from userService', async () => {
      const logoutSpy = jest
        .spyOn(authService['userService'], 'logoutUserBySession')
        .mockResolvedValue(undefined);

      await authService.logoutUserBySession('mockSession');
      expect(logoutSpy).toHaveBeenCalledWith('mockSession');
    });
  });

  describe('AuthService - generateVerificationToken', () => {
    it('should generate a verification token of expected length', () => {
      const token = authService['generateVerificationToken']();
      expect(token).toHaveLength(24);
      expect(token).toMatch(/^[A-Za-z0-9]{24}$/);
    });
  });

});
