import { useEffect, useMemo, useState } from 'react';
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
import { useAwareness } from '../presence/useAwareness';
import { useAuth } from '../../contexts/useAuth';
import { documentService } from '../../services/document.service';

function colorFromString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 50%)`;
}

export function EditorCanvas() {
  const { documentId } = useParams<{ documentId: string }>();
  const { user, loading: authLoading } = useAuth();

  const { ydoc, provider, localReady, wsError } = useOfflineEditor(
    authLoading ? undefined : documentId,
  );

  const connectionStatus = useConnectionStatus(provider);
  const [isEmpty, setIsEmpty] = useState(true);
  const [docTitle, setDocTitle] = useState('Untitled Document');

  // Load document metadata (title) from REST API
  useEffect(() => {
    if (!documentId) return;
    documentService.get(documentId)
      .then(doc => setDocTitle(doc.title))
      .catch(() => {}); // non-fatal — title stays as default
  }, [documentId]);

  const userInfo = useMemo(() => ({
    name:  user?.name || user?.email || 'Anonymous',
    color: colorFromString(user?.id || 'anon'),
    email: user?.email || '',
  }), [user]);

  const awarenessUsers = useAwareness(provider, user ? userInfo : null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({ document: ydoc }),
    ],
    editorProps: {
      attributes: { class: 'focus:outline-none' },
    },
    onUpdate: ({ editor: e }) => setIsEmpty(e.isEmpty),
    immediatelyRender: false,
  });

  // Add CollaborationCursor once provider is ready
  useEffect(() => {
    if (!editor || !provider || editor.isDestroyed) return;
    const already = editor.extensionManager.extensions.some(
      e => e.name === 'collaborationCursor',
    );
    if (already) return;
    editor.extensionManager.extensions.push(
      CollaborationCursor.configure({ provider, user: userInfo }),
    );
  }, [editor, provider, userInfo]);

  if (!documentId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p style={{ color: 'rgb(var(--color-error))' }}>No document ID in URL</p>
      </div>
    );
  }

  if (wsError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="rgb(185 28 28)" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-primary))' }}>
            Connection error
          </p>
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{wsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <DocumentSidebar />

      <div className="flex flex-1 flex-col min-w-0">
        <EditorHeader
          connectionStatus={connectionStatus}
          documentId={documentId}
          initialTitle={docTitle}
          awarenessUsers={awarenessUsers}
        />

        {editor && <EditorToolbar editor={editor} />}

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-8 py-10">
            {/* Placeholder */}
            {isEmpty && localReady && (
              <p
                className="pointer-events-none absolute text-base select-none"
                style={{ color: 'rgb(var(--color-text-faint))' }}
              >
                Start writing…
              </p>
            )}
            <EditorContent
              editor={editor}
              className="prose prose-sm max-w-none"
              style={{ color: 'rgb(var(--color-text-primary))' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
