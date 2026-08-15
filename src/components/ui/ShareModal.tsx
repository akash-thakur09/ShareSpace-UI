import { useEffect, useState, useCallback } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../../contexts/useAuth';
import {
  permissionsService,
  type DocumentPermission,
  type PermissionRole,
} from '../../services/permissions.service';
import { sidebarEvents } from '../../services/sidebar-events';

// ─── Role badge ──────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<PermissionRole, { bg: string; text: string; label: string }> = {
  owner:     { bg: 'rgb(99 102 241 / 0.08)',  text: 'rgb(99 102 241)',  label: 'Owner'     },
  editor:    { bg: 'rgb(16 185 129 / 0.08)',  text: 'rgb(5 150 105)',   label: 'Editor'    },
  commenter: { bg: 'rgb(245 158 11 / 0.08)',  text: 'rgb(180 83 9)',    label: 'Commenter' },
  viewer:    { bg: 'rgb(148 163 184 / 0.08)', text: 'rgb(71 85 105)',    label: 'Viewer'    },
};

function RoleBadge({ role }: { role: PermissionRole }) {
  const s = ROLE_STYLES[role];
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name, email }: { name?: string; email: string }) {
  const initials = (name || email).slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return (
    <div
      className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 shadow-sm"
      style={{ background: `hsl(${hue}, 50%, 45%)` }}
    >
      {initials}
    </div>
  );
}

// ─── Role select ─────────────────────────────────────────────────────────────

function RoleSelect({
  value,
  onChange,
  disabled,
  excludeOwner = true,
}: {
  value: PermissionRole;
  onChange: (r: PermissionRole) => void;
  disabled?: boolean;
  excludeOwner?: boolean;
}) {
  const roles: PermissionRole[] = excludeOwner
    ? ['editor', 'commenter', 'viewer']
    : ['owner', 'editor', 'commenter', 'viewer'];
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as PermissionRole)}
      disabled={disabled}
      className="border rounded px-2.5 py-1 text-xs text-slate-700 bg-white outline-none cursor-pointer hover:border-slate-350 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
      style={{ minWidth: '90px' }}
    >
      {roles.map(r => (
        <option key={r} value={r}>{ROLE_STYLES[r].label}</option>
      ))}
    </select>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs bg-red-50 text-red-700 border border-red-200"
      role="alert"
    >
      <span className="flex-1 font-medium">{message}</span>
      <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100 font-bold" aria-label="Dismiss">✕</button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  documentId?: string;
}

