import { useEffect, useMemo, useState, useRef } from 'react';
import { EditorContent, useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { useParams } from 'react-router-dom';
import { EditorToolbar } from './EditorToolbar';
import { EditorHeader } from './EditorHeader';
import { DocumentSidebar } from './DocumentSidebar';
import { CommentsPanel } from '../../components/panels/CommentsPanel';
import { AiAssistantPanel } from '../../components/panels/AiAssistantPanel';
import { VersionHistoryPanel } from '../../components/panels/VersionHistoryPanel';
import { useOfflineEditor } from '../../hooks/useOfflineEditor';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';
import { useAwareness } from '../presence/useAwareness';
import { useAuth } from '../../contexts/useAuth';
import { documentService, type DocumentRole } from '../../services/document.service';

function colorFromString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 50%)`;
}

function isReadOnlyRole(role: DocumentRole | null): boolean {
  return role === 'viewer' || role === 'commenter';
}

// Evaluates if the editor is completely empty (only one empty paragraph child)
function isDocEmpty(editorInstance: Editor | null): boolean {
  if (!editorInstance) return true;
  const doc = editorInstance.state.doc;
  if (doc.childCount > 1) return false;
  const firstChild = doc.firstChild;
  if (!firstChild) return true;
  return firstChild.type.name === 'paragraph' && firstChild.content.size === 0;
}

function EditorSkeleton() {
  return (
    <div className="w-full max-w-[900px] px-6 md:px-8 lg:px-12 py-12 flex flex-col gap-6 animate-pulse">
      {/* Title placeholder */}
      <div className="h-9 bg-slate-200/50 rounded-md w-1/3 mb-2" />
      {/* Paragraph blocks */}
      <div className="flex flex-col gap-3">
        <div className="h-4 bg-slate-200/40 rounded-md w-full" />
        <div className="h-4 bg-slate-200/40 rounded-md w-11/12" />
        <div className="h-4 bg-slate-200/40 rounded-md w-5/6" />
        <div className="h-4 bg-slate-200/40 rounded-md w-full" />
      </div>
      <div className="flex flex-col gap-3 mt-4">
        <div className="h-4 bg-slate-200/40 rounded-md w-11/12" />
        <div className="h-4 bg-slate-200/40 rounded-md w-3/4" />
      </div>
    </div>
  );
}

export function EditorCanvas() {
  const { documentId } = useParams<{ documentId: string }>();
  const { user, loading: authLoading } = useAuth();

  const { ydoc, provider, localReady, wsError } = useOfflineEditor(
    authLoading ? undefined : documentId,
  );

  const connectionStatus = useConnectionStatus(provider);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [docTitle, setDocTitle] = useState('Untitled Document');
  const [savedTitle, setSavedTitle] = useState('Untitled Document');
  const [userRole, setUserRole] = useState<DocumentRole | null>(null);

  // Side panels toggle states
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load document metadata (title + role) from REST API
  useEffect(() => {
    if (!documentId) return;

    let cancelled = false;

    const fetchRole = () =>
      documentService.get(documentId)
        .then(doc => {
          if (cancelled) return;
          setDocTitle(doc.title);
          setSavedTitle(doc.title);
          setUserRole(doc.role ?? null);
        })
        .catch(() => {});

    fetchRole();

    const interval = setInterval(fetchRole, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [documentId]);

  const readOnly = isReadOnlyRole(userRole);
  const canSeeComments = userRole !== 'viewer';

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
    editable: !readOnly,
    editorProps: {
      attributes: { class: 'focus:outline-none' },
    },
    onUpdate: ({ editor: e }) => setIsEditorEmpty(isDocEmpty(e)),
    onTransaction: ({ editor: e }) => setIsEditorEmpty(isDocEmpty(e)),
    immediatelyRender: false,
  });

  // Keep editor editable state in sync with role
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

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

  async function persistTitle(newTitle: string) {
    if (!documentId || !newTitle.trim()) return;
    try {
      await documentService.update(documentId, { title: newTitle.trim() });
      setSavedTitle(newTitle.trim());
    } catch (err) {
      console.error("Failed to save title:", err);
    }
  }

  function handleTitleChange(value: string) {
    setDocTitle(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistTitle(value), 800);
  }

  function handleTitleBlur() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    persistTitle(docTitle);
  }

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

  const isLoading = !localReady || !editor || userRole === null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Notion-style Left Sidebar */}
      <DocumentSidebar activeDocTitle={savedTitle} />

      {/* Editor Frame */}
      <div className="flex flex-1 flex-col min-w-0">
        <EditorHeader
          connectionStatus={connectionStatus}
          documentId={documentId}
          initialTitle={savedTitle}
          awarenessUsers={awarenessUsers}
          onTitleSaved={setSavedTitle}
          readOnly={readOnly}
          userRole={userRole}
          commentsOpen={commentsOpen}
          onToggleComments={canSeeComments ? () => { setCommentsOpen(!commentsOpen); setAiOpen(false); setVersionHistoryOpen(false); } : undefined}
          aiOpen={aiOpen}
          onToggleAi={() => { setAiOpen(!aiOpen); setCommentsOpen(false); setVersionHistoryOpen(false); }}
          versionHistoryOpen={versionHistoryOpen}
          onToggleVersionHistory={() => { setVersionHistoryOpen(!versionHistoryOpen); setCommentsOpen(false); setAiOpen(false); }}
        />

        {isLoading ? (
          <div className="flex-1 overflow-y-auto bg-white flex justify-center">
            <EditorSkeleton />
          </div>
        ) : (
          <>
            {editor && !readOnly && <EditorToolbar editor={editor} />}

            {/* Workspace Canvas wrapper */}
            <div className="flex flex-1 overflow-hidden">
              {/* Scrollable canvas area */}
              <div className="flex-1 overflow-y-auto bg-white flex justify-center">
                <div className="w-full max-w-[900px] px-4 md:px-6 lg:px-8 py-12 min-h-full flex flex-col">
                  {/* Notion-like inline Document Title */}
                  <div className="mb-4">
                    <input
                      type="text"
                      value={docTitle}
                      onChange={e => handleTitleChange(e.target.value)}
                      onBlur={handleTitleBlur}
                      onKeyDown={e => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
                      placeholder="Untitled Document"
                      readOnly={readOnly}
                      className="w-full text-[32px] font-semibold border-none outline-none focus:ring-0 bg-transparent p-0 text-slate-900 placeholder-slate-200"
                      style={{ border: 'none', padding: 0, lineHeight: 1.2 }}
                    />
                  </div>

                  {/* Editor canvas content */}
                  <div className="relative flex-1 pt-6">
                    {isEditorEmpty && !readOnly && (
                      <p
                        className="pointer-events-none absolute text-base select-none animate-fadeIn pt-6"
                        style={{ color: 'rgb(var(--color-text-faint))', top: '0px', left: '0px' }}
                      >
                        Start writing…
                      </p>
                    )}
                    <EditorContent
                      editor={editor}
                      className="prose max-w-none text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Right Drawers */}
              <CommentsPanel
                documentId={documentId}
                userRole={userRole}
                open={canSeeComments && commentsOpen}
                onClose={() => setCommentsOpen(false)}
              />

              <AiAssistantPanel
                editor={editor || undefined}
                open={aiOpen}
                onClose={() => setAiOpen(false)}
              />

              <VersionHistoryPanel
                documentId={documentId}
                open={versionHistoryOpen}
                onClose={() => setVersionHistoryOpen(false)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
