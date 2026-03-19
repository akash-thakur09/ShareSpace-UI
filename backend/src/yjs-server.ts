/**
 * Secure Yjs WebSocket Server
 * — incremental persistence (Redis list + Postgres snapshots)
 * — horizontal scaling via Redis Pub/Sub (ClusterBus)
 *
 * Connection:  ws://host?doc=<publicId>&token=<accessJwt>
 *
 * Scaling model:
 *   N instances share the same Redis + Postgres.
 *   Every Yjs update is:
 *     1. Applied to the local in-memory Y.Doc
 *     2. Broadcast to local WebSocket clients
 *     3. Appended to Redis list (persistence)
 *     4. Published to Redis Pub/Sub channel (cross-instance fan-out)
 *   Remote instances receive via Pub/Sub, apply to their local Y.Doc,
 *   and broadcast to their own WebSocket clients.
 *   Loop prevention: messages tagged with SERVER_ID; own messages dropped.
 */

import * as Y from 'yjs';
import * as ws from 'ws';
import * as http from 'http';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import { verify, JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { DataSource, Repository } from 'typeorm';
import { Document } from './modules/document/entities/document.entity';
import { DocumentSnapshot } from './modules/document/entities/document-snapshot.entity';
import { DocumentPermission, DocumentRole, ROLE_HIERARCHY } from './modules/document/entities/document-permission.entity';
import { User } from './modules/auth/entities/user.entity';
import { UpdateStore } from './modules/document/update-store';
import { ClusterBus } from './cluster/pubsub';
import { Metrics } from './observability/metrics';
import { logger as rootLogger } from './observability/logger';

const log = rootLogger.child({ service: 'yjs-server' });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT                     = parseInt(process.env.YJS_PORT             || '3001',  10);
const SNAPSHOT_INTERVAL_MS     = parseInt(process.env.SNAPSHOT_INTERVAL_MS  || '30000', 10);
const SNAPSHOT_DEBOUNCE_MS     = 5_000;
const REVALIDATION_INTERVAL_MS = 60_000;
const DOC_IDLE_TTL_MS          = 30_000;
const SAVE_SNAPSHOT_EVERY_N    = 10;

/** Unique identity for this process — used to tag pub/sub messages */
const SERVER_ID = process.env.SERVER_ID || randomUUID();

/** Set REDIS_PUBSUB_ENABLED=false to run single-instance without pub/sub */
const PUBSUB_ENABLED = process.env.REDIS_PUBSUB_ENABLED !== 'false';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required');

// ---------------------------------------------------------------------------
// Protocol constants
// ---------------------------------------------------------------------------

const messageSync      = 0;
const messageAwareness = 1;

/** Sentinel origin used when applying updates received from ClusterBus.
 *  WSSharedDoc checks this to avoid re-publishing back to Redis. */
const CLUSTER_ORIGIN = 'cluster-bus';

// ---------------------------------------------------------------------------
// Presence colours
// ---------------------------------------------------------------------------

const PRESENCE_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#00BCD4', '#009688',
  '#4CAF50', '#FF9800', '#FF5722',
];

