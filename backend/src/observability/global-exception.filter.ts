import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { logger } from './logger';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx        = host.switchToHttp();
    const req        = ctx.getRequest<Request & { requestId?: string }>();
    const res        = ctx.getResponse<Response>();
    const requestId  = req.requestId ?? 'unknown';

    const isHttp     = exception instanceof HttpException;
    const statusCode = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttp
      ? (exception.getResponse() as Record<string, unknown>)
      : 'Internal server error';

    const log = logger.child({ requestId });

    if (statusCode >= 500) {
      log.error(
        {
          type:       'exception',
          statusCode,
          method:     req.method,
          path:       req.originalUrl,
          stack:      exception instanceof Error ? exception.stack : undefined,
          exception:  String(exception),
        },
        `Unhandled exception: ${exception instanceof Error ? exception.message : String(exception)}`,
      );
    } else {
      log.warn(
        {
          type:       'http_error',
          statusCode,
          method:     req.method,
          path:       req.originalUrl,
        },
        `HTTP ${statusCode}: ${req.method} ${req.originalUrl}`,
      );
    }

    res.status(statusCode).json({
      statusCode,
      message,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
