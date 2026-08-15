import { Modal } from './Modal';
import { useAuth } from '../../contexts/useAuth';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { user } = useAuth();

  const initials = (user?.name || user?.email || 'US').slice(0, 2).toUpperCase();

  return (
    <Modal open={open} onClose={onClose} title="Settings" width="460px">
      <div className="flex flex-col gap-6 py-1">
        {/* User Card */}
        <div className="flex items-center gap-4 p-4 rounded-xl border bg-slate-50 border-slate-100">
          <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-white text-base font-bold shadow-sm">
            {initials}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-800 truncate">
              {user?.name || 'ShareSpace User'}
            </h4>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {user?.email || 'user@sharespace.com'}
            </p>
          </div>
        </div>

        {/* Workspace info */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Workspace Configuration
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Plan Type</span>
              <span className="font-semibold text-slate-700">Team Starter</span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Region</span>
              <span className="font-semibold text-slate-700">us-east (Virginia)</span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-slate-500">Collaboration Engine</span>
              <span className="font-semibold text-slate-700">Yjs WebSockets (Active)</span>
            </div>
          </div>
        </div>

        {/* Dialog footer buttons */}
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="btn btn-secondary text-xs px-4 py-2">
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