export function ShareModal({ open, onClose, documentId }: ShareModalProps) {
  const { user } = useAuth();

  const [permissions, setPermissions] = useState<DocumentPermission[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add-user form state
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<PermissionRole>('editor');
  const [adding, setAdding] = useState(false);

  // Per-user action loading (userId → true)
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  // Copy-link state
  const [copied, setCopied] = useState(false);

  const currentUserRole = permissions.find(p => p.userId === user?.id)?.role;
  const isOwner = currentUserRole === 'owner';

  // ── Fetch permissions when modal opens ──────────────────────────────────────
  const fetchPermissions = useCallback(async () => {
    if (!documentId) return;
    setLoadingList(true);
    setError(null);
    try {
      const list = await permissionsService.list(documentId);
      setPermissions(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load permissions');
    } finally {
      setLoadingList(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (open) {
      fetchPermissions();
    } else {
      setAddEmail('');
      setAddRole('editor');
      setError(null);
    }
  }, [open, fetchPermissions]);

  // ── Add user ────────────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!documentId || !addEmail.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const newPerm = await permissionsService.add(documentId, addEmail.trim(), addRole);
      setPermissions(prev =>
        prev.some(p => p.userId === newPerm.userId)
          ? prev.map(p => p.userId === newPerm.userId ? newPerm : p)
          : [...prev, newPerm]
      );
      setAddEmail('');
      sidebarEvents.emitRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add user');
    } finally {
      setAdding(false);
    }
  }

  // ── Change role ─────────────────────────────────────────────────────────────
  async function handleRoleChange(userId: string, role: PermissionRole) {
    if (!documentId) return;
    setPermissions(prev => prev.map(p => p.userId === userId ? { ...p, role } : p));
    setBusy(b => ({ ...b, [userId]: true }));
    setError(null);
    try {
      const updated = await permissionsService.updateRole(documentId, userId, role);
      setPermissions(prev => prev.map(p => p.userId === userId ? updated : p));
      sidebarEvents.emitRefresh();
    } catch (e) {
      fetchPermissions();
      setError(e instanceof Error ? e.message : 'Failed to update role');
    } finally {
      setBusy(b => ({ ...b, [userId]: false }));
    }
  }

  // ── Remove user ─────────────────────────────────────────────────────────────
  async function handleRemove(userId: string) {
    if (!documentId) return;
    const target = permissions.find(p => p.userId === userId);
    if (!target) return;

    if (target.role === 'owner' && permissions.filter(p => p.role === 'owner').length <= 1) {
      setError('Cannot remove the last owner of the document.');
      return;
    }

    setPermissions(prev => prev.filter(p => p.userId !== userId));
    setBusy(b => ({ ...b, [userId]: true }));
    setError(null);
    try {
      await permissionsService.remove(documentId, userId);
      sidebarEvents.emitRefresh();
    } catch (e) {
      fetchPermissions();
      setError(e instanceof Error ? e.message : 'Failed to remove user');
    } finally {
      setBusy(b => ({ ...b, [userId]: false }));
    }
  }

  // ── Copy link ───────────────────────────────────────────────────────────────
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      const el = document.createElement('textarea');
      el.value = window.location.href;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={open} onClose={onClose} title="Share Document" width="460px">
      <div className="flex flex-col gap-4 py-1">

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {/* ── Invite Form (Owner Only) ── */}
        {isOwner && (
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="email"
              placeholder="Enter email address"
              value={addEmail}
              onChange={e => setAddEmail(e.target.value)}
              disabled={adding}
              className="input flex-1 min-w-0"
            />
            <RoleSelect
              value={addRole}
              onChange={setAddRole}
              disabled={adding}
            />
            <button
              type="submit"
              disabled={adding || !addEmail.trim()}
              className="btn btn-primary px-3 text-xs shrink-0 font-semibold"
              style={{ opacity: adding || !addEmail.trim() ? 0.6 : 1 }}
            >
              {adding ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : 'Invite'}
            </button>
          </form>
        )}

        {/* ── People with access list ── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            People with access
          </p>

          {loadingList ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
            </div>
          ) : permissions.length === 0 ? (
            <p className="text-xs py-4 text-center text-slate-400">
              No collaborators found
            </p>
          ) : (
            <ul className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1">
              {permissions.map(perm => {
                const isSelf = perm.userId === user?.id;
                const isLastOwner = perm.role === 'owner' && permissions.filter(p => p.role === 'owner').length <= 1;
                const canManage = isOwner && !isSelf;
                const rowBusy = busy[perm.userId];

                return (
                  <li
                    key={perm.userId}
                    className="flex items-center gap-3 rounded-lg px-2.5 py-1.8 hover:bg-slate-50 transition-colors"
                  >
                    <Avatar name={perm.name} email={perm.email} />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {perm.name || perm.email}
                        {isSelf && (
                          <span className="ml-1.5 text-[10px] font-medium text-slate-400">(you)</span>
                        )}
                      </p>
                      {perm.name && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {perm.email}
                        </p>
                      )}
                    </div>

                    {/* Role selector / badge */}
                    {canManage && perm.role !== 'owner' ? (
                      <RoleSelect
                        value={perm.role}
                        onChange={role => handleRoleChange(perm.userId, role)}
                        disabled={rowBusy}
                      />
                    ) : (
                      <RoleBadge role={perm.role} />
                    )}

                    {/* Remove button */}
                    {canManage && !isLastOwner && (
                      <button
                        onClick={() => handleRemove(perm.userId)}
                        disabled={rowBusy}
                        className="btn-icon p-1 shrink-0 text-slate-400 hover:text-red-600"
                        title="Revoke access"
                        aria-label={`Remove ${perm.email}`}
                      >
                        {rowBusy ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-350 border-t-transparent" />
                        ) : (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-100" />

        {/* ── Link Sharing Option ── */}
        <div className="flex gap-2">
          <div
            className="flex-1 flex items-center px-3 rounded-lg text-[10px] truncate border"
            style={{
              background: 'rgb(var(--color-bg-base))',
              borderColor: 'rgb(var(--color-border))',
              color: 'rgb(var(--color-text-secondary))',
              height: '36px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span className="truncate">{window.location.href}</span>
          </div>
          <button
            onClick={handleCopy}
            className="btn btn-primary shrink-0 px-3.5 text-xs gap-1.5 font-semibold"
            style={{ minWidth: '100px' }}
          >
            {copied ? (
              <>
                <span className="text-xs leading-none">✓</span>
                Copied!
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </>
            )}
          </button>
        </div>

      </div>
    </Modal>
  );
}
