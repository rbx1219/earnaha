import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../error-code.enum';

export class UserAlreadyExistsException extends HttpException {
  constructor() {
    super(
      {
        message: 'User with this email already exists',
        errCode: ErrorCode.USER_ALREADY_EXISTS,
      },
      HttpStatus.OK,
    );
  }
}

export class UserAuthenticationException extends HttpException {
  constructor() {
    const response = {
      message: 'Invalid email or password.',
      errCode: ErrorCode.INVALID_CREDENTIALS,
    };
    super(response, HttpStatus.UNAUTHORIZED);
  }
}

export class UserNotFoundException extends HttpException {
  constructor() {
    const response = {
      message: 'User not found.',
      errCode: ErrorCode.USER_NOT_FOUND,
    };
    super(response, HttpStatus.NOT_FOUND);
  }
}

export class AccountConflictException extends HttpException {
  public mergeKey: string;

  constructor(mergeKey: string, message?: string) {
    super(message || 'Account conflict detected', 409);

    this.mergeKey = mergeKey;
  }
}

export class InvalidMergeKeyException extends HttpException {
  constructor() {
    const response = {
      message: 'Invalid mergekey.',
      errCode: ErrorCode.INVALID_MERGE_KEY,
    };
    super(response, HttpStatus.UNAUTHORIZED);
  }
}

export class NoValidSessionException extends HttpException {
  constructor() {
    const response = {
      message: 'No valid session.',
      errCode: ErrorCode.NO_VALID_SESSION,
    };
    super(response, HttpStatus.OK);
  }
}

export class PasswordInvalidException extends HttpException {
  constructor() {
    const response = {
      message: 'Password invalid.',
      errCode: ErrorCode.INVALID_PASSWORD,
    };
    super(response, HttpStatus.OK);
  }
}

export class VerifyLimitException extends HttpException {
  constructor() {
    const response = {
      message: 'Verification exceed limits.',
      errCode: ErrorCode.VERIFY_LIMIT,
    };
    super(response, HttpStatus.OK);
  }
}

export class InvalidChangePassReqException extends HttpException {
  constructor() {
    const response = {
      message: 'This account was not registered via email.',
      errCode: ErrorCode.REDUNDANT_CHANGE_PASS,
    };
    super(response, HttpStatus.OK);
  }
}

export class PassTheSameException extends HttpException {
  constructor() {
    const response = {
      message: 'Passwords should not be the same.',
      errCode: ErrorCode.REDUNDANT_CHANGE_PASS,
    };
    super(response, HttpStatus.OK);
  }
}
