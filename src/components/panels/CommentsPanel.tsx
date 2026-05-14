import { useState, useEffect, useCallback } from 'react';
import { commentsService, type DocumentCommentDto } from '../../services/comments.service';
import { useAuth } from '../../contexts/useAuth';
import type { DocumentRole } from '../../services/document.service';

function relativeTime(dateStr: string | Date): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function Avatar({ name, email }: { name?: string; email: string }) {
  const initials = (name || email).slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return (
    <div
      className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
      style={{ background: `hsl(${hue}, 55%, 50%)` }}
    >
      {initials}
    </div>
  );
}

interface CommentsPanelProps {
  documentId: string;
  userRole: DocumentRole | null;
  open: boolean;
  onClose: () => void;
}

export function CommentsPanel({ documentId, userRole, open, onClose }: CommentsPanelProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<DocumentCommentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canComment = userRole !== 'viewer';

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const list = await commentsService.list(documentId);
      setComments(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (open) fetchComments();
  }, [open, fetchComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canComment || !text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const comment = await commentsService.add(documentId, text.trim());
      setComments(prev => [...prev, comment]);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    try {
      await commentsService.remove(documentId, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete comment');
    }
  }

  if (!open) return null;

  return (
    <aside
      style={{
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgb(var(--color-bg-surface))',
        borderLeft: '1px solid rgb(var(--color-border))',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid rgb(var(--color-border))',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgb(var(--color-text-primary))' }}>
          💬 Comments {comments.length > 0 && `(${comments.length})`}
        </span>
        <button onClick={onClose} className="btn-icon" aria-label="Close comments">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Comment list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {error && (
          <div style={{ fontSize: '12px', color: 'rgb(185 28 28)', background: 'rgb(254 242 242)', padding: '6px 10px', borderRadius: '6px' }}>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: '8px', opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px' }}>✕</button>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <div className="h-4 w-4 animate-spin rounded-full border-2"
              style={{ borderColor: 'rgb(var(--color-border))', borderTopColor: 'rgb(99 102 241)' }} />
          </div>
        ) : comments.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'rgb(var(--color-text-faint))', textAlign: 'center', padding: '24px 0' }}>
            No comments yet
          </p>
        ) : (
          comments.map(c => {
            const isMine = c.userId === user?.id;
            return (
              <div key={c.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <Avatar name={c.name} email={c.email} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgb(var(--color-text-primary))', truncate: true }}>
                      {c.name || c.email}
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgb(var(--color-text-faint))', whiteSpace: 'nowrap' }}>
                      {relativeTime(c.createdAt)}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgb(var(--color-text-secondary))', marginTop: '2px', wordBreak: 'break-word' }}>
                    {c.content}
                  </p>
                  {(isMine || userRole === 'owner') && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      style={{ fontSize: '11px', color: 'rgb(var(--color-text-faint))', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', marginTop: '2px' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      {canComment ? (
        <form
          onSubmit={handleSubmit}
          style={{ padding: '10px 12px', borderTop: '1px solid rgb(var(--color-border))', display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          <textarea
            placeholder="Add a comment…"
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={submitting}
            rows={2}
            style={{
              width: '100%',
              padding: '7px 10px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '13px',
              resize: 'none',
              color: '#111827',
              background: '#fff',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="btn btn-primary text-xs"
            style={{ alignSelf: 'flex-end', opacity: submitting || !text.trim() ? 0.5 : 1 }}
          >
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </form>
      ) : (
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgb(var(--color-border))' }}>
          <p style={{ fontSize: '12px', color: 'rgb(var(--color-text-faint))', textAlign: 'center' }}>
            Viewers cannot comment
          </p>
        </div>
      )}
    </aside>
  );
}
