import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { CorrelationMiddleware } from './correlation.middleware';
import { HttpLoggingMiddleware } from './http-logging.middleware';

@Module({
  controllers: [MetricsController],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationMiddleware, HttpLoggingMiddleware)
      .forRoutes('*');
  }
}
