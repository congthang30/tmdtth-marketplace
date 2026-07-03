import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function normalizeRoutePath(path: string): string {
  return path.replace(/^\/+/, '').replace(/\/{2,}/g, '/');
}

export function setupSwagger(app: INestApplication): void {
  const globalPrefix = process.env.API_GLOBAL_PREFIX ?? 'api';
  const docsPath = normalizeRoutePath(`${globalPrefix}/docs`);
  const jsonDocumentUrl = normalizeRoutePath(`${globalPrefix}/docs-json`);
  const config = new DocumentBuilder()
    .setTitle('TMDTTH Backend API')
    .setDescription(
      'API documentation for the household ecommerce MVP backend.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the JWT access token returned by /api/auth/login.',
      },
      'bearer',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(docsPath, app, document, {
    jsonDocumentUrl,
    customSiteTitle: 'TMDTTH API Docs',
  });
}
