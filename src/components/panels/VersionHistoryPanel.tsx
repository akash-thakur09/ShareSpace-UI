import { useState, useEffect, useCallback } from 'react';
import { documentService } from '../../services/document.service';

interface SnapshotDto {
  id: string;
  version: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface VersionHistoryPanelProps {
  documentId: string;
  open: boolean;
  onClose: () => void;
}

function relativeTime(dateStr: string): string {
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

export function VersionHistoryPanel({ documentId, open, onClose }: VersionHistoryPanelProps) {
  const [snapshots, setSnapshots] = useState<SnapshotDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await documentService.getSnapshots(documentId);
      setSnapshots(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load snapshots');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (open) fetchSnapshots();
  }, [open, fetchSnapshots]);

  async function handleCreateSnapshot() {
    setCreating(true);
    setError(null);
    try {
      await documentService.createSnapshot(documentId);
      await fetchSnapshots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save snapshot');
    } finally {
      setCreating(false);
    }
  }

  async function handleRestore(snapshot: SnapshotDto) {
    if (!window.confirm(`Are you sure you want to restore document to version ${snapshot.version}? Current unsaved edits will be overwritten.`)) {
      return;
    }
    setRestoringId(snapshot.id);
    setError(null);
    try {
      await documentService.restoreSnapshot(documentId, snapshot.id);
      // Hard reload page to clear IndexedDB cache, Y.doc states, and reconnect WebsocketProvider from the new database snapshot.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore snapshot');
      setRestoringId(null);
    }
  }

  if (!open) return null;

  return (
    <aside
      className="w-72 flex flex-col shrink-0 border-l"
      style={{
        background: 'rgb(var(--color-bg-surface))',
        borderColor: 'rgb(var(--color-border))',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          🕒 Version History
        </span>
        <button onClick={onClose} className="btn-icon" aria-label="Close version history">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Manual Snapshot Control */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/50">
        <button
          onClick={handleCreateSnapshot}
          disabled={creating || loading}
          className="w-full btn btn-secondary text-xs py-1.5 rounded-lg border flex items-center justify-center gap-1.5 bg-white"
        >
          {creating ? (
            <span className="h-3.5 w-3.5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          ) : (
            <span>＋ Create Version</span>
          )}
        </button>
      </div>

      {/* Snapshot list */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {error && (
          <div className="text-xs p-2 rounded-lg bg-red-50 text-red-700 border border-red-200 flex justify-between items-start gap-1">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
          </div>
        ) : snapshots.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">
            No snapshots found.
          </p>
        ) : (
          snapshots.map((snap, idx) => {
            const isLatest = idx === 0;
            const isRestoring = restoringId === snap.id;
            return (
              <div
                key={snap.id}
                className="p-3 rounded-lg border border-slate-100 bg-white flex flex-col gap-2 shadow-sm relative group hover:border-indigo-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">
                    Version {snap.version}
                    {isLatest && (
                      <span className="ml-1.5 badge badge-live text-[9px] px-1 py-0 px-1.5 rounded-full font-medium">
                        Current
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {relativeTime(snap.createdAt)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Saved on {new Date(snap.createdAt).toLocaleString()}
                </p>

                {/* Actions (Only show restore for past snapshots) */}
                {!isLatest && (
                  <button
                    onClick={() => handleRestore(snap)}
                    disabled={isRestoring || restoringId !== null}
                    className="w-full btn border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 text-[10px] py-1 rounded-md mt-1.5 font-semibold bg-white"
                  >
                    {isRestoring ? 'Restoring...' : 'Restore Version'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
