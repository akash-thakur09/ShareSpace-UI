/**
 * UpdateStore — incremental Yjs persistence layer
 *
 * Architecture:
 *   Redis list  `yjs:updates:<documentId>`  — append-only log of raw Yjs updates
 *   Postgres    documents.yjs_state          — periodic compacted full snapshot
 *
 * Write path (every update):
 *   RPUSH update bytes → Redis  (sub-millisecond, non-blocking)
 *
 * Read path (document load):
 *   1. Load full snapshot from Postgres  (baseline)
 *   2. LRANGE all pending updates from Redis
 *   3. Apply updates on top → consistent in-memory doc
 *
 * Compaction (debounced, every SNAPSHOT_INTERVAL_MS):
 *   1. Encode full Y.Doc state
 *   2. Write to Postgres documents.yjs_state
 *   3. DEL Redis list  (updates now baked into snapshot)
 *   4. Optionally write a DocumentSnapshot row for history
 *
 * Crash recovery:
 *   Redis is configured with AOF/RDB persistence (ops concern).
 *   Even without Redis persistence, Postgres snapshot + Redis updates
 *   since last compaction are replayed on load — worst case loss is
 *   updates since last Redis flush (typically < 1 s with AOF everysec).
 */

import * as Y from 'yjs';
import Redis from 'ioredis';
import { Repository, DataSource } from 'typeorm';
import { Document } from './entities/document.entity';
import { DocumentSnapshot } from './entities/document-snapshot.entity';
import { Metrics } from '../../observability/metrics';

// Redis key helpers
const updatesKey = (docId: string) => `yjs:updates:${docId}`;
const lockKey    = (docId: string) => `yjs:compact:lock:${docId}`;

const COMPACT_LOCK_TTL_MS = 30_000; // prevent concurrent compactions
const MAX_PENDING_UPDATES  = 500;   // trigger eager compaction above this count

export class UpdateStore {
  private readonly redis: Redis;
  private readonly documentRepo: Repository<Document>;
  private readonly snapshotRepo: Repository<DocumentSnapshot>;

  constructor(
    redis: Redis,
    dataSource: DataSource,
  ) {
    this.redis       = redis;
    this.documentRepo = dataSource.getRepository(Document);
    this.snapshotRepo = dataSource.getRepository(DocumentSnapshot);
  }

  // -------------------------------------------------------------------------
  // Write — called on every Yjs 'update' event
  // -------------------------------------------------------------------------

  /**
   * Append a raw Yjs update binary to the Redis list.
   * Fire-and-forget: errors are logged but never thrown to the caller
   * so the WebSocket thread is never blocked.
   */
  appendUpdate(documentId: string, update: Uint8Array): void {
    const buf   = Buffer.from(update);
    const start = process.hrtime.bigint();
    this.redis
      .rpush(updatesKey(documentId), buf)
      .then((listLen) => {
        Metrics.redisCommandDuration
          .labels('rpush')
          .observe(Number(process.hrtime.bigint() - start) / 1e9);
        if (listLen >= MAX_PENDING_UPDATES) {
          this.redis.set(`yjs:eager:${documentId}`, '1', 'EX', 60).catch(() => {});
        }
      })
      .catch((err) => {
        Metrics.redisErrors.inc();
        console.error(`[UpdateStore] Redis RPUSH failed for ${documentId}:`, err);
      });
  }

  // -------------------------------------------------------------------------
  // Read — reconstruct document state on load
  // -------------------------------------------------------------------------

  /**
   * Load a document into the provided Y.Doc.
   * Returns the number of pending Redis updates applied.
   */
  async loadDocument(documentId: string, ydoc: Y.Doc): Promise<number> {
    // 1. Postgres baseline snapshot
    const row = await this.documentRepo.findOne({
      where: { id: documentId },
      select: ['yjsState'],
    });

    if (row?.yjsState) {
      Y.applyUpdate(ydoc, new Uint8Array(row.yjsState));
    }

    // 2. Pending incremental updates from Redis
    const lrangeStart = process.hrtime.bigint();
    const rawUpdates = await this.redis.lrangeBuffer(updatesKey(documentId), 0, -1);
    Metrics.redisCommandDuration
      .labels('lrange')
      .observe(Number(process.hrtime.bigint() - lrangeStart) / 1e9);

    if (rawUpdates.length > 0) {
      // Merge all pending updates into one before applying — more efficient
      // than applying them one-by-one when there are many
      const merged = Y.mergeUpdates(rawUpdates.map((b) => new Uint8Array(b)));
      Y.applyUpdate(ydoc, merged);
    }

    return rawUpdates.length;
  }

  // -------------------------------------------------------------------------
  // Compaction — persist full state to Postgres, prune Redis list
  // -------------------------------------------------------------------------

  /**
   * Compact the document: write full state to Postgres, clear Redis list.
   * Uses a Redis lock to prevent concurrent compactions of the same document.
   * Safe to call from multiple processes (e.g. horizontal scaling).
   */
  async compact(documentId: string, ydoc: Y.Doc, saveSnapshot = false): Promise<boolean> {
    // Acquire lock (SET NX PX)
    const lock = await this.redis.set(
      lockKey(documentId),
      '1',
      'PX', COMPACT_LOCK_TTL_MS,
      'NX',
    );

    if (!lock) return false; // another process is compacting

    try {
      const fullState = Buffer.from(Y.encodeStateAsUpdate(ydoc));

      // Write full state to documents table
      await this.documentRepo.update(
        { id: documentId },
        { yjsState: fullState, updatedAt: new Date() },
      );

      // Optionally write a snapshot row for history / restore
      if (saveSnapshot) {
        const latest = await this.snapshotRepo.findOne({
          where: { documentId },
          order: { version: 'DESC' },
          select: ['version'],
        });
        const version = (latest?.version ?? 0) + 1;

        await this.snapshotRepo.save(
          this.snapshotRepo.create({
            documentId,
            yjsState: fullState,
            version,
            metadata: { source: 'auto-compact', ts: new Date().toISOString() },
          }),
        );
      }

      // Prune Redis list — updates are now baked into the Postgres snapshot
      await this.redis.del(updatesKey(documentId));
      await this.redis.del(`yjs:eager:${documentId}`);

      return true;
    } catch (err) {
      console.error(`[UpdateStore] Compaction failed for ${documentId}:`, err);
      return false;
    } finally {
      await this.redis.del(lockKey(documentId));
    }
  }

  /**
   * Check whether an eager compaction was requested for this document
   * (triggered when the Redis list exceeds MAX_PENDING_UPDATES).
   */
  async needsEagerCompaction(documentId: string): Promise<boolean> {
    const flag = await this.redis.get(`yjs:eager:${documentId}`);
    return flag === '1';
  }

  /**
   * Flush all pending updates for a document to Postgres without clearing
   * the Redis list. Used on graceful shutdown when we can't afford a full
   * compaction cycle.
   */
  async flushToDB(documentId: string, ydoc: Y.Doc): Promise<void> {
    try {
      await this.documentRepo.update(
        { id: documentId },
        {
          yjsState: Buffer.from(Y.encodeStateAsUpdate(ydoc)),
          updatedAt: new Date(),
        },
      );
    } catch (err) {
      console.error(`[UpdateStore] Flush failed for ${documentId}:`, err);
    }
  }
}
