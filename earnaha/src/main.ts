// main.ts

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for all routes and origins
  app.use(cookieParser());

  const config = new DocumentBuilder()
    .setTitle('Aha exam api page')
    .setDescription('Swagger page for api reference')
    .setVersion('1.0')
    .addTag('auth-page')
    .addServer('/webapi')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document);

  await app.listen(3000);
}
bootstrap();
