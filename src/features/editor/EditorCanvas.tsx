import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { useParams } from 'react-router-dom';
import { EditorToolbar } from './EditorToolbar';
import { EditorHeader } from './EditorHeader';
import { DocumentSidebar } from './DocumentSidebar';
import { useOfflineEditor } from '../../hooks/useOfflineEditor';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';
import { ConnectionStatusBadge } from '../../components/ui/ConnectionStatusBadge';

// Server-assigned user info — in a real app this comes from the auth context
const userInfo = {
  name:  'User ' + Math.floor(Math.random() * 1000),
  color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
};

export function EditorCanvas() {
  const { documentId } = useParams<{ documentId: string }>();
  const { ydoc, provider, localReady } = useOfflineEditor(documentId);
  const connectionStatus = useConnectionStatus(provider);
  const [isEmpty, setIsEmpty] = useState(true);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({ document: ydoc }),
      // Cursor extension added once provider is available (see effect below)
    ],
    editorProps: {
      attributes: { class: 'focus:outline-none' },
    },
    onUpdate: ({ editor: e }) => setIsEmpty(e.isEmpty),
    // Render immediately — IndexedDB state is already in ydoc
    immediatelyRender: false,
  });

  // Add CollaborationCursor once the provider is ready
  useEffect(() => {
    if (!editor || !provider || editor.isDestroyed) return;
    const already = editor.extensionManager.extensions.some(
      (e) => e.name === 'collaborationCursor',
    );
    if (already) return;
    editor.extensionManager.extensions.push(
      CollaborationCursor.configure({ provider, user: userInfo }),
    );
  }, [editor, provider]);

  if (!documentId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p style={{ color: 'rgb(var(--color-error))' }}>No document ID in URL</p>
      </div>
    );
  }

  // Block render only until IndexedDB has loaded — never wait for the server
  if (!localReady || !editor) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: 'rgb(var(--color-bg-base))' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-7 w-7 animate-spin rounded-full border-2"
            style={{
              borderColor: 'rgb(var(--color-border))',
              borderTopColor: 'rgb(99 102 241)',
            }}
          />
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: 'rgb(var(--color-bg-base))' }}
    >
      <EditorHeader connectionStatus={connectionStatus} />
      <EditorToolbar editor={editor} />

      <div className="flex flex-1 overflow-hidden">
        <DocumentSidebar />

        <main
          className="flex-1 flex flex-col overflow-hidden"
          style={{ background: 'rgb(var(--color-bg-base))' }}
        >
          {/* Offline banner — only shown when fully offline */}
          {connectionStatus === 'offline' && (
            <div
              className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium"
              style={{
                background: 'rgb(254 242 242)',
                borderBottom: '1px solid rgb(254 202 202)',
                color: 'rgb(185 28 28)',
              }}
              role="alert"
            >
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" />
              </svg>
              You're offline — edits are saved locally and will sync when reconnected
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div
              className="mx-auto"
              style={{ maxWidth: '720px' }}
              onClick={() => editor.commands.focus()}
            >
              <div className="editor-card">
                {isEmpty && (
                  <div className="editor-placeholder">Start writing here…</div>
                )}
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Floating status badge — bottom-right corner */}
      <div className="fixed bottom-4 right-4 z-50">
        <ConnectionStatusBadge status={connectionStatus} />
      </div>
    </div>
  );
}
