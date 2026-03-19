import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { logger } from './observability/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Suppress NestJS's built-in logger — Pino handles everything
    logger: false,
    bufferLogs: false,
  });

  const configService = app.get(ConfigService);

  app.enableCors({
    origin:      configService.get('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:           true,
      forbidNonWhitelisted: true,
      transform:           true,
    }),
  );

  const port = configService.get<number>('API_PORT', 4000);
  await app.listen(port);

  logger.info({ port, env: configService.get('NODE_ENV') }, '🚀 API Server started');
}

// ── Process-level safety nets ──────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  logger.fatal({ err, type: 'uncaughtException' }, 'Uncaught exception — shutting down');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason, type: 'unhandledRejection' }, 'Unhandled promise rejection');
});

bootstrap();
