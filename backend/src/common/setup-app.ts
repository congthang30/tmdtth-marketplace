import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiResponseInterceptor } from './interceptors/api-response.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';

const defaultCorsOrigins = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

function getCorsOrigins(): Array<string | RegExp> {
  const configuredOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins && configuredOrigins.length > 0
    ? configuredOrigins
    : defaultCorsOrigins;
}

export function setupApp(app: INestApplication): void {
  const globalPrefix = process.env.API_GLOBAL_PREFIX ?? 'api';

  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
  });
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor(app.get(Reflector)));
  app.enableShutdownHooks();
}
