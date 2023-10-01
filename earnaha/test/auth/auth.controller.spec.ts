import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { MergeService } from '../../src/auth/merge.service';
import * as request from 'supertest';
import * as UE from '../../src/exceptions/exceptions/user-exception';
import * as cookieParser from 'cookie-parser';
import { ErrorCode } from '../../src/exceptions/error-code.enum';
import { User } from '../../src/user/user.entity';
import { CONSTANTS } from '../../src/shared/constants';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';

class MockGoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: 'MOCK_GOOGLE_CLIENT_ID',
      clientSecret: 'MOCK_GOOGLE_CLIENT_SECRET',
      callbackURL: 'MOCK_CALLBACK_URL',
      passReqToCallback: true,
      scope: ['profile'],
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
  ) {
    // Mock user profile
    return {
      userId: profile.id,
      username: profile.displayName,
      email: profile.emails[0].value,
    };
  }
}

describe('AuthController', () => {
  // let controller: AuthController;
  let app;
  let testingModule: TestingModule;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            signup: jest.fn(),
            isValidEmail: jest.fn(),
            login: jest.fn(),
            handleGoogleLogin: jest.fn(),
            logoutUserBySession: jest.fn(),
            verifyUser: jest.fn(),
            loginUser: jest.fn(),
            resendVerification: jest.fn(),
            canResendVerification: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: MergeService,
          useValue: {
            mergeAccounts: jest.fn(),
          },
        },
        MockGoogleStrategy,
      ],
    }).compile();

    app = testingModule.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  it('should signup a user successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'testpassword',
      })
      .expect(201);

    expect(response.body.success).toEqual(true);
  });

  it('should throw an error for invalid email during signup', async () => {
    const invalidEmails = [
      'userexample.com',
      'user.name@example.',
      'user@.com',
      '@example.com',
      'user@name@example.com',
      'user@name@example..com',
    ];

    for (const email of invalidEmails) {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: email,
          password: 'testpassword',
        });

      // Adjust the expected status code based on your implementation
      expect(response.status).toBe(401);
      expect(response.body.errCode).toBe(ErrorCode.INVALID_CREDENTIALS); // Assuming you have an ErrorCode for invalid emails
    }
  });

  it('should login a user successfully', async () => {
    const mockSessionId = 'mockedSessionId';
    const mockAuthService =
      testingModule.get<jest.Mocked<AuthService>>(AuthService);
    mockAuthService.login.mockResolvedValue(mockSessionId);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword',
      })
      .expect(201);

    expect(response.body.success).toEqual(true);
    expect(response.body.message).toEqual('Logged in successfully');
  });

  it('should throw UserAuthenticationException for invalid email format', async () => {
    const invalidEmailLoginDto = {
      email: 'invalidEmailWithoutAtSymbol',
      password: 'testpassword',
    };

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(invalidEmailLoginDto)
      .expect(401);

    // You can further assert that the error message or type is correct based on how
    // UserAuthenticationException structures its response.
    expect(response.body.message).toEqual('Invalid email or password.'); // Adjust the expected message based on your implementation.
  });

  it('should throw UserAuthenticationException when authService.login fails', async () => {
    const mockLoginDto = {
      email: 'test@example.com',
      password: 'incorrectPassword',
    };

    const mockAuthService =
      testingModule.get<jest.Mocked<AuthService>>(AuthService);

    mockAuthService.login.mockRejectedValue(
      new UE.UserAuthenticationException(),
    );

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(mockLoginDto)
      .expect(401);

    expect(response.body.message).toEqual('Invalid email or password.'); // Adjust the expected message based on your implementation.
  });

  it('should logout the user and clear the SESSIONID cookie', async () => {
    const mockCookie = 'some-session-id';

    const response = await request(app.getHttpServer())
      .get('/auth/logout')
      .set('Cookie', [`SESSIONID=${mockCookie}`])
      .expect(302);

    expect(response.get('Set-Cookie')).toEqual(
      expect.arrayContaining([expect.stringContaining('SESSIONID=;')]),
    );
  });

  describe('mergeAccounts', () => {
    it('should merge accounts and return success', async () => {
      const mergeRequest = {
        errorCode: ErrorCode.ACCOUNT_CONFLICT_EMAIL,
        mergeKey: 'mock-merge-key',
      };

      const mockMergedUser: User = {
        id: 1,
        email: 'test@example.com',
        password: 'testpassword',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
        authMethods: ['email'],
        loginCount: 1,
        lastSession: new Date(),
        isVerified: true,
      };

      const mockAuthService =
        testingModule.get<jest.Mocked<AuthService>>(AuthService);
      mockAuthService.loginUser.mockResolvedValue('mock-session-id');

      const mockMergeService =
        testingModule.get<jest.Mocked<MergeService>>(MergeService);
      mockMergeService.mergeAccounts.mockResolvedValue(mockMergedUser);

      const response = await request(app.getHttpServer())
        .post('/auth/merge')
        .send(mergeRequest)
        .expect(201);

      expect(response.body.success).toEqual(true);
      expect(response.body.message).toEqual('Account merged successfully');
    });

    it('should handle ACCOUNT_CONFLICT_GOOGLE error code correctly', async () => {
      const mergeRequest = {
        errorCode: ErrorCode.ACCOUNT_CONFLICT_GOOGLE,
        mergeKey: 'mock-merge-key',
      };

      const mockMergedUser: User = {
        id: 1,
        email: 'test@example.com',
        password: 'testpassword',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
        authMethods: ['email'],
        loginCount: 1,
        lastSession: new Date(),
        isVerified: true,
      };

      const mockAuthService =
        testingModule.get<jest.Mocked<AuthService>>(AuthService);
      mockAuthService.loginUser.mockResolvedValue('mock-session-id');

      const mockMergeService =
        testingModule.get<jest.Mocked<MergeService>>(MergeService);
      mockMergeService.mergeAccounts.mockResolvedValue(mockMergedUser);

      const response = await request(app.getHttpServer())
        .post('/auth/merge')
        .send(mergeRequest)
        .expect(201);

      expect(response.body.success).toEqual(true);
      // Here, you should also validate that the mergeService.mergeAccounts
      // was called with 'google_oauth' as the second argument, if possible.
    });

    it('should throw InvalidMergeKeyException when mergeService.mergeAccounts fails due to an invalid merge key', async () => {
      const mockMergeRequestDto = {
        errorCode: ErrorCode.ACCOUNT_CONFLICT_EMAIL, // or ACCOUNT_CONFLICT_GOOGLE based on your use case
        mergeKey: 'invalid-merge-key',
      };

      const mockMergeService =
        testingModule.get<jest.Mocked<MergeService>>(MergeService);

      // Mock the mergeAccounts function to throw InvalidMergeKeyException
      mockMergeService.mergeAccounts.mockRejectedValue(
        new UE.InvalidMergeKeyException(),
      );

      const response = await request(app.getHttpServer())
        .post('/auth/merge')
        .send(mockMergeRequestDto)
        .expect(401); // Assuming that InvalidMergeKeyException returns a 400 status code.

      // Assert the error message or type is correct based on the structure of InvalidMergeKeyException's response.
      expect(response.body.message).toEqual('Invalid mergekey.'); // Adjust the expected message based on your implementation.
    });
  });

  describe('verifyUser', () => {
    it('should verify a user and return success', async () => {
      const mockToken = 'mock-token';
      const mockAuthService =
        testingModule.get<jest.Mocked<AuthService>>(AuthService);
      mockAuthService.verifyUser.mockResolvedValue('mock-session-id');

      await request(app.getHttpServer())
        .get(`/auth/verify/${mockToken}`)
        .expect(302);

      // Add your assertions here, depending on the expected behavior.
    });
  });

  describe('resendVerification', () => {
    it('should resend the verification email based on userId and return success', async () => {
      const mockUserId = 123;

      const mockAuthService =
        testingModule.get<jest.Mocked<AuthService>>(AuthService);
      // Mock the resendVerification function to resolve without errors
      mockAuthService.resendVerification.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .get(`/auth/resend-verification/${mockUserId}`)
        .expect(200);

      expect(response.body.success).toEqual(true);
      expect(response.body.message).toEqual('Logged in successfully');
    });

    it('should throw VerifyLimitException if canResend returns false', async () => {
      const mockUserId = 123;

      const mockAuthService =
        testingModule.get<jest.Mocked<AuthService>>(AuthService);

      mockAuthService.canResendVerification.mockResolvedValue(false);

      const response = await request(app.getHttpServer())
        .get(`/auth/resend-verification/${mockUserId}`)
        .expect(200);

      // Assert the error message or type is correct based on the structure of VerifyLimitException's response.
      expect(response.body.message).toEqual('Verification exceed limits.'); // Adjust the expected message based on your implementation.
    });
  });

  describe('isValidEmail', () => {
    let authController: AuthController;

    beforeEach(() => {
      authController = testingModule.get<AuthController>(AuthController);
    });

    it('should return true for valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.co.uk',
        'user+tag@example.org',
      ];

      validEmails.forEach((email) => {
        expect(authController['isValidEmail'](email)).toBe(true);
      });
    });

    it('should return false for invalid email addresses', () => {
      const invalidEmails = [
        'userexample.com',
        'user.name@example.',
        'user@.com',
        '@example.com',
        'user@name@example.com',
        'user@name@example..com',
      ];

      invalidEmails.forEach((email) => {
        expect(authController['isValidEmail'](email)).toBe(false);
      });
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
