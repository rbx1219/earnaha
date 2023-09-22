import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { CONSTANTS } from 'src/shared/constants';
import { UserService } from 'src/user/user.service';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as UE from '../exceptions/exceptions/user-exception';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../redis/redis.service';
import { User } from '../user/user.entity';
import { GooglePayload } from './auth.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly userService: UserService,
  ) {}

  async signup(email: string, password: string, name: string): Promise<string> {
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.authMethods.includes('email')) {
        throw new UE.UserAlreadyExistsException();
      } else if (existingUser.authMethods.includes('google_oauth')) {
        const mergeKey = uuidv4();
        const salt = await bcrypt.genSalt();
        const pass = await bcrypt.hash(password, salt);

        await this.redisService.setMergeData(
          `merge:email:${mergeKey}`,
          { userId: existingUser.id, password: pass },
          3600,
        );
        throw new UE.AccountConflictException(mergeKey);
      }
    }

    if (!this.userService.validatePassword(password)) {
      throw new UE.PasswordInvalidException();
    }

    const user = new User();
    user.email = email;
    user.name = name;
    user.password = await bcrypt.hash(password, await bcrypt.genSalt());
    user.authMethods = ['email'];

    const createdUser = await this.usersRepository.save(user);

    await this.newVerificationTask(user.id, email);
    return this.loginUser(createdUser);
  }

  async newVerificationTask(userId: number, email: string): Promise<void> {
    const verificationToken = this.generateVerificationToken();

    await this.sendVerification(verificationToken, email);
    await this.redisService.setVerificationMapping(
      verificationToken,
      userId,
      email,
    );
  }

  async login(email: string, password: string): Promise<string> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (
      !user ||
      !user.authMethods.includes('email') ||
      !(await bcrypt.compare(password, user.password))
    ) {
      throw new UE.UserAuthenticationException();
    }

    return this.loginUser(user);
  }

  async handleGoogleLogin(payload: GooglePayload): Promise<string> {
    const existingUserWithEmail = await this.usersRepository.findOne({
      where: { email: payload.user.email },
    });

    if (existingUserWithEmail) {
      if (existingUserWithEmail.authMethods.includes('google_oauth')) {
        return this.loginUser(existingUserWithEmail);
      } else {
        const mergeKey = uuidv4();

        await this.redisService.setMergeData(
          `merge:google_oauth:${mergeKey}`,
          { googlePayload: payload, userId: existingUserWithEmail.id },
          3600,
        );
        throw new UE.AccountConflictException(mergeKey);
      }
    }

    const user = new User();
    user.email = payload.user.email;
    user.name = `${payload.user.firstName} ${payload.user.lastName}`;
    user.authMethods = ['google_oauth'];
    user.isVerified = true;
    const savedUser = await this.usersRepository.save(user);

    return this.loginUser(savedUser);
  }

  async verifyUser(token: string): Promise<string> {
    const u = await this.redisService.getVerificationInfoByToken(token);

    if (!u || !u.userId) {
      throw new UE.UserNotFoundException();
    }

    const user = await this.userService.getUserWithCache(u.userId);

    if (!user) {
      throw new UE.UserNotFoundException();
    }

    user.isVerified = true;

    await Promise.all([
      this.usersRepository.save(user),
      this.redisService.delVerifyMapping(token, u.userId),
    ]);

    return this.loginUser(user);
  }

  async canResendVerification(userId: number): Promise<boolean> {
    return this.redisService.canSendVerification(userId);
  }

  async resendVerification(userId: number): Promise<void> {
    const cached = await this.redisService.getUserVerifyInfo(userId);

    if (!cached.token || !cached.email) {
      const user = await this.userService.getUserWithCache(userId);
      return this.newVerificationTask(user.id, user.email);
    }

    await this.sendVerification(cached.token, cached.email);
  }

  async sendVerification(token: string, email: string) {
    const verificationLink = `${CONSTANTS.BASE_URL}/webapi/auth/verify/${token}`;
    const expirationTimeInHours = 24;
    const expirationMessage = `This link will expire in ${expirationTimeInHours} hours.`;

    const mailData = {
      to: email,
      from: 'b95056@csie.ntu.edu.tw',
      subject: 'Verify Your Account',
      text: `Please click the following link to verify your account: ${verificationLink}\n${expirationMessage}`,
      html: `<p>Please click the following link to verify your account: <a href="${verificationLink}">${verificationLink}</a></p><p>${expirationMessage}</p>`,
    };

    await this.mailService.send(mailData);
    await this.redisService.incSendingMail(token);
  }

  async loginUser(user: User): Promise<string> {
    return this.userService.loginUser(user);
  }

  async logoutUserBySession(session: string): Promise<void> {
    return this.userService.logoutUserBySession(session);
  }

  private generateVerificationToken(): string {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const tokenLength = 24;
    let token = '';

    for (let i = 0; i < tokenLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      token += characters.charAt(randomIndex);
    }

    return token;
  }
}
