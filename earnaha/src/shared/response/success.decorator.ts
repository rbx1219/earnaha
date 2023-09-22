import { ApiResponse } from '@nestjs/swagger';
import { ErrorCode } from '../../exceptions/error-code.enum';

export const AhaSuccess = (
  status = 200,
  description = 'general response',
  schema: Record<string, any> = {
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Operation successful' },
      errCode: { type: 'number', example: ErrorCode.SUCCESS },
    },
  },
) => {
  return ApiResponse({ status, description, schema });
};

export const AhaRedirect = (
  status = 302,
  description = 'redirect response',
) => {
  return ApiResponse({ status, description });
};

export const AhaMyError = (status = 200, errorCode: number) => {
  return ApiResponse({
    status,
    description: 'general error response',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'message' },
        errCode: { type: 'number', example: errorCode },
      },
    },
  });
};

export const AhaGetUser = () => {
  return ApiResponse({
    status: 200,
    description: 'get user response',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 123 },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'johndoe@example.com' },
            isVerified: { type: 'boolean', example: true },
          },
        },
        errCode: { type: 'number', example: ErrorCode.SUCCESS },
      },
    },
  });
};

export const AhaDashboardUsersResp = () => {
  return ApiResponse({
    status: 200,
    description: 'dashboard user response',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 123 },
              name: { type: 'string', example: 'John Doe' },
              email: { type: 'string', example: 'johndoe@example.com' },
              isVerified: { type: 'boolean', example: true },
            },
          },
        },
        errCode: { type: 'number', example: ErrorCode.SUCCESS },
      },
    },
  });
};

export const AhaDashboardStatResp = () => {
  return ApiResponse({
    status: 200,
    description: 'dashboard stat response',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        totalUsers: { type: 'number', example: 1000 },
        todayActiveUsers: { type: 'number', example: 100 },
        avgLast7DaysActiveUsers: { type: 'number', example: 75 },
        errCode: { type: 'number', example: ErrorCode.SUCCESS },
      },
    },
  });
};
