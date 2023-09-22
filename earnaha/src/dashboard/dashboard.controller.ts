// dashboard/dashboard.controller.ts

import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  AhaDashboardStatResp,
  AhaDashboardUsersResp,
} from 'src/shared/response/success.decorator';
import { UserService } from '../user/user.service';
import { StatisticsService } from './statistics.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly userService: UserService,
    private readonly statisticsService: StatisticsService,
  ) {}

  @Get('users')
  @ApiOperation({ summary: 'List users' })
  @ApiQuery({ name: 'start', description: 'Starting index', required: false })
  @ApiQuery({
    name: 'offset',
    description: 'Number of items to retrieve',
    required: false,
  })
  @AhaDashboardUsersResp()
  async listUsers(@Query('start') start = 0, @Query('offset') offset = 10) {
    const selectedFields = [
      'user.lastSession',
      'user.createdAt',
      'user.name',
      'user.loginCount',
    ];
    const users = await this.userService.getAllUsers(
      start,
      offset,
      selectedFields,
    );
    return {
      success: true,
      users,
      message: 'List users success',
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @AhaDashboardStatResp()
  async getDashboardStatistics() {
    const totalUsers = await this.userService.getTotalUsersCount();
    const todayActiveUsers =
      await this.statisticsService.getTodayActiveUsersCount();
    const avgLast7DaysActiveUsers =
      await this.statisticsService.getAvgLast7DaysActiveUsersCountAvg();

    return {
      success: true,
      totalUsers,
      todayActiveUsers,
      avgLast7DaysActiveUsers,
      message: 'List stat success',
    };
  }
}
