import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new Redis({
      host:        this.configService.get('REDIS_HOST', 'localhost'),
      port:        this.configService.get<number>('REDIS_PORT', 6379),
      password:    this.configService.get('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
      connectTimeout: 3_000,
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const start = Date.now();
    try {
      await this.client.ping();
      const latencyMs = Date.now() - start;
      return this.getStatus(key, true, { latencyMs });
    } catch (err) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { error: String(err) }),
      );
    }
  }
}
