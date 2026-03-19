/**
 * useOfflineEditor
 *
 * Manages the full offline-first Yjs lifecycle for a document:
 *
 *   1. Creates a Y.Doc
 *   2. Attaches IndexeddbPersistence — loads local state before WS connects
 *   3. Attaches WebsocketProvider — connects to the Yjs server with JWT auth
 *
 * The Yjs server expects: ws://host?doc=<publicId>&token=<accessJwt>
 * Close code 1008 = policy violation (auth rejected) — stop retrying.
 */

import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebsocketProvider } from 'y-websocket';
import { getStoredAccessToken } from '../contexts/auth-token';

const YJS_SERVER_URL = import.meta.env.VITE_YJS_SERVER_URL || 'ws://localhost:3001';

// Close codes that mean "don't retry" — auth errors, policy violations
const PERMANENT_CLOSE_CODES = new Set([1008, 1003, 4001, 4003, 4004]);

export interface OfflineEditorState {
  ydoc: Y.Doc;
  provider: WebsocketProvider | null;
  /** True once IndexedDB has loaded — safe to mount the editor */
  localReady: boolean;
  /** Set when the server permanently rejects the connection */
  wsError: string | null;
}

export function useOfflineEditor(documentId: string | undefined): OfflineEditorState {
  const ydocRef = useRef<Y.Doc | null>(null);
  if (!ydocRef.current) ydocRef.current = new Y.Doc();

  const idbRef      = useRef<IndexeddbPersistence | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  const [localReady, setLocalReady] = useState(false);
  const [provider,   setProvider]   = useState<WebsocketProvider | null>(null);
  const [wsError,    setWsError]    = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;

    const ydoc  = ydocRef.current!;
    const token = getStoredAccessToken();

    setWsError(null);

    // ── 1. IndexedDB persistence ──────────────────────────────────────────
    const idb = new IndexeddbPersistence(`yjs:${documentId}`, ydoc);
    idbRef.current = idb;
    idb.on('synced', () => setLocalReady(true));

    // ── 2. WebSocket provider ─────────────────────────────────────────────
    const prov = new WebsocketProvider(
      YJS_SERVER_URL,
      documentId,
      ydoc,
      {
        connect: !!token,
        disableBc: false,
        // Pass auth params — server reads these from the query string
        params: token ? { doc: documentId, token } : {},
      },
    );
    providerRef.current = prov;
    setProvider(prov);

    // Stop retrying on permanent server rejections (auth errors = code 1008)
    const onClose = (event: CloseEvent) => {
      if (PERMANENT_CLOSE_CODES.has(event.code)) {
        console.warn(`[Yjs] WS closed permanently (code ${event.code}): ${event.reason}`);
        prov.disconnect();
        setWsError(event.reason || `Connection rejected (${event.code})`);
      }
    };

    // y-websocket fires 'connection-close' with the CloseEvent
    prov.on('connection-close', onClose);

    return () => {
      prov.off('connection-close', onClose);
      idb.destroy();
      prov.destroy();
      idbRef.current      = null;
      providerRef.current = null;
      setProvider(null);
      setLocalReady(false);
      setWsError(null);
    };
  }, [documentId]);

  return {
    ydoc:      ydocRef.current,
    provider,
    localReady,
    wsError,
  };
}
