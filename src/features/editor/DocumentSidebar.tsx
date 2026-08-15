import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CreateDocModal } from "../../components/ui/CreateDocModal";
import { CommandPalette } from "../../components/ui/CommandPalette";
import { SettingsModal } from "../../components/ui/SettingsModal";
import { ShortcutsModal } from "../../components/ui/ShortcutsModal";
import { ShareModal } from "../../components/ui/ShareModal";
import { documentService, type Document } from "../../services/document.service";
import { sidebarEvents } from "../../services/sidebar-events";

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface DocSectionProps {
  title: string;
  docs: Document[];
  activeDocId?: string;
  pinnedIds: Set<string>;
  menuOpenId: string | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onNavigate: (publicId: string) => void;
  onMenuToggle: (publicId: string | null) => void;
  onPin: (doc: Document) => void;
  onShare: (doc: Document) => void;
  onCopyLink: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
  emptyMessage?: string;
}

function DocSection({
  title,
  docs,
  activeDocId,
  pinnedIds,
  menuOpenId,
  menuRef,
  onNavigate,
  onMenuToggle,
  onPin,
  onShare,
  onCopyLink,
  onDelete,
  emptyMessage,
}: DocSectionProps) {
  if (docs.length === 0 && !emptyMessage) return null;

  return (
    <div className="flex flex-col mb-4">
      <p
        className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider mb-1"
        style={{ color: "rgb(var(--color-text-faint))" }}
      >
        {title}
      </p>
      <div className="flex flex-col gap-0.5">
        {docs.length === 0 ? (
          <p className="px-2.5 py-2 text-xs" style={{ color: "rgb(var(--color-text-faint))" }}>
            {emptyMessage}
          </p>
        ) : (
          docs.map(doc => {
            const isActive = doc.publicId === activeDocId;
            const isPinned = pinnedIds.has(doc.publicId);
            const menuOpen = menuOpenId === doc.publicId;

            return (
              <div key={doc.publicId} className="relative group px-1">
                <button
                  onClick={() => onNavigate(doc.publicId)}
                  className="w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2.5 transition-all border-none cursor-pointer"
                  style={{
                    background: isActive ? "rgb(var(--color-bg-hover))" : "transparent"
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgb(var(--color-bg-hover))"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <span className="text-sm shrink-0">📄</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 justify-between">
                      <p
                        className="text-xs font-medium truncate"
                        style={{
                          color: isActive ? "rgb(var(--color-text-primary))" : "rgb(var(--color-text-secondary))",
                          fontWeight: isActive ? 600 : 500
                        }}
                      >
                        {doc.title}
                      </p>
                      {isPinned && (
                        <span className="text-[10px] text-indigo-500" title="Pinned">★</span>
                      )}
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: "rgb(var(--color-text-faint))" }}>
                      Edited {relativeTime(doc.updatedAt)}
                    </p>
                  </div>
                </button>

                {/* Dropdown Options Menu Trigger */}
                <button
                  onClick={e => { e.stopPropagation(); onMenuToggle(menuOpen ? null : doc.publicId); }}
                  className="btn-icon absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ opacity: menuOpen ? 1 : undefined, padding: "2px" }}
                  title="More actions"
                  aria-label="More actions"
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {menuOpen && (
                  <div
                    ref={menuRef}
                    className="absolute right-2 z-50 rounded-lg py-1 min-w-[140px] shadow-lg animate-scaleIn"
                    style={{
                      top: "calc(100% - 2px)",
                      background: "rgb(var(--color-bg-surface))",
                      border: "1px solid rgb(var(--color-border))",
                    }}
                  >
                    <button
                      onClick={() => onPin(doc)}
                      className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer border-none bg-transparent hover:bg-slate-50 text-slate-700"
                    >
                      <span>★</span>
                      {isPinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      onClick={() => onShare(doc)}
                      className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer border-none bg-transparent hover:bg-slate-50 text-slate-700"
                    >
                      <span>👥</span>
                      Share
                    </button>
                    <button
                      onClick={() => onCopyLink(doc)}
                      className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer border-none bg-transparent hover:bg-slate-50 text-slate-700"
                    >
                      <span>🔗</span>
                      Copy Link
                    </button>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(doc)}
                        className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer border-none bg-transparent hover:bg-red-50 text-red-600 border-t border-slate-100"
                      >
                        <span>🗑</span>
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface DocumentSidebarProps {
  activeDocTitle?: string;
}

export function DocumentSidebar({ activeDocTitle }: DocumentSidebarProps = {}) {
  const { documentId: activeDocId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  // Sidebar toggle state
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedDocForShare, setSelectedDocForShare] = useState<Document | null>(null);

  // Documents state
  const [owned, setOwned]             = useState<Document[]>([]);
  const [shared, setShared]           = useState<Document[]>([]);
  const [loading, setLoading]         = useState(true);
  const [pinnedIds, setPinnedIds]     = useState<Set<string>>(new Set());
  const [menuOpenId, setMenuOpenId]   = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentService.list();
      const apiPinned = new Set<string>();
      [...res.owned, ...res.shared].forEach(d => { if (d.isPinned) apiPinned.add(d.publicId); });
      setPinnedIds(apiPinned);

      const sortByPin = (docs: Document[]) => [
        ...docs.filter(d => d.isPinned),
        ...docs.filter(d => !d.isPinned),
      ];
      setOwned(sortByPin(res.owned));
      setShared(sortByPin(res.shared));
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);
  useEffect(() => {
    const unsub = sidebarEvents.onRefresh(fetchDocs);
    return () => { unsub(); };
  }, [fetchDocs]);

  // Sync active doc title
  useEffect(() => {
    if (!activeDocId || !activeDocTitle) return;
    setOwned(prev => prev.map(d => d.publicId === activeDocId ? { ...d, title: activeDocTitle } : d));
    setShared(prev => prev.map(d => d.publicId === activeDocId ? { ...d, title: activeDocTitle } : d));
  }, [activeDocId, activeDocTitle]);

  // Command palette hotkey listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close context dropdown on outside click
  useEffect(() => {
    if (!menuOpenId) return;
    function onOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [menuOpenId]);

  const handleCreated = (publicId: string) => {
    fetchDocs();
    navigate(`/doc/${publicId}`);
  };

  async function handleDelete(doc: Document) {
    setMenuOpenId(null);
    if (!window.confirm(`Are you sure you want to delete "${doc.title}"?`)) return;

    setOwned(prev => prev.filter(d => d.publicId !== doc.publicId));
    try {
      await documentService.delete(doc.publicId);
      if (doc.publicId === activeDocId) navigate("/", { replace: true });
    } catch {
      fetchDocs();
    }
  }

  async function handlePin(doc: Document) {
    setMenuOpenId(null);
    const wasPin = pinnedIds.has(doc.publicId);
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (wasPin) {
        next.delete(doc.publicId);
      } else {
        next.add(doc.publicId);
      }
      return next;
    });
    try {
      const { isPinned } = await documentService.togglePin(doc.publicId);
      setPinnedIds(prev => {
        const next = new Set(prev);
        if (isPinned) {
          next.add(doc.publicId);
        } else {
          next.delete(doc.publicId);
        }
        return next;
      });
      fetchDocs();
    } catch {
      fetchDocs();
    }
  }

  function handleShare(doc: Document) {
    setMenuOpenId(null);
    setSelectedDocForShare(doc);
    setShareOpen(true);
  }

  async function handleCopyLink(doc: Document) {
    setMenuOpenId(null);
    const link = `${window.location.origin}/doc/${doc.publicId}`;
    try {
      await navigator.clipboard.writeText(link);
      alert("Link copied to clipboard!");
    } catch {
      alert("Failed to copy link.");
    }
  }

  if (isCollapsed) {
    return (
      <aside
        className="w-12 flex flex-col items-center py-4 gap-4 shrink-0 transition-all"
        style={{ background: "rgb(var(--color-bg-surface))", borderRight: "1px solid rgb(var(--color-border))" }}
      >
        <button onClick={() => setIsCollapsed(false)} className="btn-icon" title="Expand sidebar">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div style={{ borderTop: "1px solid rgb(var(--color-border))", width: "60%" }} />
        <button onClick={() => setCreateOpen(true)} className="btn-icon" title="New Document">
          <span className="text-base">＋</span>
        </button>
        <button onClick={() => setPaletteOpen(true)} className="btn-icon" title="Search (Ctrl+K)">
          <span className="text-base">⌕</span>
        </button>
      </aside>
    );
  }

  return (
    <>
      <aside
        className="w-60 flex flex-col shrink-0 transition-all select-none"
        style={{
          background: "rgb(var(--color-bg-surface))",
          borderRight: "1px solid rgb(var(--color-border))"
        }}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: "rgb(var(--color-border))" }}>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 cursor-pointer border-none bg-transparent"
          >
            <div className="flex h-6.5 w-6.5 items-center justify-center rounded-md bg-indigo-600 shadow-sm">
              <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-slate-800">
              ShareSpace
            </span>
          </button>
          <button onClick={() => setIsCollapsed(true)} className="btn-icon" title="Collapse sidebar">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Primary Action Button */}
        <div className="px-3 pt-3">
          <button
            onClick={() => setCreateOpen(true)}
            className="w-full btn btn-primary flex items-center justify-center gap-2 text-xs py-2 rounded-lg font-semibold shadow-sm"
          >
            <span>＋</span>
            New Document
          </button>
        </div>

        {/* Keyboard Friendly Search */}
        <div className="px-3 py-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs text-slate-400 bg-slate-50 border-slate-200 cursor-pointer hover:bg-slate-100/70 hover:border-slate-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="text-[14px]">⌕</span>
              Search documents...
            </span>
            <kbd className="px-1 py-0.5 text-[9px] border bg-white border-slate-200 text-slate-400 rounded font-mono">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* WORKSPACE Section */}
        <div className="px-3 pt-2 mb-2 flex flex-col gap-0.5">
          <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full text-left px-2.5 py-1.5 rounded-md flex items-center gap-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-none bg-transparent cursor-pointer"
          >
            <span>⌂</span> Home
          </button>
        </div>

        {/* DOCUMENTS List Sections */}
        <div className="flex-1 overflow-y-auto px-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <DocSection
                title="My Documents"
                docs={owned}
                activeDocId={activeDocId}
                pinnedIds={pinnedIds}
                menuOpenId={menuOpenId}
                menuRef={menuRef}
                onNavigate={id => navigate(`/doc/${id}`)}
                onMenuToggle={setMenuOpenId}
                onPin={handlePin}
                onShare={handleShare}
                onCopyLink={handleCopyLink}
                onDelete={handleDelete}
                emptyMessage="No personal documents"
              />
              <div className="border-t border-slate-100 mx-1" />
              <DocSection
                title="Shared With Me"
                docs={shared}
                activeDocId={activeDocId}
                pinnedIds={pinnedIds}
                menuOpenId={menuOpenId}
                menuRef={menuRef}
                onNavigate={id => navigate(`/doc/${id}`)}
                onMenuToggle={setMenuOpenId}
                onPin={handlePin}
                onShare={handleShare}
                onCopyLink={handleCopyLink}
                emptyMessage="No shared documents"
              />
            </div>
          )}
        </div>

        {/* Footer Navigation (Settings & Help) */}
        <div className="p-2 border-t border-slate-100 flex flex-col gap-0.5">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-none bg-transparent cursor-pointer"
          >
            <span>⚙</span> Settings
          </button>
          <button
            onClick={() => setShortcutsOpen(true)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-none bg-transparent cursor-pointer"
          >
            <span>?</span> Help & Shortcuts
          </button>
        </div>
      </aside>

      {/* Modals */}
      <CreateDocModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <ShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
      {selectedDocForShare && (
        <ShareModal
          open={shareOpen}
          onClose={() => { setShareOpen(false); setSelectedDocForShare(null); }}
          documentId={selectedDocForShare.publicId}
        />
      )}
    </>
  );
}
