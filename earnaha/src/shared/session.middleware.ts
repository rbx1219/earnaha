// shared/session.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import * as UE from '../exceptions/exceptions/user-exception';
import { UserService } from '../user/user.service';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly userService: UserService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const cookies = req.headers.cookie ? req.headers.cookie.split('; ') : [];
    let sessionId = null;

    for (const cookie of cookies) {
      const [name, value] = cookie.split('=');
      if (name === 'SESSIONID') {
        sessionId = value;
        break;
      }
    }
    try {
      req['user'] = await this.userService.getUserBySession(sessionId);
      next();
    } catch (err) {
      throw new UE.NoValidSessionException();
    }
  }
}
