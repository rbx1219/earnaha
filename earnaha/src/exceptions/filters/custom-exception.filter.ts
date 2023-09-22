// exceptions/filters/http-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ErrorCode } from '../error-code.enum';

@Catch(HttpException)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus() || HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception.getResponse();
    const { message, errCode = ErrorCode.UNKNOWN_ERROR } =
      exceptionResponse as any;

    response.status(status).json({
      success: false,
      message,
      errCode,
    });
  }
}
