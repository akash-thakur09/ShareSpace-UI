import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CreateDocModal } from "../../components/ui/CreateDocModal";
import { documentService, type Document, type DocumentRole } from "../../services/document.service";
import { sidebarEvents } from "../../services/sidebar-events";

// ── Helpers ───────────────────────────────────────────────────────────────────

const COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6"];

function colorForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

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

const ROLE_LABEL: Record<DocumentRole, string> = {
  owner: "Owner", editor: "Editor", commenter: "Commenter", viewer: "Viewer",
};

function DocIcon({ color }: { color: string }) {
  return (
    <div
      className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
      style={{ background: `${color}15`, border: `1px solid ${color}25` }}
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
  );
}

// ── DocSection — MUST be defined before DocumentSidebar ──────────────────────

interface DocSectionProps {
  title: string;
  docs: Document[];
  activeDocId?: string;
  pinnedIds: Set<string>;
  menuOpenId: string | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  search: string;
  onNavigate: (publicId: string) => void;
  onMenuToggle: (publicId: string | null) => void;
  onPin: (doc: Document) => void;
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
  search,
  onNavigate,
  onMenuToggle,
  onPin,
  onDelete,
  emptyMessage,
}: DocSectionProps) {
  const filtered = docs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  // If no docs at all and no empty message configured, hide the section entirely
  if (docs.length === 0 && !emptyMessage) return null;

  return (
    <div className="mb-2">
      <p
        className="px-2.5 py-1 text-xs font-semibold uppercase tracking-widest"
        style={{ color: "rgb(var(--color-text-faint))" }}
      >
        {title}
      </p>
      {docs.length === 0 ? (
        <p className="px-2.5 py-2 text-xs" style={{ color: "rgb(var(--color-text-faint))" }}>
          {emptyMessage}
        </p>
      ) : filtered.map(doc => {
        const color    = colorForId(doc.publicId);
        const isActive = doc.publicId === activeDocId;
        const isPinned = pinnedIds.has(doc.publicId);
        const menuOpen = menuOpenId === doc.publicId;

        return (
          <div key={doc.publicId} className="relative group">
            <button
              onClick={() => onNavigate(doc.publicId)}
              className="w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2.5 transition-all border-none cursor-pointer"
              style={{ background: isActive ? "rgb(var(--color-bg-hover))" : "transparent" }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgb(var(--color-bg-elevated))"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <DocIcon color={color} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  {isPinned && (
                    <svg className="h-2.5 w-2.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"
                      style={{ color: "rgb(99 102 241)" }}>
                      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                    </svg>
                  )}
                  <p
                    className="text-xs font-medium truncate"
                    style={{ color: isActive ? "rgb(var(--color-text-primary))" : "rgb(var(--color-text-secondary))" }}
                  >
                    {doc.title}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xs truncate" style={{ color: "rgb(var(--color-text-faint))" }}>
                    {relativeTime(doc.updatedAt)}
                  </p>
                  <span className="text-xs" style={{ color: "rgb(var(--color-text-faint))" }}>·</span>
                  <span className="text-xs" style={{ color: "rgb(var(--color-text-faint))" }}>
                    {ROLE_LABEL[doc.role]}
                  </span>
                </div>
              </div>
            </button>

            {/* ⋮ menu trigger */}
            <button
              onClick={e => { e.stopPropagation(); onMenuToggle(menuOpen ? null : doc.publicId); }}
              className="btn-icon absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ opacity: menuOpen ? 1 : undefined }}
              title="More options"
              aria-label="More options"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div
                ref={menuRef}
                className="absolute right-0 z-50 rounded-lg py-1 min-w-[130px]"
                style={{
                  top: "calc(100% - 4px)",
                  background: "rgb(var(--color-bg-surface))",
                  border: "1px solid rgb(var(--color-border))",
                  boxShadow: "0 8px 24px rgb(0 0 0 / 0.12)",
                }}
              >
                <button
                  onClick={() => onPin(doc)}
                  className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer border-none"
                  style={{ background: "transparent", color: "rgb(var(--color-text-secondary))" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgb(var(--color-bg-hover))"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                  </svg>
                  {isPinned ? "Unpin" : "Pin"}
                </button>
                {onDelete && (
                  <button
                    onClick={() => onDelete(doc)}
                    className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer border-none"
                    style={{ background: "transparent", color: "rgb(185 28 28)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgb(254 242 242)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── DocumentSidebar ───────────────────────────────────────────────────────────

interface DocumentSidebarProps {
  activeDocTitle?: string;
}

export function DocumentSidebar({ activeDocTitle }: DocumentSidebarProps = {}) {
  const { documentId: activeDocId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [createOpen, setCreateOpen]   = useState(false);
  const [owned, setOwned]             = useState<Document[]>([]);
  const [shared, setShared]           = useState<Document[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [pinnedIds, setPinnedIds]     = useState<Set<string>>(new Set());
  const [menuOpenId, setMenuOpenId]   = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentService.list();
      // Restore pinned state from API
      const apiPinned = new Set<string>();
      [...res.owned, ...res.shared].forEach(d => { if (d.isPinned) apiPinned.add(d.publicId); });
      setPinnedIds(apiPinned);
      // Sort: pinned first within each section
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

  // Refresh sidebar when permissions change (e.g. role updated via ShareModal)
  useEffect(() => sidebarEvents.onRefresh(fetchDocs), [fetchDocs]);

  // Sync active doc title into the list when it changes
  useEffect(() => {
    if (!activeDocId || !activeDocTitle) return;
    setOwned(prev => prev.map(d => d.publicId === activeDocId ? { ...d, title: activeDocTitle } : d));
    setShared(prev => prev.map(d => d.publicId === activeDocId ? { ...d, title: activeDocTitle } : d));
  }, [activeDocId, activeDocTitle]);

  // Close dropdown on outside click
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
    setOwned(prev => prev.filter(d => d.publicId !== doc.publicId));
    try {
      await documentService.delete(doc.publicId);
      if (doc.publicId === activeDocId) navigate("/", { replace: true });
    } catch {
      setOwned(prev => {
        const exists = prev.some(d => d.publicId === doc.publicId);
        return exists ? prev : [doc, ...prev];
      });
    }
  }

  async function handlePin(doc: Document) {
    setMenuOpenId(null);
    // Optimistic toggle
    const wasPin = pinnedIds.has(doc.publicId);
    setPinnedIds(prev => {
      const next = new Set(prev);
      wasPin ? next.delete(doc.publicId) : next.add(doc.publicId);
      return next;
    });
    try {
      const { isPinned } = await documentService.togglePin(doc.publicId);
      // Sync with server response
      setPinnedIds(prev => {
        const next = new Set(prev);
        isPinned ? next.add(doc.publicId) : next.delete(doc.publicId);
        return next;
      });
      // Re-sort sections
      const sortByPin = (docs: Document[], pinned: Set<string>) => [
        ...docs.filter(d => pinned.has(d.publicId)),
        ...docs.filter(d => !pinned.has(d.publicId)),
      ];
      setOwned(prev => sortByPin(prev, new Set([...pinnedIds].filter(id => id !== doc.publicId).concat(isPinned ? [doc.publicId] : []))));
      setShared(prev => sortByPin(prev, new Set([...pinnedIds].filter(id => id !== doc.publicId).concat(isPinned ? [doc.publicId] : []))));
    } catch {
      // Rollback
      setPinnedIds(prev => {
        const next = new Set(prev);
        wasPin ? next.add(doc.publicId) : next.delete(doc.publicId);
        return next;
      });
    }
  }

  if (isCollapsed) {
    return (
      <aside
        className="w-10 flex flex-col items-center py-3 gap-2 shrink-0"
        style={{ background: "rgb(var(--color-bg-surface))", borderRight: "1px solid rgb(var(--color-border))" }}
      >
        <button onClick={() => setIsCollapsed(false)} className="btn-icon" title="Expand sidebar">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </aside>
    );
  }

  return (
    <>
      <aside
        className="w-56 flex flex-col shrink-0"
        style={{ background: "rgb(var(--color-bg-surface))", borderRight: "1px solid rgb(var(--color-border))" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2.5"
          style={{ borderBottom: "1px solid rgb(var(--color-border))" }}
        >
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgb(var(--color-text-faint))" }}>
            Documents
          </span>
          <div className="flex items-center gap-0.5">
            <button className="btn-icon" title="New document" onClick={() => setCreateOpen(true)}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button onClick={() => setIsCollapsed(true)} className="btn-icon" title="Collapse">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5" style={{ borderBottom: "1px solid rgb(var(--color-border))" }}>
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ color: "rgb(var(--color-text-faint))" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input py-1.5 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div
                className="h-4 w-4 animate-spin rounded-full border-2"
                style={{ borderColor: "rgb(var(--color-border))", borderTopColor: "rgb(99 102 241)" }}
              />
            </div>
          ) : owned.length === 0 && shared.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: "rgb(var(--color-text-faint))" }}>
              {search ? "No documents found" : "No documents yet"}
            </p>
          ) : (
            <>
              <DocSection
                title="My Documents"
                docs={owned}
                activeDocId={activeDocId}
                pinnedIds={pinnedIds}
                menuOpenId={menuOpenId}
                menuRef={menuRef}
                search={search}
                onNavigate={id => navigate(`/doc/${id}`)}
                onMenuToggle={setMenuOpenId}
                onPin={handlePin}
                onDelete={handleDelete}
              />
              <DocSection
                title="Shared With Me"
                docs={shared}
                activeDocId={activeDocId}
                pinnedIds={pinnedIds}
                menuOpenId={menuOpenId}
                menuRef={menuRef}
                search={search}
                onNavigate={id => navigate(`/doc/${id}`)}
                onMenuToggle={setMenuOpenId}
                onPin={handlePin}
                emptyMessage="No documents shared with you yet"
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-2" style={{ borderTop: "1px solid rgb(var(--color-border))" }}>
          <button
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all border-none cursor-pointer"
            style={{ color: "rgb(var(--color-text-muted))", background: "transparent" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgb(var(--color-bg-elevated))"; e.currentTarget.style.color = "rgb(var(--color-text-secondary))"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgb(var(--color-text-muted))"; }}
            onClick={fetchDocs}
            title="Refresh document list"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </aside>

      <CreateDocModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
