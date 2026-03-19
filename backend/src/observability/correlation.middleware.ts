import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

/** Stamps every inbound request with a UUID correlation ID.
 *  Reads X-Request-Id from the client if present (useful for tracing
 *  across frontend → API → Yjs server), otherwise generates a new one.
 *  The ID is attached to req.requestId and echoed back in the response header.
 */
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request & { requestId?: string }, res: Response, next: NextFunction) {
    const id = (req.headers[REQUEST_ID_HEADER] as string | undefined) || randomUUID();
    req.requestId = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
  }
}
