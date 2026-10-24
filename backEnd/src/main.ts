import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers (SEC-B02)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Let reverse-proxy / Netlify handle frontend CSP
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Cookie Parser for HttpOnly Refresh Tokens (FR-AUTH-04)
  app.use(cookieParser());

  // CORS (SEC-B03)
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
  });

  // Global API Prefix (SRS 15)
  app.setGlobalPrefix('api/v1');

  // Input Validation (SEC-B04)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Error Handling (SEC-B11)
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger OpenAPI Documentation & Interactive Testing Tool
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ASK Tour & Travel Agency API')
    .setDescription(
      'Comprehensive REST API documentation and interactive testing sandbox for ASK Tour & Travel Management System. Includes Client Reservations, Agent Pipelines, Moderation, RBAC, Wallets, and Transactional Notifications.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your Bearer JWT token to test authorized endpoints',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Registration, login, OTP validation, and password reset')
    .addTag('Destinations', 'Public catalog and curated tour itineraries')
    .addTag('Bookings', 'Tour reservations, client self-cancellation, and moderation')
    .addTag('Agents', 'Dynamic referral code generation, email dispatch, and client tracking')
    .addTag('Reports', 'Moderation analytics, daily reports, and Excel/PDF exports')
    .addTag('Wallet', 'Commission wallet balance, ledger transactions, and payouts')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    customSiteTitle: 'ASK Tour & Travel - Swagger API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`=======================================================`);
  console.log(`ASK Tour & Travel Agency API running on http://localhost:${port}/api/v1`);
  console.log(`Swagger API Docs: http://localhost:${port}/api/docs`);
  console.log(`Health check: http://localhost:${port}/api/v1/health/live`);
  console.log(`=======================================================`);
}
bootstrap();
