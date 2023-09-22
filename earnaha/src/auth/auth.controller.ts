import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Request,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ErrorCode } from '../exceptions/error-code.enum';
import * as UE from '../exceptions/exceptions/user-exception';
import { CustomExceptionFilter } from '../exceptions/filters/custom-exception.filter';
import { CONSTANTS } from '../shared/constants';
import { AhaRedirect, AhaSuccess } from '../shared/response/success.decorator';
import { GooglePayload } from './auth.interface';
import { AuthService } from './auth.service';
import { MergeService } from './merge.service';

class MergeRequestDto {
  @ApiProperty({
    description: 'Error code',
    example: ErrorCode.ACCOUNT_CONFLICT_GOOGLE,
  })
  errorCode: number;

  @ApiProperty({ description: 'Merge key', example: 'your-merge-key' })
  mergeKey: string;
}

class SignupDto {
  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: 'User password', example: 'password123' })
  password: string;
}

class LoginDto {
  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: 'User password', example: 'password123' })
  password: string;
}

@ApiTags('auth')
@Controller('auth')
@UseFilters(CustomExceptionFilter)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mergeService: MergeService,
  ) {}

  @Post('signup')
  @ApiOperation({
    summary: 'User Signup',
    description:
      'Create a new user account by providing an email and password.',
  })
  @ApiBody({ type: SignupDto })
  @AhaSuccess()
  async signup(@Body() signupDto: SignupDto, @Res() res: Response) {
    try {
      const { email, password } = signupDto;
      const name = email.split('@')[0];

      if (!this.isValidEmail(email)) {
        throw new UE.UserAuthenticationException();
      }

      const sessionId = await this.authService.signup(email, password, name);

      res.cookie('SESSIONID', sessionId, {
        httpOnly: true,
        secure: true,
        path: '/',
      });
      return res.send({
        success: true,
        message: 'Signup successful, please verify your email.',
        errCode: ErrorCode.SUCCESS,
      });
    } catch (error) {
      if (error instanceof UE.AccountConflictException) {
        const redirectUrl = `${
          CONSTANTS.BASE_URL
        }/merge?mergeKey=${encodeURIComponent(error.mergeKey)}&errCode=${
          ErrorCode.ACCOUNT_CONFLICT_EMAIL
        }`;
        return res.redirect(redirectUrl);
      }
      throw error;
    }
  }

  @Post('login')
  @ApiOperation({
    summary: 'User Login',
    description: 'Authenticate a user by providing their email and password.',
  })
  @ApiBody({ type: LoginDto })
  @AhaSuccess()
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    try {
      const { email, password } = loginDto;

      if (!this.isValidEmail(email)) {
        throw new UE.UserAuthenticationException();
      }

      const sessionId = await this.authService.login(email, password);

      res.cookie('SESSIONID', sessionId, {
        httpOnly: true,
        secure: true,
        path: '/',
      });
      return res.send({
        success: true,
        message: 'Logged in successfully',
        errCode: ErrorCode.SUCCESS,
      });
    } catch (error) {
      throw error;
    }
  }

  @Get('logout')
  @ApiOperation({
    summary: 'User Logout',
    description: 'Log out the currently authenticated user.',
  })
  @AhaRedirect()
  async logout(@Req() req, @Res() res: Response) {
    const sessionId = req.cookies['SESSIONID'];

    await this.authService.logoutUserBySession(sessionId);
    res.clearCookie('SESSIONID');
    return res.redirect('/');
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google Login',
    description: 'Initiate the Google OAuth login process.',
  })
  @AhaRedirect()
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google Login Callback',
    description:
      'Handle the callback from Google OAuth after successful login.',
  })
  @AhaRedirect()
  async googleLoginCallback(@Request() req, @Res() res: Response) {
    try {
      const payload: GooglePayload = {
        user: req.user,
      };

      if (!payload.user) {
        throw new Error('No user from Google');
      }

      const sessionId = await this.authService.handleGoogleLogin(payload);

      res.cookie('SESSIONID', sessionId, {
        httpOnly: true,
        secure: true,
        path: '/',
      });

      return res.redirect(302, CONSTANTS.BASE_URL);
    } catch (error) {
      if (error instanceof UE.AccountConflictException) {
        const redirectUrl = `${
          CONSTANTS.BASE_URL
        }/merge?mergeKey=${encodeURIComponent(error.mergeKey)}&errCode=${
          ErrorCode.ACCOUNT_CONFLICT_GOOGLE
        }`;
        return res.redirect(redirectUrl);
      }

      throw error;
    }
  }

  @Post('merge')
  @ApiOperation({
    summary: 'Merge User Accounts',
    description:
      'Merge user accounts based on the provided merge key and error code.',
  })
  @ApiBody({ type: MergeRequestDto })
  @AhaSuccess()
  async mergeAccounts(
    @Body() mergeRequest: MergeRequestDto,
    @Res() res: Response,
  ) {
    try {
      const { errorCode, mergeKey } = mergeRequest;
      let incomingAuthMethod: 'email' | 'google_oauth' = 'email';

      if (errorCode === ErrorCode.ACCOUNT_CONFLICT_GOOGLE) {
        incomingAuthMethod = 'google_oauth';
      }

      const mergedUser = await this.mergeService.mergeAccounts(
        mergeKey,
        incomingAuthMethod,
      );

      const sessionId = await this.authService.loginUser(mergedUser);
      res.cookie('SESSIONID', sessionId, {
        httpOnly: true,
        secure: true,
        path: '/',
      });
      return res.send({
        success: true,
        message: 'Account merged successfully',
        user: mergedUser,
        errCode: ErrorCode.SUCCESS,
      });
    } catch (error) {
      throw error;
    }
  }

  @Get('verify/:token')
  @ApiOperation({
    summary: 'Verify User',
    description: 'Verify a user account using a verification token.',
  })
  @ApiParam({
    name: 'token',
    description: 'Verification token',
    required: true,
  })
  @AhaRedirect()
  async verifyUser(@Param('token') token: string, @Res() res: Response) {
    const sessionId = await this.authService.verifyUser(token);
    res.cookie('SESSIONID', sessionId, {
      httpOnly: true,
      secure: true,
      path: '/',
    });
    return res.redirect(CONSTANTS.BASE_URL);
  }

  @Get('resend-verification/:userId')
  @ApiOperation({
    summary: 'Resend Verification Email',
    description: 'Resend a verification email to the specified user ID.',
  })
  @ApiParam({ name: 'userId', description: 'User ID', required: true })
  @AhaSuccess()
  async resendVerification(
    @Param('userId') userId: number,
    @Res() res: Response,
  ) {
    const canResend = await this.authService.canResendVerification(userId);
    if (!canResend) {
      throw new UE.VerifyLimitException();
    }

    // maybe racing here
    // should resolve by ... redis.multi?
    await this.authService.resendVerification(userId);

    return res.send({
      success: true,
      message: 'Logged in successfully',
      errCode: ErrorCode.SUCCESS,
    });
  }

  private isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }
}
