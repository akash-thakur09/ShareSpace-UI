import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentService, type Document, type DocumentRole } from '../services/document.service';
import { useAuth } from '../contexts/useAuth';
import { DocumentSidebar } from '../features/editor/DocumentSidebar';

function relativeTime(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6'];
function colorForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

const ROLE_BADGE: Record<DocumentRole, { bg: string; text: string; label: string }> = {
  owner:     { bg: 'rgb(99 102 241 / 0.08)',  text: 'rgb(99 102 241)', label: 'Owner'     },
  editor:    { bg: 'rgb(16 185 129 / 0.08)',  text: 'rgb(5 150 105)',  label: 'Editor'    },
  commenter: { bg: 'rgb(245 158 11 / 0.08)',  text: 'rgb(180 83 9)',   label: 'Commenter' },
  viewer:    { bg: 'rgb(148 163 184 / 0.08)', text: 'rgb(71 85 105)',   label: 'Viewer'    },
};

function RoleBadge({ role }: { role: DocumentRole }) {
  const s = ROLE_BADGE[role];
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

interface DocCardProps {
  doc: Document;
  onOpen: () => void;
  onDelete?: () => void;
}

function DocCard({ doc, onOpen, onDelete }: DocCardProps) {
  const color = colorForId(doc.publicId);
  return (
    <div
      className="relative group rounded-xl p-5 border cursor-pointer bg-white border-slate-200/80 hover:border-indigo-200 hover:shadow-[0_8px_30px_rgba(99,102,241,0.06)] hover:-translate-y-0.5 transition-all duration-200"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}10`, border: `1px solid ${color}20` }}
        >
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        {onDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 hover:bg-red-50"
            title="Delete document"
            aria-label="Delete document"
            style={{ padding: '4px' }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      <p className="text-sm font-bold text-slate-800 truncate mb-1">
        {doc.title}
      </p>

      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100/60">
        <p className="text-[11px] font-medium text-slate-400">
          {relativeTime(doc.updatedAt)}
        </p>
        <RoleBadge role={doc.role} />
      </div>
    </div>
  );
}

export function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [owned, setOwned]     = useState<Document[]>([]);
  const [shared, setShared]   = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchDocs = () => {
    documentService.list()
      .then(res => {
        setOwned(res?.owned || []);
        setShared(res?.shared || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  async function createNew() {
    setCreating(true);
    try {
      const doc = await documentService.create({ title: 'Untitled Document' });
      navigate(`/doc/${doc.publicId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
      setCreating(false);
    }
  }

  async function deleteDoc(doc: Document) {
    if (!window.confirm(`Are you sure you want to delete "${doc.title}"?`)) return;
    setOwned(prev => prev.filter(d => d.publicId !== doc.publicId));
    try {
      await documentService.delete(doc.publicId);
    } catch {
      fetchDocs();
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* Workspace Sidebar */}
      <DocumentSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b bg-white border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workspace</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-600">Home</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {(user?.name || user?.email || 'US').slice(0,2).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-slate-600">{user?.name || user?.email}</span>
            <div className="w-[1px] h-4 bg-slate-200" />
            <button
              onClick={async () => { await logout(); navigate('/login', { replace: true }); }}
              className="btn-icon text-slate-400 hover:text-slate-600"
              title="Sign out"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto">
          <main className="max-w-4xl mx-auto px-6 py-8">
            {/* Greeting Header */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Welcome back, {user?.name || 'User'}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  You have access to {owned.length + shared.length} document{owned.length + shared.length !== 1 ? 's' : ''} in this workspace
                </p>
              </div>

              <button onClick={createNew} disabled={creating} className="btn btn-primary text-xs py-2 px-4 shadow-sm">
                {creating ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <span>＋ New Document</span>
                )}
              </button>
            </div>

            {error && (
              <div className="mb-6 rounded-lg px-4 py-3 text-xs bg-red-50 text-red-700 border border-red-200">
                {error}
              </div>
            )}

            {/* My Documents Section */}
            <section className="mb-10">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">
                My Documents
              </h2>
              {owned.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center rounded-xl border border-dashed border-slate-200 bg-white">
                  <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-150 mb-3.5">
                    <span className="text-lg text-slate-400">📄</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mb-1">
                    No documents yet
                  </p>
                  <p className="text-[11px] text-slate-400 mb-4">
                    Create your first document and start collaborating in real time
                  </p>
                  <button onClick={createNew} disabled={creating} className="btn btn-primary text-xs px-3.5 py-1.5 shadow-sm">
                    Create Document
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {owned.map(doc => (
                    <DocCard
                      key={doc.publicId}
                      doc={doc}
                      onOpen={() => navigate(`/doc/${doc.publicId}`)}
                      onDelete={() => deleteDoc(doc)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Shared With Me Section */}
            <section>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">
                Shared With Me
              </h2>
              {shared.length === 0 ? (
                <div className="py-10 text-center rounded-xl border border-dashed border-slate-150 bg-slate-50/50">
                  <p className="text-xs text-slate-400">
                    No documents have been shared with you yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shared.map(doc => (
                    <DocCard
                      key={doc.publicId}
                      doc={doc}
                      onOpen={() => navigate(`/doc/${doc.publicId}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
