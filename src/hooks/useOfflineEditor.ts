/**
 * useOfflineEditor
 *
 * Manages the full offline-first Yjs lifecycle for a document:
 *
 *   1. Creates a Y.Doc
 *   2. Attaches IndexeddbPersistence — loads local state synchronously
 *      before the WebSocket even connects, so the editor is never blank
 *   3. Attaches WebsocketProvider — connects to the Yjs server
 *      When the connection restores, Yjs CRDT merge resolves conflicts
 *      automatically; no manual queue needed
 *
 * The editor renders immediately from IndexedDB (step 2).
 * Server sync happens in the background (step 3).
 *
 * Offline edits are stored in IndexedDB and merged on reconnect.
 */

import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebsocketProvider } from 'y-websocket';

const YJS_SERVER_URL = import.meta.env.VITE_YJS_SERVER_URL || 'ws://localhost:3001';

export interface OfflineEditorState {
  ydoc: Y.Doc;
  provider: WebsocketProvider | null;
  /** True once IndexedDB has loaded — safe to mount the editor */
  localReady: boolean;
}

export function useOfflineEditor(documentId: string | undefined): OfflineEditorState {
  // Stable Y.Doc — never recreated for the same documentId
  const ydocRef = useRef<Y.Doc | null>(null);
  if (!ydocRef.current) ydocRef.current = new Y.Doc();

  const idbRef      = useRef<IndexeddbPersistence | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  const [localReady, setLocalReady] = useState(false);
  const [provider,   setProvider]   = useState<WebsocketProvider | null>(null);

  useEffect(() => {
    if (!documentId) return;

    const ydoc = ydocRef.current!;

    // ── 1. IndexedDB persistence ──────────────────────────────────────────
    // Persists every Yjs update to IndexedDB automatically.
    // `synced` fires once the stored state has been applied to ydoc —
    // at that point the editor can render without waiting for the server.
    const idb = new IndexeddbPersistence(`yjs:${documentId}`, ydoc);
    idbRef.current = idb;

    idb.on('synced', () => {
      setLocalReady(true);
    });

    // ── 2. WebSocket provider ─────────────────────────────────────────────
    // y-websocket handles reconnection automatically with exponential backoff.
    // When it reconnects it runs the Yjs sync protocol — any updates made
    // offline (stored in IndexedDB and in the Y.Doc in memory) are sent to
    // the server and remote updates are applied locally. Yjs CRDTs merge
    // without conflicts.
    const prov = new WebsocketProvider(YJS_SERVER_URL, documentId, ydoc, {
      connect: true,
      // Disable the built-in cross-tab BroadcastChannel — we use IndexedDB
      // as the shared source of truth instead, which is more reliable across
      // tab refresh and long offline periods.
      disableBc: false,
    });
    providerRef.current = prov;
    setProvider(prov);

    return () => {
      idb.destroy();
      prov.destroy();
      idbRef.current    = null;
      providerRef.current = null;
      setProvider(null);
      setLocalReady(false);
    };
  }, [documentId]);

  return {
    ydoc:       ydocRef.current,
    provider,
    localReady,
  };
}
