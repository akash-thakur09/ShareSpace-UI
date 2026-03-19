/**
 * Central Prometheus metrics registry.
 *
 * All metric objects are singletons on the Metrics class so any module
 * can import and update them without circular dependencies.
 *
 * Exposed at GET /metrics by MetricsController.
 */

import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Summary,
} from 'prom-client';

export const registry = new Registry();

// Collect Node.js default metrics (heap, GC, event loop lag, etc.)
collectDefaultMetrics({ register: registry, prefix: 'sharespace_' });

export class Metrics {
  // ── HTTP ──────────────────────────────────────────────────────────────────

  static readonly httpDuration = new Histogram({
    name:       'sharespace_http_request_duration_seconds',
    help:       'HTTP request latency in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets:    [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers:  [registry],
  });

  // ── WebSocket ─────────────────────────────────────────────────────────────

  static readonly wsConnections = new Gauge({
    name:      'sharespace_ws_active_connections',
    help:      'Number of active WebSocket connections',
    registers: [registry],
  });

  static readonly wsMessagesTotal = new Counter({
    name:       'sharespace_ws_messages_total',
    help:       'Total WebSocket messages received',
    labelNames: ['type'], // sync | awareness
    registers:  [registry],
  });

  static readonly wsConnectionsTotal = new Counter({
    name:       'sharespace_ws_connections_total',
    help:       'Total WebSocket connection attempts',
    labelNames: ['outcome'], // accepted | rejected
    registers:  [registry],
  });

  // ── Redis ─────────────────────────────────────────────────────────────────

  static readonly redisCommandDuration = new Histogram({
    name:       'sharespace_redis_command_duration_seconds',
    help:       'Redis command latency in seconds',
    labelNames: ['command'],
    buckets:    [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1],
    registers:  [registry],
  });

  static readonly redisErrors = new Counter({
    name:      'sharespace_redis_errors_total',
    help:      'Total Redis errors',
    registers: [registry],
  });

  // ── Document ──────────────────────────────────────────────────────────────

  static readonly docLoadDuration = new Histogram({
    name:      'sharespace_document_load_duration_seconds',
    help:      'Time to load a document from DB + Redis into memory',
    buckets:   [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2],
    registers: [registry],
  });

  static readonly activeDocuments = new Gauge({
    name:      'sharespace_active_documents',
    help:      'Number of documents currently loaded in memory',
    registers: [registry],
  });

  // ── System alerts ─────────────────────────────────────────────────────────

  static readonly heapUsageBytes = new Gauge({
    name:      'sharespace_heap_used_bytes',
    help:      'V8 heap used bytes (sampled)',
    registers: [registry],
  });

  /** Summary for p50/p95/p99 API latency — useful for SLO dashboards */
  static readonly httpLatencySummary = new Summary({
    name:       'sharespace_http_latency_summary_seconds',
    help:       'HTTP request latency summary',
    labelNames: ['method', 'route'],
    percentiles: [0.5, 0.9, 0.95, 0.99],
    registers:  [registry],
  });
}

// Sample heap every 15 s — cheap alternative to a full GC hook
setInterval(() => {
  Metrics.heapUsageBytes.set(process.memoryUsage().heapUsed);
}, 15_000).unref();
