import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { setupApp } from './common/setup-app';
import { setupSwagger } from './common/setup-swagger';
import {
  ensureUploadRoot,
  getUploadPublicPrefix,
} from './config/upload.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = Number(process.env.PORT ?? 3100);

  setupApp(app);
  setupSwagger(app);
  app.useStaticAssets(ensureUploadRoot(), {
    prefix: `${getUploadPublicPrefix()}/`.replace(/\/{2,}/g, '/'),
  });

  await app.listen(port);
}

void bootstrap();
