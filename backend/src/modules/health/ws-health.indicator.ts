import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';

@Injectable()
export class WsHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const port = this.configService.get<number>('YJS_PORT', 3001);
    const url  = `ws://localhost:${port}`;
    const start = Date.now();

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const timeout = setTimeout(() => {
        ws.terminate();
        reject(
          new HealthCheckError(
            'Yjs WS timeout',
            this.getStatus(key, false, { error: 'connection timeout' }),
          ),
        );
      }, 3_000);

      ws.on('open', () => {
        clearTimeout(timeout);
        const latencyMs = Date.now() - start;
        ws.close();
        resolve(this.getStatus(key, true, { latencyMs }));
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(
          new HealthCheckError(
            'Yjs WS unreachable',
            this.getStatus(key, false, { error: err.message }),
          ),
        );
      });
    });
  }
}
