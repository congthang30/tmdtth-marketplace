import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ApiResponseInterceptor } from './interceptors/api-response.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';

export function setupApp(app: INestApplication): void {
  const globalPrefix = process.env.API_GLOBAL_PREFIX ?? 'api';

  app.setGlobalPrefix(globalPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.enableShutdownHooks();
}
