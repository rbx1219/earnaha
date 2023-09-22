import { Module } from '@nestjs/common';
import { SessionMiddleware } from './session.middleware';

@Module({
  providers: [SessionMiddleware],
  exports: [SessionMiddleware],
})
export class SharedModule {}
