# Frontend Integration Guide

This guide explains how to integrate the ShareSpace backend with your React + TipTap frontend.

## Overview

The frontend needs to:
1. Replace Fluid Framework with Yjs
2. Connect to the Yjs WebSocket server
3. Use TipTap's Yjs collaboration extensions
4. Call REST APIs for document management

## Installation

```bash
cd ../  # Go to frontend root
npm install yjs y-websocket @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor
```

## Step 1: Remove Fluid Framework

Remove these dependencies:
```bash
npm uninstall @fluidframework/azure-client @fluidframework/test-client-utils @fluidframework/test-runtime-utils fluid-framework
```

## Step 2: Create Yjs Provider

Create `src/lib/yjs-provider.ts`:

```typescript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const YJS_SERVER_URL = import.meta.env.VITE_YJS_SERVER_URL || 'ws://localhost:3001';

export function createYjsProvider(documentId: string) {
  const ydoc = new Y.Doc();
  
  const provider = new WebsocketProvider(
    YJS_SERVER_URL,
    documentId,
    ydoc,
    {
      connect: true,
      params: {
        doc: documentId,
      },
    }
  );

  return { ydoc, provider };
}
```

## Step 3: Create Document Service

Create `src/services/document.service.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface Document {
  publicId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface CreateDocumentDto {
  title?: string;
  metadata?: Record<string, any>;
}

export const documentService = {
  async create(dto: CreateDocumentDto = {}): Promise<Document> {
    const response = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create document');
    }
    
    return response.json();
  },

  async get(publicId: string): Promise<Document> {
    const response = await fetch(`${API_URL}/documents/${publicId}`);
    
    if (!response.ok) {
      throw new Error('Document not found');
    }
    
    return response.json();
  },

  async update(publicId: string, dto: Partial<CreateDocumentDto>): Promise<Document> {
    const response = await fetch(`${API_URL}/documents/${publicId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update document');
    }
    
    return response.json();
  },

  async createSnapshot(publicId: string) {
    const response = await fetch(`${API_URL}/documents/${publicId}/snapshots`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to create snapshot');
    }
    
    return response.json();
  },

  async getSnapshots(publicId: string) {
    const response = await fetch(`${API_URL}/documents/${publicId}/snapshots`);
    
    if (!response.ok) {
      throw new Error('Failed to get snapshots');
    }
    
    return response.json();
  },
};
```

## Step 4: Update EditorCanvas Component

Replace `src/features/editor/EditorCanvas.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { useParams } from 'react-router-dom';
import { createYjsProvider } from '../../lib/yjs-provider';
import { EditorToolbar } from './EditorToolbar';
import { EditorHeader } from './EditorHeader';
import { DocumentSidebar } from './DocumentSidebar';

