import * as Y from 'yjs';
import * as ws from 'ws';
import * as http from 'http';
import * as map from 'lib0/map';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import { DataSource } from 'typeorm';
import { Document } from './modules/document/entities/document.entity';
import { DocumentSnapshot } from './modules/document/entities/document-snapshot.entity';

const PORT = parseInt(process.env.YJS_PORT || '3001', 10);
const SNAPSHOT_INTERVAL = parseInt(
  process.env.SNAPSHOT_INTERVAL_MS || '30000',
  10,
);

// Message types
const messageSync = 0;
const messageAwareness = 1;

// Document storage
const docs = new Map<string, WSSharedDoc>();

// Database connection
let dataSource: DataSource;

class WSSharedDoc extends Y.Doc {
  name: string;
  conns: Map<ws.WebSocket, Set<number>>;
  awareness: awarenessProtocol.Awareness;
  lastSaved: number;
  snapshotTimer: NodeJS.Timeout | null;

  constructor(name: string) {
    super({ gc: true });
    this.name = name;
    this.conns = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);
    this.lastSaved = Date.now();
    this.snapshotTimer = null;

    this.awareness.on('update', this.awarenessChangeHandler.bind(this));
    this.on('update', this.updateHandler.bind(this));
  }

  awarenessChangeHandler({ added, updated, removed }: any, conn: any) {
    const changedClients = added.concat(updated, removed);
    if (conn !== null) {
      const connControlledIDs =
        this.conns.get(conn) || new Set<number>();
      if (added.length > 0) {
        added.forEach((clientID: number) =>
          connControlledIDs.add(clientID),
        );
      }
      if (removed.length > 0) {
        removed.forEach((clientID: number) =>
          connControlledIDs.delete(clientID),
        );
      }
    }

    // Broadcast awareness changes
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
    );
    const buff = encoding.toUint8Array(encoder);

    this.conns.forEach((_, c) => {
      send(this, c, buff);
    });
  }

  updateHandler(update: Uint8Array, origin: any) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);

    this.conns.forEach((_, conn) => {
      send(this, conn, message);
    });

    // Schedule snapshot if enough time has passed
    if (Date.now() - this.lastSaved > SNAPSHOT_INTERVAL) {
      this.scheduleSnapshot();
    }
  }

  scheduleSnapshot() {
    if (this.snapshotTimer) {
      clearTimeout(this.snapshotTimer);
    }

    this.snapshotTimer = setTimeout(async () => {
      await this.saveToDatabase();
      this.lastSaved = Date.now();
    }, 5000); // Debounce: wait 5s after last update
  }

  async saveToDatabase() {
    if (!dataSource || !dataSource.isInitialized) {
      console.warn('Database not initialized, skipping save');
      return;
    }

    try {
      const documentRepo = dataSource.getRepository(Document);
      const document = await documentRepo.findOne({
        where: { publicId: this.name },
      });

      if (!document) {
        console.warn(`Document ${this.name} not found in database`);
        return;
      }

      const state = Y.encodeStateAsUpdate(this);
      await documentRepo.update(document.id, {
        yjsState: Buffer.from(state),
        updatedAt: new Date(),
      });

      console.log(`✓ Saved document ${this.name} to database`);
    } catch (error) {
      console.error(`Failed to save document ${this.name}:`, error);
    }
  }

  async loadFromDatabase() {
    if (!dataSource || !dataSource.isInitialized) {
      console.warn('Database not initialized, skipping load');
      return;
    }

    try {
      const documentRepo = dataSource.getRepository(Document);
      const document = await documentRepo.findOne({
        where: { publicId: this.name },
      });

      if (!document || !document.yjsState) {
        console.log(`No saved state for document ${this.name}`);
        return;
      }

      Y.applyUpdate(this, new Uint8Array(document.yjsState));
      console.log(`✓ Loaded document ${this.name} from database`);
    } catch (error) {
      console.error(`Failed to load document ${this.name}:`, error);
    }
  }

  destroy() {
    if (this.snapshotTimer) {
      clearTimeout(this.snapshotTimer);
    }
    this.saveToDatabase(); // Final save
    this.awareness.destroy();
    super.destroy();
  }
}

