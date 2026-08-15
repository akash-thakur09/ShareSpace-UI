import { Modal } from './Modal';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  const categories = [
    {
      title: 'Navigation & Commands',
      items: [
        { keys: ['Ctrl', 'K'], desc: 'Open command search palette' },
        { keys: ['Esc'], desc: 'Close modals, dropdowns, and sidebars' },
      ],
    },
    {
      title: 'Editor Formatting',
      items: [
        { keys: ['Ctrl', 'B'], desc: 'Apply bold formatting' },
        { keys: ['Ctrl', 'I'], desc: 'Apply italic formatting' },
        { keys: ['Ctrl', 'Z'], desc: 'Undo last change' },
        { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Redo last change' },
      ],
    },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts" width="440px">
      <div className="flex flex-col gap-6 py-1">
        {categories.map((cat, i) => (
          <div key={i} className="flex flex-col gap-2.5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              {cat.title}
            </h3>
            <div className="flex flex-col gap-2">
              {cat.items.map((item, j) => (
                <div key={j} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-slate-600">{item.desc}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((k, idx) => (
                      <kbd
                        key={idx}
                        className="px-1.5 py-0.5 rounded border text-[10px] font-mono shadow-sm bg-slate-50 border-slate-200 text-slate-600"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
