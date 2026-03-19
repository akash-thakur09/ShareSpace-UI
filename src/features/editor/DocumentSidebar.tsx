import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CreateDocModal } from "../../components/ui/CreateDocModal";
import { documentService, type Document } from "../../services/document.service";

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

const DocIcon = ({ color }: { color: string }) => (
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

export function DocumentSidebar() {
  const { documentId: activeDocId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [createOpen, setCreateOpen]   = useState(false);
  const [docs, setDocs]               = useState<Document[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");

  const fetchDocs = useCallback(async () => {
    try {
      const list = await documentService.list();
      setDocs(list);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleCreated = (publicId: string) => {
    fetchDocs(); // refresh list
    navigate(`/doc/${publicId}`);
  };

  const filtered = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

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

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div
                className="h-4 w-4 animate-spin rounded-full border-2"
                style={{ borderColor: "rgb(var(--color-border))", borderTopColor: "rgb(99 102 241)" }}
              />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: "rgb(var(--color-text-faint))" }}>
              {search ? "No documents found" : "No documents yet"}
            </p>
          ) : filtered.map((doc) => {
            const color    = colorForId(doc.publicId);
            const isActive = doc.publicId === activeDocId;
            return (
              <button
                key={doc.publicId}
                onClick={() => navigate(`/doc/${doc.publicId}`)}
                className="w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2.5 transition-all border-none cursor-pointer"
                style={{ background: isActive ? "rgb(var(--color-bg-hover))" : "transparent" }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgb(var(--color-bg-elevated))"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <DocIcon color={color} />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-medium truncate"
                    style={{ color: isActive ? "rgb(var(--color-text-primary))" : "rgb(var(--color-text-secondary))" }}
                  >
                    {doc.title}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "rgb(var(--color-text-faint))" }}>
                    {relativeTime(doc.updatedAt)}
                  </p>
                </div>
              </button>
            );
          })}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
