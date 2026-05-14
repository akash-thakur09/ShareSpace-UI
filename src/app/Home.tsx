import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentService, type Document, type DocumentRole } from '../services/document.service';
import { useAuth } from '../contexts/useAuth';

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
  owner:     { bg: 'rgb(99 102 241 / 0.1)',  text: 'rgb(99 102 241)', label: 'Owner'     },
  editor:    { bg: 'rgb(16 185 129 / 0.1)',  text: 'rgb(5 150 105)',  label: 'Editor'    },
  commenter: { bg: 'rgb(245 158 11 / 0.1)',  text: 'rgb(180 83 9)',   label: 'Commenter' },
  viewer:    { bg: 'rgb(107 114 128 / 0.1)', text: 'rgb(75 85 99)',   label: 'Viewer'    },
};

function RoleBadge({ role }: { role: DocumentRole }) {
  const s = ROLE_BADGE[role];
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium"
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
      className="relative group rounded-xl p-4 transition-all border cursor-pointer"
      style={{ background: 'rgb(var(--color-bg-surface))', borderColor: 'rgb(var(--color-border))' }}
      onClick={onOpen}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = `${color}60`;
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgb(0 0 0 / 0.06)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgb(var(--color-border))';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-sm font-medium truncate mb-1" style={{ color: 'rgb(var(--color-text-primary))' }}>
        {doc.title}
      </p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs" style={{ color: 'rgb(var(--color-text-faint))' }}>
          {relativeTime(doc.updatedAt)}
        </p>
        <RoleBadge role={doc.role} />
      </div>
      {onDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="absolute top-3 right-3 btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete document"
          aria-label="Delete document"
          style={{ color: 'rgb(185 28 28)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgb(254 242 242)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
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

  useEffect(() => {
    documentService.list()
      .then(res => {
        const ownedDocs = res?.owned || [];
        const sharedDocs = res?.shared || [];
        console.log('Documents API:', { owned: ownedDocs, shared: sharedDocs });
        setOwned(ownedDocs);
        setShared(sharedDocs);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
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
    setOwned(prev => prev.filter(d => d.publicId !== doc.publicId));
    try {
      await documentService.delete(doc.publicId);
    } catch {
      setOwned(prev => {
        const exists = prev.some(d => d.publicId === doc.publicId);
        return exists ? prev : [doc, ...prev];
      });
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'rgb(var(--color-bg-base))' }}>
        <div className="h-7 w-7 animate-spin rounded-full border-2"
          style={{ borderColor: 'rgb(226 228 233)', borderTopColor: 'rgb(99 102 241)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'rgb(var(--color-bg-base))' }}>
      <header
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{ background: 'rgb(var(--color-bg-surface))', borderColor: 'rgb(var(--color-border))' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text-primary))' }}>ShareSpace</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{user?.name || user?.email}</span>
          <button
            onClick={async () => { await logout(); navigate('/login', { replace: true }); }}
            className="btn-icon"
            title="Sign out"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'rgb(var(--color-text-primary))' }}>
              Dashboard
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {owned.length + shared.length} document{owned.length + shared.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={createNew} disabled={creating} className="btn btn-primary gap-2">
            {creating ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
            New Document
          </button>
        </div>

        {error && (
          <div
            className="mb-6 rounded-lg px-4 py-3 text-sm"
            style={{ background: 'rgb(254 242 242)', color: 'rgb(185 28 28)', border: '1px solid rgb(254 202 202)' }}
          >
            {error}
          </div>
        )}

        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            My Documents
          </h2>
          {owned.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgb(var(--color-bg-elevated))', border: '1px solid rgb(var(--color-border))' }}
              >
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  style={{ color: 'rgb(var(--color-text-faint))' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                No documents yet
              </p>
              <p className="text-sm mb-5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                Create your first document to get started
              </p>
              <button onClick={createNew} disabled={creating} className="btn btn-primary gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
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

        <section>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            Shared With Me
          </h2>
          {shared.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              No documents have been shared with you yet.
            </p>
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
  );
}
