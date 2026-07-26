import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { setupApp } from './common/setup-app';
import { setupSwagger } from './common/setup-swagger';
import { validateSellerVerificationConfig } from './config/seller-verification.config';

async function bootstrap() {
  validateSellerVerificationConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = Number(process.env.PORT ?? 3100);

  setupApp(app);
  setupSwagger(app);

  await app.listen(port);
}

void bootstrap();
