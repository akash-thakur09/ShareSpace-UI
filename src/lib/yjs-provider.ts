import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const YJS_SERVER_URL = import.meta.env.VITE_YJS_SERVER_URL || 'ws://localhost:3001';

export function createYjsProvider(documentId: string) {
  const ydoc = new Y.Doc();
  
  console.log('🔌 Creating Yjs provider for document:', documentId);
  console.log('🔌 WebSocket URL:', YJS_SERVER_URL);
  
  const provider = new WebsocketProvider(
    YJS_SERVER_URL,
    documentId,
    ydoc
  );

  provider.on('status', ({ status }: { status: string }) => {
    console.log('🔌 Yjs WebSocket status:', status);
  });

  provider.on('sync', (isSynced: boolean) => {
    console.log('🔌 Yjs sync status:', isSynced ? 'SYNCED ✅' : 'NOT SYNCED ❌');
    console.log('🔌 Provider.doc:', provider.doc);
    console.log('🔌 Ydoc:', ydoc);
  });

  provider.on('connection-close', (event: any) => {
    console.error('🔌 WebSocket connection closed:', event);
  });

  provider.on('connection-error', (event: any) => {
    console.error('🔌 WebSocket connection error:', event);
  });

  // Log when document updates
  ydoc.on('update', () => {
    console.log('📝 Document updated');
  });

  return { ydoc, provider };
}
