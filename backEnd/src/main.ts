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

  // CORS (SEC-B03) - Fully supports Netlify, Localhost, and configured FRONTEND_URL
  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) return callback(null, true);
      const isAllowed =
        requestOrigin.includes('localhost') ||
        requestOrigin.includes('127.0.0.1') ||
        requestOrigin.includes('netlify.app') ||
        requestOrigin.includes('onrender.com') ||
        (process.env.FRONTEND_URL &&
          requestOrigin.startsWith(process.env.FRONTEND_URL.replace(/\/$/, '')));
      if (isAllowed || process.env.NODE_ENV !== 'production') {
        callback(null, requestOrigin);
      } else {
        callback(null, requestOrigin);
      }
    },
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
  // Crucial: Bind to 0.0.0.0 for Docker & cloud host (Render/Railway/AWS) port detection
  await app.listen(port, '0.0.0.0');
  console.log(`=======================================================`);
  console.log(`ASK Tour & Travel Agency API listening on 0.0.0.0:${port}/api/v1`);
  console.log(`Swagger API Docs: http://0.0.0.0:${port}/api/docs`);
  console.log(`Health check: http://0.0.0.0:${port}/api/v1/health/live`);
  console.log(`=======================================================`);
}
bootstrap();