function colorForUser(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return PRESENCE_COLORS[h % PRESENCE_COLORS.length];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JwtPayload {
  sub: string;
  email: string;
  ver: number;
  iat: number;
  exp: number;
}

interface ConnMeta {
  userId: string;
  email: string;
  documentId: string;
  publicId: string;
  role: DocumentRole;
  readOnly: boolean;
  revalidationTimer: ReturnType<typeof setInterval>;
}

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------

const docIdCache = new Map<string, string>();
const docs       = new Map<string, WSSharedDoc>();

let dataSource:  DataSource;
let userRepo:    Repository<User>;
let documentRepo: Repository<Document>;
let redis:       Redis;
let updateStore: UpdateStore;
let clusterBus:  ClusterBus | null = null;

// ---------------------------------------------------------------------------
// WSSharedDoc
// ---------------------------------------------------------------------------

class WSSharedDoc extends Y.Doc {
  readonly publicId:   string;
  readonly documentId: string;

  conns = new Map<ws.WebSocket, Set<number>>();
  awareness: awarenessProtocol.Awareness;

  private lastEditAt   = 0;
  private compactCount = 0;
  private snapshotTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer:    ReturnType<typeof setTimeout> | null = null;

  constructor(publicId: string, documentId: string) {
    super({ gc: true });
    this.publicId   = publicId;
    this.documentId = documentId;
    this.awareness  = new awarenessProtocol.Awareness(this);

    this.awareness.on('update', this._onAwarenessUpdate.bind(this));
    this.on('update', this._onUpdate.bind(this));
  }

  // ---- awareness -----------------------------------------------------------

  private _onAwarenessUpdate(
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) {
    const changed = [...added, ...updated, ...removed];

    // Track which clientIDs each WebSocket connection controls
    if (origin instanceof ws.WebSocket) {
      const controlled = this.conns.get(origin) ?? new Set<number>();
      added.forEach((id) => controlled.add(id));
      removed.forEach((id) => controlled.delete(id));
      this.conns.set(origin, controlled);
    }

    // Broadcast to local clients
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, messageAwareness);
    encoding.writeVarUint8Array(
      enc,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed),
    );
    const buf = encoding.toUint8Array(enc);
    this.conns.forEach((_, c) => send(this, c, buf));

    // Cross-instance: publish awareness to other servers
    // Skip if the update came from ClusterBus (already from another instance)
    if (PUBSUB_ENABLED && clusterBus && origin !== CLUSTER_ORIGIN) {
      const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed);
      clusterBus.publishAwareness(this.documentId, update);
    }
  }

  // ---- document update -----------------------------------------------------

  private _onUpdate(update: Uint8Array, origin: unknown) {
    // 1. Broadcast to local WebSocket clients
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, messageSync);
    syncProtocol.writeUpdate(enc, update);
    const msg = encoding.toUint8Array(enc);
    this.conns.forEach((_, c) => send(this, c, msg));

    // 2. Persist to Redis list (fire-and-forget)
    updateStore.appendUpdate(this.documentId, update);
    this.lastEditAt = Date.now();

    // 3. Cross-instance fan-out via Pub/Sub
    // Guard: skip if this update arrived FROM ClusterBus to prevent loops
    if (PUBSUB_ENABLED && clusterBus && origin !== CLUSTER_ORIGIN) {
      clusterBus.publishDocUpdate(this.documentId, update);
    }

    // 4. Schedule debounced compaction
    this._scheduleCompaction();
  }

  // ---- compaction ----------------------------------------------------------

  private _scheduleCompaction() {
    if (this.snapshotTimer) clearTimeout(this.snapshotTimer);
    this.snapshotTimer = setTimeout(() => this._compact(), SNAPSHOT_DEBOUNCE_MS);
  }

  private async _compact() {
    if (Date.now() - this.lastEditAt < SNAPSHOT_DEBOUNCE_MS - 100) {
      this._scheduleCompaction();
      return;
    }

    const elapsed = Date.now() - (this.lastEditAt - SNAPSHOT_INTERVAL_MS);
    if (elapsed < SNAPSHOT_INTERVAL_MS) {
      this.snapshotTimer = setTimeout(
        () => this._compact(),
        SNAPSHOT_INTERVAL_MS - elapsed,
      );
      return;
    }

    this.compactCount++;
    const saveSnapshot = this.compactCount % SAVE_SNAPSHOT_EVERY_N === 0;
    const ok = await updateStore.compact(this.documentId, this, saveSnapshot);
    if (ok) {
      log.info({ publicId: this.publicId, saveSnapshot, type: 'compact' }, `Compacted ${this.publicId}`);
    }
  }

  // ---- load ----------------------------------------------------------------

  async load(): Promise<void> {
    const loadStart = Date.now();
    const pending = await updateStore.loadDocument(this.documentId, this);
    const durationMs = Date.now() - loadStart;
    Metrics.docLoadDuration.observe(durationMs / 1000);
    Metrics.activeDocuments.inc();
    log.info({ publicId: this.publicId, pending, durationMs, type: 'doc_load' }, `Loaded ${this.publicId}`);

    if (pending > 0 && await updateStore.needsEagerCompaction(this.documentId)) {
      await updateStore.compact(this.documentId, this, false);
      log.info({ publicId: this.publicId, type: 'eager_compact' }, `Eager compaction for ${this.publicId}`);
    }
  }

  // ---- idle / unload -------------------------------------------------------

  scheduleIdleUnload() {
    this._clearIdleTimer();
    this.idleTimer = setTimeout(async () => {
      if (this.conns.size === 0) {
        await this._unload();
      }
    }, DOC_IDLE_TTL_MS);
  }

  _clearIdleTimer() {
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
  }

  private async _unload() {
    if (this.snapshotTimer) clearTimeout(this.snapshotTimer);
    this._clearIdleTimer();
    await updateStore.flushToDB(this.documentId, this);
    if (PUBSUB_ENABLED && clusterBus) {
      await clusterBus.leave(this.documentId);
    }
    this.awareness.destroy();
    super.destroy();
    docs.delete(this.publicId);
    Metrics.activeDocuments.dec();
    log.info({ publicId: this.publicId, type: 'doc_unload' }, `Unloaded idle doc ${this.publicId}`);
  }

  async shutdown() {
    if (this.snapshotTimer) clearTimeout(this.snapshotTimer);
    this._clearIdleTimer();
    await updateStore.flushToDB(this.documentId, this);
    if (PUBSUB_ENABLED && clusterBus) {
      await clusterBus.leave(this.documentId);
    }
    this.awareness.destroy();
    super.destroy();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOrLoadDoc(publicId: string, documentId: string): Promise<WSSharedDoc> {
  if (docs.has(publicId)) {
    const existing = docs.get(publicId)!;
    existing._clearIdleTimer();
    return existing;
  }

  const doc = new WSSharedDoc(publicId, documentId);
  docs.set(publicId, doc);
  await doc.load();

  // Subscribe to cross-instance channels for this document
  if (PUBSUB_ENABLED && clusterBus) {
    await clusterBus.join(documentId);
  }

  return doc;
}

function send(doc: WSSharedDoc, conn: ws.WebSocket, m: Uint8Array) {
  if (conn.readyState !== ws.OPEN && conn.readyState !== ws.CONNECTING) {
    closeConn(doc, conn);
    return;
  }
  try {
    conn.send(m, (err) => { if (err) closeConn(doc, conn); });
  } catch {
    closeConn(doc, conn);
  }
}

function closeConn(doc: WSSharedDoc, conn: ws.WebSocket) {
  if (!doc.conns.has(conn)) return;

  const controlled = doc.conns.get(conn) ?? new Set<number>();
  doc.conns.delete(conn);
  awarenessProtocol.removeAwarenessStates(doc.awareness, [...controlled], null);

  if (doc.conns.size === 0) {
    doc.scheduleIdleUnload();
    // ClusterBus.leave() is called inside scheduleIdleUnload → _unload
  }

  conn.close();
}

function rejectConnection(conn: ws.WebSocket, reason: string) {
  log.warn({ reason, type: 'ws_rejected' }, `WS rejected: ${reason}`);
  Metrics.wsConnectionsTotal.labels('rejected').inc();
  conn.close(1008, reason);
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function verifyToken(token: string): JwtPayload {
  return verify(token, JWT_SECRET as string) as JwtPayload;
}

async function resolveDocumentId(publicId: string): Promise<string | null> {
  if (docIdCache.has(publicId)) return docIdCache.get(publicId)!;
  const row = await documentRepo.findOne({ where: { publicId }, select: ['id'] });
  if (!row) return null;
  docIdCache.set(publicId, row.id);
  return row.id;
}

async function validateAccess(userId: string, tokenVer: number, documentId: string) {
  return userRepo
    .createQueryBuilder('u')
    .select('u.token_version', 'tokenVersion')
    .addSelect('p.role', 'role')
    .leftJoin(
      'document_permissions', 'p',
      'p.user_id = u.id AND p.document_id = :docId',
      { docId: documentId },
    )
    .where('u.id = :userId', { userId })
    .getRawOne<{ tokenVersion: number; role: DocumentRole | null }>();
}

// ---------------------------------------------------------------------------
// Connection handler
// ---------------------------------------------------------------------------

async function handleConnection(conn: ws.WebSocket, req: http.IncomingMessage) {
  const url      = new URL(req.url ?? '', `http://${req.headers.host}`);
  const publicId = url.searchParams.get('doc');
  const token    = url.searchParams.get('token');

  if (!publicId || !token) return rejectConnection(conn, 'Missing doc or token');

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    if (err instanceof TokenExpiredError) return rejectConnection(conn, 'Token expired');
    if (err instanceof JsonWebTokenError) return rejectConnection(conn, 'Invalid token');
    return rejectConnection(conn, 'Auth error');
  }

  const { sub: userId, email, ver: tokenVer } = payload;

  const documentId = await resolveDocumentId(publicId);
  if (!documentId) return rejectConnection(conn, 'Document not found');

  const access = await validateAccess(userId, tokenVer, documentId);
  if (!access)                          return rejectConnection(conn, 'User not found');
  if (access.tokenVersion !== tokenVer) return rejectConnection(conn, 'Token revoked');
  if (!access.role)                     return rejectConnection(conn, 'No access to document');

  const role     = access.role;
  const readOnly = ROLE_HIERARCHY[role] < ROLE_HIERARCHY[DocumentRole.EDITOR];

  console.log(`✓ ${email} → ${publicId} [${role}${readOnly ? ', ro' : ''}] (srv:${SERVER_ID.slice(0, 8)})`);
  log.info({ userId, email, publicId, role, readOnly, type: 'ws_connect' }, `${email} connected to ${publicId}`);
  conn.binaryType = 'arraybuffer';
  const doc = await getOrLoadDoc(publicId, documentId);
  doc.conns.set(conn, new Set());

  Metrics.wsConnections.inc();
  Metrics.wsConnectionsTotal.labels('accepted').inc();

  // Sync step 1
  const syncEnc = encoding.createEncoder();
  encoding.writeVarUint(syncEnc, messageSync);
  syncProtocol.writeSyncStep1(syncEnc, doc);
  send(doc, conn, encoding.toUint8Array(syncEnc));

  // Current awareness states
  const awarenessStates = doc.awareness.getStates();
  if (awarenessStates.size > 0) {
    const awEnc = encoding.createEncoder();
    encoding.writeVarUint(awEnc, messageAwareness);
    encoding.writeVarUint8Array(
      awEnc,
      awarenessProtocol.encodeAwarenessUpdate(doc.awareness, [...awarenessStates.keys()]),
    );
    send(doc, conn, encoding.toUint8Array(awEnc));
  }

  // Periodic re-validation
  const revalidationTimer = setInterval(async () => {
    try {
      const recheck = await validateAccess(userId, tokenVer, documentId);
      if (!recheck || recheck.tokenVersion !== tokenVer || !recheck.role) {
        console.warn(`⚠ Revoking ${email} on ${publicId}`);
        log.warn({ userId, email, publicId, type: 'ws_revoked' }, `Session revoked for ${email}`);
        clearInterval(revalidationTimer);
        closeConn(doc, conn);
      }
    } catch { /* retry next tick */ }
  }, REVALIDATION_INTERVAL_MS);

  const meta: ConnMeta = { userId, email, documentId, publicId, role, readOnly, revalidationTimer };
  (conn as any).__meta = meta;

  conn.on('message', (message: ArrayBuffer) => {
    try {
      const bytes   = new Uint8Array(message);
      const peek    = decoding.createDecoder(bytes);
      const msgType = decoding.readVarUint(peek);

      if (msgType === messageSync) {
        const subType = decoding.readVarUint(peek);
        if ((subType === 1 || subType === 2) && readOnly) return;

        Metrics.wsMessagesTotal.labels('sync').inc();
        const dec = decoding.createDecoder(bytes);
        decoding.readVarUint(dec);
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, messageSync);
        syncProtocol.readSyncMessage(dec, enc, doc, conn);
        if (encoding.length(enc) > 1) send(doc, conn, encoding.toUint8Array(enc));

      } else if (msgType === messageAwareness) {
        Metrics.wsMessagesTotal.labels('awareness').inc();
        const update = decoding.readVarUint8Array(peek);
        awarenessProtocol.applyAwarenessUpdate(doc.awareness, update, conn);
      }
    } catch (err) {
      log.error({ err, type: 'ws_message_error' }, 'Message processing error');
    }
  });

  conn.on('close', () => {
    clearInterval(revalidationTimer);
    closeConn(doc, conn);
    Metrics.wsConnections.dec();
    log.info({ userId, email, publicId, type: 'ws_disconnect' }, `${email} disconnected from ${publicId}`);
  });

  conn.on('error', (err) => {
    log.error({ err, userId, email, publicId, type: 'ws_error' }, `WS error (${email})`);
    clearInterval(revalidationTimer);
    closeConn(doc, conn);
  });
}

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------

