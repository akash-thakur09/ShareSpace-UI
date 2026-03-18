import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useParams } from 'react-router-dom';
import { EditorToolbar } from "./EditorToolbar";
import { EditorHeader } from "./EditorHeader";
import { DocumentSidebar } from "./DocumentSidebar";

const YJS_SERVER_URL = import.meta.env.VITE_YJS_SERVER_URL || 'ws://localhost:3001';

const userInfo = {
  name: 'User ' + Math.floor(Math.random() * 1000),
  color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
};

export function EditorCanvas() {
  const { documentId } = useParams<{ documentId: string }>();
  const [ydoc] = useState<Y.Doc>(() => new Y.Doc());
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [synced, setSynced] = useState(false);

  // Create provider once documentId is known
  useEffect(() => {
    if (!documentId) return;

    const prov = new WebsocketProvider(YJS_SERVER_URL, documentId, ydoc);

    const timer = setTimeout(() => {
      setProvider(prov);
      setSynced(true);
    }, 5000);

    prov.on('sync', (isSynced: boolean) => {
      if (isSynced) {
        clearTimeout(timer);
        setProvider(prov);
        setSynced(true);
      }
    });

    return () => {
      clearTimeout(timer);
      setProvider(null);
      setSynced(false);
      prov.destroy();
    };
  }, [documentId, ydoc]);

  // Editor is created once with Collaboration (no cursor yet)
  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({ document: ydoc }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-slate max-w-none focus:outline-none min-h-full px-8 py-6',
      },
    },
  });

  // Add CollaborationCursor only after provider is connected and synced
  useEffect(() => {
    if (!editor || !provider || !synced || editor.isDestroyed) return;

    const alreadyAdded = editor.extensionManager.extensions.some(
      (e) => e.name === 'collaborationCursor'
    );
    if (alreadyAdded) return;

    editor.extensionManager.extensions.push(
      CollaborationCursor.configure({ provider, user: userInfo })
    );
  }, [editor, provider, synced]);

  if (!documentId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-400">No document ID in URL</p>
      </div>
    );
  }

  if (!editor) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950">
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
