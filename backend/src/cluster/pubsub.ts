/**
 * ClusterBus — Redis Pub/Sub bridge for horizontal Yjs scaling
 *
 * Each Yjs server instance has a unique SERVER_ID (UUID or env var).
 *
 * Wire protocol (binary, over Redis channel bytes):
 *
 *   [ 1 byte  ] message kind  (0 = doc update, 1 = awareness update)
 *   [ 36 bytes] sender SERVER_ID (ASCII UUID, fixed width)
 *   [ N bytes ] payload
 *
 * Channel naming:
 *   yjs:doc:<documentId>        — Yjs CRDT updates
 *   yjs:awareness:<documentId>  — awareness (presence) updates
 *
 * Loop prevention:
 *   Receiver checks sender ID. If it matches this instance → skip.
 *   Yjs CRDTs are idempotent so duplicate delivery is safe, but we
 *   avoid it anyway to save CPU.
 *
 * Subscription lifecycle:
 *   subscribe(documentId)   — called when first local connection opens
 *   unsubscribe(documentId) — called when last local connection closes
 *   A ref-count per documentId prevents premature unsubscription when
 *   multiple local connections share the same document.
 */

import Redis from 'ioredis';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KIND_DOC       = 0;
const KIND_AWARENESS = 1;
const SENDER_ID_LEN  = 36; // UUID string length

// ---------------------------------------------------------------------------
// Channel helpers
// ---------------------------------------------------------------------------

export const docChannel       = (docId: string) => `yjs:doc:${docId}`;
export const awarenessChannel = (docId: string) => `yjs:awareness:${docId}`;

// ---------------------------------------------------------------------------
// Message encoding / decoding
// ---------------------------------------------------------------------------

function encodeMessage(kind: number, senderId: string, payload: Uint8Array): Buffer {
  const senderBytes = Buffer.from(senderId.padEnd(SENDER_ID_LEN, ' '), 'ascii');
  const out = Buffer.allocUnsafe(1 + SENDER_ID_LEN + payload.byteLength);
  out[0] = kind;
  senderBytes.copy(out, 1);
  Buffer.from(payload).copy(out, 1 + SENDER_ID_LEN);
  return out;
}

interface DecodedMessage {
  kind: number;
  senderId: string;
  payload: Buffer;
}

function decodeMessage(raw: Buffer): DecodedMessage | null {
  if (raw.byteLength < 1 + SENDER_ID_LEN) return null;
  return {
    kind:     raw[0],
    senderId: raw.slice(1, 1 + SENDER_ID_LEN).toString('ascii').trimEnd(),
    payload:  raw.slice(1 + SENDER_ID_LEN),
  };
}

// ---------------------------------------------------------------------------
// ClusterBus
// ---------------------------------------------------------------------------

export type DocResolver = (documentId: string) => {
  ydoc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
} | undefined;

export class ClusterBus {
  private readonly pub: Redis;
  private readonly sub: Redis;
  private readonly serverId: string;
  private readonly resolveDoc: DocResolver;

  /** documentId → number of local connections subscribed */
  private readonly refCounts = new Map<string, number>();

  /** documentId → set of channels currently subscribed */
  private readonly subscribedDocs = new Set<string>();

  constructor(pub: Redis, sub: Redis, serverId: string, resolveDoc: DocResolver) {
    this.pub        = pub;
    this.sub        = sub;
    this.serverId   = serverId;
    this.resolveDoc = resolveDoc;

    this.sub.on('messageBuffer', this._onMessage.bind(this));
  }

  // -------------------------------------------------------------------------
  // Subscription management
  // -------------------------------------------------------------------------

  /** Increment ref-count; subscribe channels on first local connection. */
  async join(documentId: string): Promise<void> {
    const count = (this.refCounts.get(documentId) ?? 0) + 1;
    this.refCounts.set(documentId, count);

    if (!this.subscribedDocs.has(documentId)) {
      await this.sub.subscribe(
        docChannel(documentId),
        awarenessChannel(documentId),
      );
      this.subscribedDocs.add(documentId);
    }
  }

  /** Decrement ref-count; unsubscribe when no local connections remain. */
  async leave(documentId: string): Promise<void> {
    const count = (this.refCounts.get(documentId) ?? 1) - 1;

    if (count <= 0) {
      this.refCounts.delete(documentId);
      this.subscribedDocs.delete(documentId);
      await this.sub.unsubscribe(
        docChannel(documentId),
        awarenessChannel(documentId),
      );
    } else {
      this.refCounts.set(documentId, count);
    }
  }

  // -------------------------------------------------------------------------
  // Publish
  // -------------------------------------------------------------------------

  /** Publish a Yjs CRDT update to all other instances. */
  publishDocUpdate(documentId: string, update: Uint8Array): void {
    const msg = encodeMessage(KIND_DOC, this.serverId, update);
    this.pub.publish(docChannel(documentId), msg).catch((err) =>
      console.error(`[ClusterBus] publish doc failed (${documentId}):`, err),
    );
  }

  /** Publish an awareness update to all other instances. */
  publishAwareness(documentId: string, update: Uint8Array): void {
    const msg = encodeMessage(KIND_AWARENESS, this.serverId, update);
    this.pub.publish(awarenessChannel(documentId), msg).catch((err) =>
      console.error(`[ClusterBus] publish awareness failed (${documentId}):`, err),
    );
  }

  // -------------------------------------------------------------------------
  // Receive
  // -------------------------------------------------------------------------

  private _onMessage(channel: Buffer, rawMsg: Buffer): void {
    const channelStr = channel.toString();
    const decoded = decodeMessage(rawMsg);
    if (!decoded) return;

    // Loop prevention — skip messages we published ourselves
    if (decoded.senderId === this.serverId) return;

    // Extract documentId from channel name
    const docId = this._docIdFromChannel(channelStr);
    if (!docId) return;

    const entry = this.resolveDoc(docId);
    if (!entry) return; // doc not loaded on this instance — ignore

    if (decoded.kind === KIND_DOC) {
      this._applyDocUpdate(entry.ydoc, decoded.payload);
    } else if (decoded.kind === KIND_AWARENESS) {
      this._applyAwareness(entry.awareness, decoded.payload);
    }
  }

  private _applyDocUpdate(ydoc: Y.Doc, payload: Buffer): void {
    try {
      // Use a sentinel origin so WSSharedDoc._onUpdate knows NOT to
      // re-publish this update back to Redis pub/sub (loop guard)
      Y.applyUpdate(ydoc, new Uint8Array(payload), 'cluster-bus');
    } catch (err) {
      console.error('[ClusterBus] applyUpdate failed:', err);
    }
  }

  private _applyAwareness(
    awareness: awarenessProtocol.Awareness,
    payload: Buffer,
  ): void {
    try {
      awarenessProtocol.applyAwarenessUpdate(
        awareness,
        new Uint8Array(payload),
        'cluster-bus', // sentinel origin
      );
    } catch (err) {
      console.error('[ClusterBus] applyAwareness failed:', err);
    }
  }

  private _docIdFromChannel(channel: string): string | null {
    // yjs:doc:<id>  or  yjs:awareness:<id>
    const docMatch = channel.match(/^yjs:doc:(.+)$/);
    if (docMatch) return docMatch[1];
    const awMatch = channel.match(/^yjs:awareness:(.+)$/);
    if (awMatch) return awMatch[1];
    return null;
  }

  async destroy(): Promise<void> {
    await this.sub.unsubscribe();
  }
}
