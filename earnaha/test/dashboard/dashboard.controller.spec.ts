import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from '../../src/dashboard/dashboard.controller';
import { UserService } from '../../src/user/user.service';
import { StatisticsService } from '../../src/dashboard/statistics.service';

describe('DashboardController', () => {
  let controller: DashboardController;

  const mockUserService = {
    getAllUsers: jest.fn(),
    getTotalUsersCount: jest.fn(),
  };

  const mockStatisticsService = {
    getTodayActiveUsersCount: jest.fn(),
    getAvgLast7DaysActiveUsersCountAvg: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: StatisticsService,
          useValue: mockStatisticsService,
        },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listUsers', () => {
    it('should return a list of users', async () => {
      const users = [{ name: 'User1' }, { name: 'User2' }];
      mockUserService.getAllUsers.mockResolvedValue(users);

      const result = await controller.listUsers(0, 10);

      expect(result).toEqual({
        success: true,
        users,
        message: 'List users success',
      });
    });
  });

  describe('getDashboardStatistics', () => {
    it('should return dashboard statistics', async () => {
      const totalUsers = 100;
      const todayActiveUsers = 20;
      const avgLast7DaysActiveUsers = 30;

      mockUserService.getTotalUsersCount.mockResolvedValue(totalUsers);
      mockStatisticsService.getTodayActiveUsersCount.mockResolvedValue(
        todayActiveUsers,
      );
      mockStatisticsService.getAvgLast7DaysActiveUsersCountAvg.mockResolvedValue(
        avgLast7DaysActiveUsers,
      );

      const result = await controller.getDashboardStatistics();

      expect(result).toEqual({
        success: true,
        totalUsers,
        todayActiveUsers,
        avgLast7DaysActiveUsers,
        message: 'List stat success',
      });
    });
  });
});
