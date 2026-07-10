import { initTracer } from '@app/shared';
initTracer('api-gateway');
import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppLogger } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule, {
    logger: new AppLogger(),
  });

  // Set global path prefix to "api" (makes URLs start with /api)
  app.setGlobalPrefix('api');

  // Enable URL-based API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