function getYDoc(docname: string, gc: boolean = true): WSSharedDoc {
  return map.setIfUndefined(docs, docname, () => {
    const doc = new WSSharedDoc(docname);
    doc.loadFromDatabase();
    return doc;
  });
}

function send(doc: WSSharedDoc, conn: ws.WebSocket, m: Uint8Array) {
  if (
    conn.readyState !== ws.OPEN &&
    conn.readyState !== ws.CONNECTING
  ) {
    closeConn(doc, conn);
  } else {
    try {
      conn.send(m, (err) => {
        if (err) {
          closeConn(doc, conn);
        }
      });
    } catch (e) {
      closeConn(doc, conn);
    }
  }
}

function closeConn(doc: WSSharedDoc, conn: ws.WebSocket) {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(
      doc.awareness,
      Array.from(controlledIds || []),
      null,
    );

    // If no more connections, schedule cleanup
    if (doc.conns.size === 0) {
      setTimeout(() => {
        if (doc.conns.size === 0) {
          doc.destroy();
          docs.delete(doc.name);
          console.log(`✓ Cleaned up document ${doc.name}`);
        }
      }, 30000); // Keep in memory for 30s after last disconnect
    }
  }
  conn.close();
}

function setupWSConnection(
  conn: ws.WebSocket,
  req: http.IncomingMessage,
  docName: string,
) {
  conn.binaryType = 'arraybuffer';
  const doc = getYDoc(docName, true);
  doc.conns.set(conn, new Set());

  // Send sync step 1
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, doc);
  send(doc, conn, encoding.toUint8Array(encoder));

  // Send awareness states
  const awarenessStates = doc.awareness.getStates();
  if (awarenessStates.size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        doc.awareness,
        Array.from(awarenessStates.keys()),
      ),
    );
    send(doc, conn, encoding.toUint8Array(encoder));
  }

  // Handle incoming messages
  conn.on('message', (message: ArrayBuffer) => {
    try {
      const encoder = encoding.createEncoder();
      const decoder = decoding.createDecoder(new Uint8Array(message));
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case messageSync:
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
          if (encoding.length(encoder) > 1) {
            send(doc, conn, encoding.toUint8Array(encoder));
          }
          break;
        case messageAwareness:
          awarenessProtocol.applyAwarenessUpdate(
            doc.awareness,
            decoding.readVarUint8Array(decoder),
            conn,
          );
          break;
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  conn.on('close', () => {
    closeConn(doc, conn);
  });

  conn.on('error', (err) => {
    console.error('WebSocket error:', err);
    closeConn(doc, conn);
  });
}

async function initDatabase() {
  dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'sharespace',
    entities: [Document, DocumentSnapshot],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✓ Database connected');
}

async function startServer() {
  await initDatabase();

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Yjs WebSocket Server');
  });

  const wss = new ws.Server({ server });

  wss.on('connection', (conn, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    
    // y-websocket sends document name in the path: /documentId
    // Extract it from the path
    const pathParts = url.pathname.split('/').filter(Boolean);
    const docName = pathParts[0] || url.searchParams.get('doc');

    console.log('📥 WebSocket connection attempt');
    console.log('   URL:', req.url);
    console.log('   Document:', docName);

    if (!docName) {
      console.log('❌ No document name provided, closing connection');
      conn.close();
      return;
    }

    console.log(`✓ Client connected to document: ${docName}`);
    setupWSConnection(conn, req, docName);
  });

  server.listen(PORT, () => {
    console.log(`🔌 Yjs WebSocket Server running on ws://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Yjs server:', err);
  process.exit(1);
});
