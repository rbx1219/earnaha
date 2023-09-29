import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  Res,
  UseFilters,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ErrorCode } from '../exceptions/error-code.enum';
import { CustomExceptionFilter } from '../exceptions/filters/custom-exception.filter';
import { AhaGetUser, AhaSuccess } from '../shared/response/success.decorator';
import * as UE from '../exceptions/exceptions/user-exception';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UserService } from './user.service';

@ApiTags('users')
@Controller('user')
@UseFilters(CustomExceptionFilter)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('update-password')
  @ApiBody({ type: UpdatePasswordDto })
  @ApiOperation({
    summary: 'Update User Password',
    description:
      'Updates the password for a user. This operation will clear all user sessions for security purposes, including sessions from Google OAuth, since a password change might indicate a potential security breach.',
  })
  @AhaSuccess()
  async updatePassword(
    @Body() updatePasswordDto: UpdatePasswordDto,
    @Req() req,
    @Res() res,
  ) {
    const userId = req.user.id;
    const { oldPassword, newPassword } = updatePasswordDto;

    if (oldPassword === newPassword) {
      throw new UE.PassTheSameException();
    }

    if (!req.user.authMethods.includes('email')) {
      throw new UE.InvalidChangePassReqException();
    }

    await this.userService.clearUserSessions(userId);
    const newSession = await this.userService.updatePassword(
      userId,
      oldPassword,
      newPassword,
    );
    res.cookie('SESSIONID', newSession, {
      httpOnly: true,
      secure: true,
      path: '/',
    });
    return res.send({
      success: true,
      message: 'Password updated successfully.',
      errCode: ErrorCode.SUCCESS,
    });
  }

  @Get('user-by-session')
  @ApiCookieAuth('SESSIONID')
  @ApiOperation({
    summary: 'Get user by session',
    description:
      'Retrieves a user based on the SESSIONID cookie. Requires a valid session in the cookie.',
  })
  @AhaGetUser()
  async getUserBySession(@Req() req) {
    const sessionId = req.cookies['SESSIONID'];
    let user = req['user'];

    if (!user) {
      user = await this.userService.getUserBySession(sessionId);
    }

    const { id, name, email, isVerified } = user;
    return {
      success: true,
      errCode: ErrorCode.SUCCESS,
      user: { id, name, email, isVerified },
    };
  }
}
