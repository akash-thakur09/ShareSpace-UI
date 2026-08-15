import type { ConnectionStatus } from '../../hooks/useConnectionStatus';

interface Props {
  status: ConnectionStatus;
}

const CONFIG: Record<ConnectionStatus, { label: string; dot: string; badge: string }> = {
  connected: {
    label: 'Saved',
    dot:   'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  syncing: {
    label: 'Saving...',
    dot:   'bg-indigo-400 animate-spin border border-transparent border-t-white', // Spin circle
    badge: 'bg-indigo-50/50 text-indigo-700 border-indigo-100',
  },
  connecting: {
    label: 'Reconnecting...',
    dot:   'bg-amber-400 animate-pulse',
    badge: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  offline: {
    label: 'Offline',
    dot:   'bg-slate-400',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export function ConnectionStatusBadge({ status }: Props) {
  const { label, dot, badge } = CONFIG[status] || CONFIG.connecting;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-all duration-300 ${badge}`}
      aria-live="polite"
      aria-label={`Document status: ${label}`}
    >
      {status === 'connected' ? (
        <span className="text-[11px] leading-none text-emerald-600">✓</span>
      ) : status === 'syncing' ? (
        <span className="h-2 w-2 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      )}
      {label}
    </span>
  );
}
