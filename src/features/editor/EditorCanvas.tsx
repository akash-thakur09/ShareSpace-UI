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
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (!documentId) return;
    const prov = new WebsocketProvider(YJS_SERVER_URL, documentId, ydoc);
    const timer = setTimeout(() => { setProvider(prov); setSynced(true); }, 5000);
    prov.on('sync', (isSynced: boolean) => {
      if (isSynced) { clearTimeout(timer); setProvider(prov); setSynced(true); }
    });
    return () => { clearTimeout(timer); setProvider(null); setSynced(false); prov.destroy(); };
  }, [documentId, ydoc]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({ document: ydoc }),
    ],
    editorProps: {
      attributes: { class: 'focus:outline-none' },
    },
    onUpdate: ({ editor: e }) => setIsEmpty(e.isEmpty),
  });

  useEffect(() => {
    if (!editor || !provider || !synced || editor.isDestroyed) return;
    const alreadyAdded = editor.extensionManager.extensions.some(e => e.name === 'collaborationCursor');
    if (alreadyAdded) return;
    editor.extensionManager.extensions.push(
      CollaborationCursor.configure({ provider, user: userInfo })
    );
  }, [editor, provider, synced]);

  if (!documentId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p style={{ color: "rgb(var(--color-error))" }}>No document ID in URL</p>
      </div>
    );
  }

  if (!editor) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "rgb(var(--color-bg-base))" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2" style={{ borderColor: "rgb(var(--color-border))", borderTopColor: "rgb(99 102 241)" }} />
          <p className="text-sm" style={{ color: "rgb(var(--color-text-muted))" }}>Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" style={{ background: "rgb(var(--color-bg-base))" }}>
      <EditorHeader />
      <EditorToolbar editor={editor} />
      <div className="flex flex-1 overflow-hidden">
        <DocumentSidebar />
        <main className="flex-1 flex flex-col overflow-hidden" style={{ background: "rgb(var(--color-bg-base))" }}>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div
              className="mx-auto"
              style={{ maxWidth: "720px" }}
              onClick={() => editor.commands.focus()}
            >
              <div className="editor-card">
                {isEmpty && (
                  <div className="editor-placeholder">Start writing here...</div>
                )}
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
