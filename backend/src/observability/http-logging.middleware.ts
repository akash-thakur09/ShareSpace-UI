import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { Metrics } from './metrics';

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  use(
    req: Request & { requestId?: string },
    res: Response,
    next: NextFunction,
  ) {
    const startNs = process.hrtime.bigint();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;
      const { statusCode } = res;

      // Structured log
      const log = logger.child({ requestId: req.requestId ?? 'unknown' });
      const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

      log[level]({
        type:       'http',
        method,
        path:       originalUrl,
        statusCode,
        durationMs: +durationMs.toFixed(2),
      }, `${method} ${originalUrl} ${statusCode} ${durationMs.toFixed(1)}ms`);

      // Prometheus histogram
      Metrics.httpDuration
        .labels(method, originalUrl.split('?')[0], String(statusCode))
        .observe(durationMs / 1000); // seconds
    });

    next();
  }
}
