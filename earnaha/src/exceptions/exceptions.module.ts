import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CustomExceptionFilter } from './filters/custom-exception.filter';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: CustomExceptionFilter,
    },
  ],
  exports: [CustomExceptionFilter],
})
export class ExceptionsModule {}
