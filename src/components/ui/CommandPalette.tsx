import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentService, type Document } from '../../services/document.service';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch documents on mount or open
  useEffect(() => {
    if (!open) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        setLoading(true);
        setQuery('');
        setActiveIndex(0);
      }
    });
    documentService.list()
      .then(res => {
        if (!active) return;
        const all = [...(res?.owned || []), ...(res?.shared || [])];
        const unique = all.filter((doc, idx, self) =>
          self.findIndex(d => d.publicId === doc.publicId) === idx
        );
        setDocuments(unique);
      })
      .catch(err => console.error('Failed to fetch docs for command palette', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    setTimeout(() => inputRef.current?.focus(), 50);

    return () => {
      active = false;
    };
  }, [open]);

  const filtered = documents.filter(doc =>
    doc.title.toLowerCase().includes(query.toLowerCase())
  );

  // Handle keyboard events (ArrowUp, ArrowDown, Enter, Esc)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[activeIndex]) {
          navigate(`/doc/${filtered[activeIndex].publicId}`);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filtered, activeIndex, navigate, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh]"
      style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', animation: 'fadeIn 120ms ease' }}
    >
      <div
        className="w-full max-w-lg flex flex-col rounded-xl overflow-hidden animate-scaleIn"
        style={{
          background: 'rgb(var(--color-bg-surface))',
          border: '1px solid rgb(var(--color-border))',
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.05)',
        }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgb(var(--color-text-faint))' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search documents..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            className="w-full text-sm bg-transparent outline-none border-none placeholder-slate-400 text-slate-900"
            style={{ border: 'none', padding: 0 }}
          />
          <span className="text-[10px] font-medium px-2 py-0.5 rounded border text-slate-400 uppercase tracking-wide">
            ESC
          </span>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto p-2 flex flex-col gap-0.5">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400">
              No documents matched "{query}"
            </div>
          )}

          {!loading && filtered.map((doc, idx) => {
            const active = idx === activeIndex;
            return (
              <button
                key={doc.publicId}
                onClick={() => {
                  navigate(`/doc/${doc.publicId}`);
                  onClose();
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className="w-full text-left px-3.5 py-2.5 rounded-lg flex items-center justify-between gap-4 transition-all border-none cursor-pointer text-xs"
                style={{
                  background: active ? 'rgb(99 102 241 / 0.08)' : 'transparent',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base text-indigo-500">📄</span>
                  <div className="min-w-0">
                    <p className="font-semibold truncate text-slate-800" style={{ color: active ? 'rgb(67 56 202)' : undefined }}>
                      {doc.title}
                    </p>
                    <p className="text-[10px] mt-0.5 text-slate-400">
                      Edited {new Date(doc.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {active && (
                  <span className="text-[10px] font-medium text-indigo-600 flex items-center gap-1 shrink-0">
                    Open <span className="text-[9px] text-indigo-500">⏎</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t flex items-center justify-between text-[10px] text-slate-400" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <div className="flex items-center gap-2">
            <span>↑↓ to navigate</span>
            <span>·</span>
            <span>↵ to select</span>
          </div>
          <span>ShareSpace Palette</span>
        </div>
      </div>
    </div>
  );
}
