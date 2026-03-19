import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { registry } from './metrics';

/** Prometheus scrape endpoint.
 *  In production, restrict access to internal networks / scrape IPs only.
 */
@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async scrape(@Res() res: Response) {
    const output = await registry.metrics();
    res.end(output);
  }
}
