import type { ConnectionStatus } from '../../hooks/useConnectionStatus';

interface Props {
  status: ConnectionStatus;
}

const CONFIG: Record<ConnectionStatus, { label: string; dot: string; badge: string }> = {
  connected: {
    label: 'Connected',
    dot:   'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  syncing: {
    label: 'Syncing…',
    dot:   'bg-amber-400 animate-pulse',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  connecting: {
    label: 'Connecting…',
    dot:   'bg-slate-400 animate-pulse',
    badge: 'bg-slate-50 text-slate-600 border-slate-200',
  },
  offline: {
    label: 'Offline mode',
    dot:   'bg-rose-400',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

export function ConnectionStatusBadge({ status }: Props) {
  const { label, dot, badge } = CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-all duration-300 ${badge}`}
      aria-live="polite"
      aria-label={`Connection status: ${label}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
