import { Test, TestingModule } from '@nestjs/testing';
import { MergeService } from '../../src/auth/merge.service';
import { RedisService } from '../../src/redis/redis.service';
import { UserService } from '../../src/user/user.service';
import { User } from '../../src/user/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as UE from '../../src/exceptions/exceptions/user-exception';

describe('MergeService', () => {
  let mergeService: MergeService;
  let userRepositoryMock: jest.Mocked<Repository<User>>;
  let mockUserService: jest.Mocked<UserService>;
  let mockRedisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    userRepositoryMock = {
      save: jest.fn(),
    } as any;
    mockRedisService = {
      getMergeData: jest.fn(),
      delMergeData: jest.fn(),
    } as any;

    mockUserService = {
      getUserWithCache: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MergeService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        { provide: getRepositoryToken(User), useValue: userRepositoryMock },
      ],
    }).compile();

    mergeService = module.get<MergeService>(MergeService);
  });

  it('should be defined', () => {
    expect(mergeService).toBeDefined();
  });

  it('should merge accounts when valid merge data', async () => {
    const mergeKey = 'mergeKey123';
    const incomingAuthMethod = 'email';
    const mergeData = {
      userId: 1,
      password: 'newPassword',
    };

    mockRedisService.getMergeData.mockResolvedValue(JSON.stringify(mergeData));

    const mockUser = new User();
    mockUser.authMethods = ['google_oauth'];
    mockUserService.getUserWithCache.mockResolvedValue(mockUser);

    userRepositoryMock.save.mockResolvedValue(mockUser);

    const mergedUser = await mergeService.mergeAccounts(
      mergeKey,
      incomingAuthMethod,
    );

    expect(mergedUser.authMethods).toContain('email');
    expect(mergedUser.password).toBe('newPassword');
    expect(mergedUser.isVerified).toBe(false);

    expect(mockRedisService.getMergeData).toHaveBeenCalledWith(
      `merge:${incomingAuthMethod}:${mergeKey}`,
    );
    expect(mockUserService.getUserWithCache).toHaveBeenCalledWith(
      mergeData.userId,
    );
    expect(userRepositoryMock.save).toHaveBeenCalledWith(mockUser);
    expect(mockRedisService.delMergeData).toHaveBeenCalledWith(
      `merge:${incomingAuthMethod}:${mergeKey}`,
    );
  });

  it('should throw InvalidMergeKeyException when merge data is invalid', async () => {
    mockRedisService.getMergeData.mockResolvedValue(null);

    await expect(
      mergeService.mergeAccounts('invalidKey', 'email'),
    ).rejects.toThrowError(UE.InvalidMergeKeyException);

    expect(mockRedisService.getMergeData).toHaveBeenCalledWith(
      'merge:email:invalidKey',
    );
    expect(mockUserService.getUserWithCache).not.toHaveBeenCalled();
    expect(userRepositoryMock.save).not.toHaveBeenCalled();
    expect(mockRedisService.delMergeData).not.toHaveBeenCalled();
  });

  it('should merge accounts when incomingAuthMethod is google_oauth', async () => {
    const mergeKey = 'mergeKey123';
    const incomingAuthMethod = 'google_oauth';
    const mergeData = {
      userId: 1,
    };

    mockRedisService.getMergeData.mockResolvedValue(JSON.stringify(mergeData));

    const mockUser = new User();
    mockUser.authMethods = ['email'];
    mockUserService.getUserWithCache.mockResolvedValue(mockUser);

    userRepositoryMock.save.mockResolvedValue(mockUser);

    const mergedUser = await mergeService.mergeAccounts(
      mergeKey,
      incomingAuthMethod,
    );

    expect(mergedUser.authMethods).toContain('google_oauth');
    expect(mergedUser.isVerified).toBe(true);

    expect(mockRedisService.getMergeData).toHaveBeenCalledWith(
      `merge:${incomingAuthMethod}:${mergeKey}`,
    );
    expect(mockUserService.getUserWithCache).toHaveBeenCalledWith(
      mergeData.userId,
    );
    expect(userRepositoryMock.save).toHaveBeenCalledWith(mockUser);
    expect(mockRedisService.delMergeData).toHaveBeenCalledWith(
      `merge:${incomingAuthMethod}:${mergeKey}`,
    );
  });

  it('should throw UserNotFoundException when user is not found', async () => {
    const mergeKey = 'mergeKey123';
    const incomingAuthMethod = 'email';
    const mergeData = {
      userId: 1,
      password: 'newPassword',
    };

    mockRedisService.getMergeData.mockResolvedValue(JSON.stringify(mergeData));

    mockUserService.getUserWithCache.mockResolvedValue(null);

    userRepositoryMock.save.mockResolvedValue(null); // You can adjust this if needed

    await expect(
      mergeService.mergeAccounts(mergeKey, incomingAuthMethod)
    ).rejects.toThrowError(UE.UserNotFoundException);

    expect(mockRedisService.getMergeData).toHaveBeenCalledWith(
      `merge:${incomingAuthMethod}:${mergeKey}`,
    );
    expect(mockUserService.getUserWithCache).toHaveBeenCalledWith(
      mergeData.userId,
    );
    expect(userRepositoryMock.save).not.toHaveBeenCalled(); // Ensure it was not called in this case
    expect(mockRedisService.delMergeData).not.toHaveBeenCalled(); // Ensure it was not called in this case
  });

});
