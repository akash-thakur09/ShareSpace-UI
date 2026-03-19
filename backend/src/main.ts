import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
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
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      const allowed = (configService.get('CORS_ORIGIN', 'http://localhost:3000'))
        .split(',')
        .map((o: string) => o.trim());
      if (allowed.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
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

  // Log all registered routes on startup
  const server = app.getHttpServer();
  const router = server._events.request._router;
  if (router?.stack) {
    const routeLogger = new Logger('Routes');
    router.stack
      .filter((layer: any) => layer.route)
      .forEach((layer: any) => {
        const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase()).join(', ');
        routeLogger.log(`Mapped {${layer.route.path}, ${methods}}`);
      });
  }

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