function makeRedisClient(): Redis {
  return new Redis({
    host:          process.env.REDIS_HOST     || 'localhost',
    port:          parseInt(process.env.REDIS_PORT || '6379', 10),
    password:      process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => Math.min(times * 200, 10_000),
    lazyConnect:   true,
  });
}

async function initRedis(): Promise<{ pub: Redis; sub: Redis }> {
  const pub = makeRedisClient();
  const sub = makeRedisClient(); // separate connection required for subscribe mode

  await Promise.all([pub.connect(), sub.connect()]);
  log.info({ type: 'redis_connect' }, 'Redis connected (pub + sub)');
  return { pub, sub };
}

async function initDatabase(): Promise<DataSource> {
  const ds = new DataSource({
    type:     'postgres',
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'sharespace',
    entities: [Document, DocumentSnapshot, DocumentPermission, User],
    synchronize: false,
  });
  await ds.initialize();
  log.info({ type: 'db_connect' }, 'Database connected');
  return ds;
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string) {
  log.info({ signal, activeDocs: docs.size, type: 'shutdown' }, `${signal} received — flushing docs`);

  await Promise.allSettled([...docs.values()].map((d) => d.shutdown()));

  await clusterBus?.destroy();
  await redis?.quit();
  await dataSource?.destroy();

  log.info({ type: 'shutdown_complete' }, 'Shutdown complete');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function startServer() {
  const { pub, sub } = await initRedis();
  redis      = pub;
  dataSource = await initDatabase();

  userRepo     = dataSource.getRepository(User);
  documentRepo = dataSource.getRepository(Document);
  updateStore  = new UpdateStore(redis, dataSource);

  if (PUBSUB_ENABLED) {
    clusterBus = new ClusterBus(
      pub,
      sub,
      SERVER_ID,
      // DocResolver: given a documentId, return the live doc if loaded
      (documentId) => {
        for (const doc of docs.values()) {
          if (doc.documentId === documentId) {
            return { ydoc: doc, awareness: doc.awareness };
          }
        }
        return undefined;
      },
    );
    console.log(`✓ ClusterBus enabled  SERVER_ID=${SERVER_ID.slice(0, 8)}…`);
    log.info({ serverId: SERVER_ID, type: 'cluster_bus_enabled' }, 'ClusterBus enabled');
  } else {
    log.info({ type: 'cluster_bus_disabled' }, 'ClusterBus disabled (REDIS_PUBSUB_ENABLED=false)');
  }

  const server = http.createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Yjs WebSocket Server');
  });

  const wss = new ws.Server({ server });
  wss.on('connection', (conn, req) => {
    handleConnection(conn, req).catch((err) => {
      log.error({ err, type: 'handle_connection_error' }, 'handleConnection error');
      conn.close(1011, 'Internal server error');
    });
  });

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  server.listen(PORT, () => {
    log.info({ port: PORT, serverId: SERVER_ID }, `🔌 Yjs WS Server  ws://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  log.fatal({ err, type: 'startup_error' }, 'Failed to start Yjs server');
  process.exit(1);
});
