import { useEffect, useRef, useState } from 'react';
import type { AwarenessUser } from './useAwareness';

const MAX_VISIBLE = 5;

// ─── Single avatar with tooltip ──────────────────────────────────────────────

function Avatar({ user, size = 28, ring }: { user: AwarenessUser; size?: number; ring?: string }) {
  const [tip, setTip] = useState(false);
  const initials = user.name.slice(0, 2).toUpperCase();

  return (
    <div className="relative" style={{ zIndex: tip ? 10 : undefined }}>
      <div
        onMouseEnter={() => setTip(true)}
        onMouseLeave={() => setTip(false)}
        className="rounded-full flex items-center justify-center text-white font-semibold cursor-default select-none"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.36,
          background: user.color,
          boxShadow: `0 0 0 2px ${ring ?? 'rgb(var(--color-bg-surface), 1)'}`,
          outline: user.isSelf ? `2px solid ${user.color}` : undefined,
          outlineOffset: user.isSelf ? '2px' : undefined,
        }}
        aria-label={user.name}
      >
        {initials}
      </div>

      {/* Tooltip */}
      {tip && (
        <div
          className="absolute bottom-full left-1/2 mb-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs shadow-lg pointer-events-none"
          style={{
            transform: 'translateX(-50%)',
            background: 'rgb(var(--color-bg-elevated))',
            border: '1px solid rgb(var(--color-border))',
            color: 'rgb(var(--color-text-primary))',
            zIndex: 100,
          }}
        >
          <p className="font-medium">{user.name}{user.isSelf && ' (you)'}</p>
          <p style={{ color: 'rgb(var(--color-text-muted))' }}>{user.email}</p>
        </div>
      )}
    </div>
  );
}

// ─── Overflow pill + dropdown ─────────────────────────────────────────────────

function OverflowPill({ users }: { users: AwarenessUser[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="rounded-full flex items-center justify-center text-xs font-semibold cursor-pointer"
        style={{
          width: 28,
          height: 28,
          background: 'rgb(var(--color-bg-elevated))',
          border: '1px solid rgb(var(--color-border))',
          color: 'rgb(var(--color-text-secondary))',
          boxShadow: '0 0 0 2px rgb(var(--color-bg-surface))',
        }}
        aria-label={`${users.length} more users`}
      >
        +{users.length}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl py-1.5 shadow-xl min-w-[180px]"
          style={{
            background: 'rgb(var(--color-bg-surface))',
            border: '1px solid rgb(var(--color-border))',
            zIndex: 50,
          }}
        >
          {users.map(u => (
            <div key={u.clientId} className="flex items-center gap-2.5 px-3 py-1.5">
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ background: u.color, fontSize: 10, fontWeight: 600 }}
              >
                {u.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'rgb(var(--color-text-primary))' }}>
                  {u.name}{u.isSelf && ' (you)'}
                </p>
                <p className="text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {u.email}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface PresenceAvatarsProps {
  users: AwarenessUser[];
}

export function PresenceAvatars({ users }: PresenceAvatarsProps) {
  if (users.length === 0) return null;

  const visible = users.slice(0, MAX_VISIBLE);
  const overflow = users.slice(MAX_VISIBLE);

  return (
    <div className="flex items-center -space-x-2">
      {visible.map(u => (
        <Avatar key={u.clientId} user={u} />
      ))}
      {overflow.length > 0 && <OverflowPill users={overflow} />}
    </div>
  );
}