export function EditorCanvas() {
  const { documentId } = useParams<{ documentId: string }>();
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    if (!documentId) return;

    const { ydoc, provider: yjsProvider } = createYjsProvider(documentId);
    setProvider(yjsProvider);

    return () => {
      yjsProvider.destroy();
      ydoc.destroy();
    };
  }, [documentId]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Yjs handles history
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-sm border border-slate-700',
          },
        },
      }),
      Collaboration.configure({
        document: provider?.document,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name: 'Anonymous',
          color: '#' + Math.floor(Math.random() * 16777215).toString(16),
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-slate max-w-none focus:outline-none min-h-full px-8 py-6',
      },
    },
  }, [provider]);

  if (!editor || !provider) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
          <p className="text-sm text-slate-400">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-950">
      <EditorHeader />
      <EditorToolbar editor={editor} />
      <div className="flex flex-1 overflow-hidden">
        <DocumentSidebar />
        <main className="flex-1 overflow-y-auto bg-slate-950">
          <div className="mx-auto max-w-4xl py-8">
            <EditorContent editor={editor} />
          </div>
        </main>
      </div>
    </div>
  );
}
```

## Step 5: Update Routes

Update `src/app/routes.tsx`:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import App from './App';
import { documentService } from '../services/document.service';

function Home() {
  const [loading, setLoading] = useState(true);
  const [documentId, setDocumentId] = useState<string | null>(null);

  useEffect(() => {
    async function createDocument() {
      try {
        const doc = await documentService.create({
          title: 'Untitled Document',
        });
        setDocumentId(doc.publicId);
      } catch (error) {
        console.error('Failed to create document:', error);
      } finally {
        setLoading(false);
      }
    }

    createDocument();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-slate-400">Creating document...</div>
      </div>
    );
  }

  if (documentId) {
    return <Navigate to={`/doc/${documentId}`} replace />;
  }

  return <div>Error creating document</div>;
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/doc/:documentId" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## Step 6: Environment Variables

Create `.env` in frontend root:

```env
VITE_API_URL=http://localhost:4000
VITE_YJS_SERVER_URL=ws://localhost:3001
```

## Step 7: Remove Old Files

Delete these files (no longer needed):
- `src/fluid/container.ts`
- `src/fluid/schema.ts`
- `src/services/websocket.ts`
- `src/features/document/document.service.ts` (replaced with new one)

## Testing the Integration

1. Start backend servers:
```bash
cd backend
npm run dev:api  # Terminal 1
npm run dev:yjs  # Terminal 2
```

2. Start frontend:
```bash
cd ..  # Frontend root
npm run dev
```

3. Open http://localhost:3000
4. Open the same URL in another browser/tab
5. Type in one editor - see it appear in the other!

## Awareness (User Presence)

The `CollaborationCursor` extension automatically handles:
- Showing other users' cursors
- Displaying user names
- Color-coding each user

To customize user info:

```typescript
CollaborationCursor.configure({
  provider: provider,
  user: {
    name: currentUser.name,
    color: currentUser.color,
    avatar: currentUser.avatar,
  },
})
```

## Document Title Sync

To sync document title changes:

```typescript
import { documentService } from '../services/document.service';

// In your component
const handleTitleChange = async (newTitle: string) => {
  if (!documentId) return;
  
  try {
    await documentService.update(documentId, { title: newTitle });
  } catch (error) {
    console.error('Failed to update title:', error);
  }
};
```

## Snapshots / Version History

To create a snapshot:

```typescript
const handleCreateSnapshot = async () => {
  if (!documentId) return;
  
  try {
    const snapshot = await documentService.createSnapshot(documentId);
    console.log('Snapshot created:', snapshot);
  } catch (error) {
    console.error('Failed to create snapshot:', error);
  }
};
```

To list snapshots:

```typescript
const [snapshots, setSnapshots] = useState([]);

useEffect(() => {
  async function loadSnapshots() {
    if (!documentId) return;
    
    try {
      const data = await documentService.getSnapshots(documentId);
      setSnapshots(data);
    } catch (error) {
      console.error('Failed to load snapshots:', error);
    }
  }
  
  loadSnapshots();
}, [documentId]);
```

## Connection Status

Monitor WebSocket connection:

```typescript
useEffect(() => {
  if (!provider) return;

  const handleStatus = ({ status }: { status: string }) => {
    console.log('Connection status:', status);
    // 'connecting' | 'connected' | 'disconnected'
  };

  provider.on('status', handleStatus);

  return () => {
    provider.off('status', handleStatus);
  };
}, [provider]);
```

## Offline Support

Yjs automatically handles offline mode:
- Changes are queued locally
- Synced when connection restored
- No data loss

## Performance Tips

1. **Debounce title updates**: Don't call API on every keystroke
2. **Lazy load snapshots**: Only fetch when needed
3. **Connection pooling**: Reuse WebSocket connections
4. **Optimize bundle**: Code-split editor components

## Troubleshooting

### Editor not syncing
- Check WebSocket connection in browser DevTools
- Verify Yjs server is running on port 3001
- Check CORS settings

### Cursor positions wrong
- Ensure all clients use same TipTap extensions
- Check CollaborationCursor configuration

### Document not persisting
- Verify database connection
- Check Yjs server logs
- Ensure document exists in database

## Next Steps

- Add authentication
- Implement document permissions
- Add user profiles
- Implement document sharing
- Add comments/annotations
- Implement @mentions
