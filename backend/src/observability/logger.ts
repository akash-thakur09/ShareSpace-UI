/**
 * Pino logger factory.
 *
 * In development:  pretty-printed, coloured output via pino-pretty
 * In production:   newline-delimited JSON — pipe to any log aggregator
 *
 * Every log line carries:
 *   service, env, pid, hostname  (static fields)
 *   requestId                    (injected by CorrelationMiddleware)
 *   level, time, msg             (standard Pino fields)
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  base: {
    service: 'sharespace-api',
    env:     process.env.NODE_ENV || 'development',
    pid:     process.pid,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize:        true,
            translateTime:   'SYS:HH:MM:ss',
            ignore:          'pid,hostname,service,env',
            messageFormat:   '[{requestId}] {msg}',
          },
        },
      }
    : {}),
});

/** Child logger bound to a specific request context */
export function childLogger(requestId: string) {
  return logger.child({ requestId });
}
