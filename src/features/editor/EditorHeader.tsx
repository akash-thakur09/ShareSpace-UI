import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ShareModal } from "../../components/ui/ShareModal";
import { ConnectionStatusBadge } from "../../components/ui/ConnectionStatusBadge";
import { PresenceAvatars } from "../presence/PresenceAvatars";
import type { AwarenessUser } from "../presence/useAwareness";
import type { ConnectionStatus } from "../../hooks/useConnectionStatus";
import { useAuth } from "../../contexts/useAuth";
import { documentService } from "../../services/document.service";
import { sidebarEvents } from "../../services/sidebar-events";

interface EditorHeaderProps {
  connectionStatus?: ConnectionStatus;
  documentId?: string;
  initialTitle?: string;
  awarenessUsers?: AwarenessUser[];
  onTitleSaved?: (title: string) => void;
  readOnly?: boolean;
  commentsOpen?: boolean;
  onToggleComments?: () => void;
  aiOpen?: boolean;
  onToggleAi?: () => void;
  versionHistoryOpen?: boolean;
  onToggleVersionHistory?: () => void;
  userRole?: string | null;
}

export function EditorHeader({
  connectionStatus = "connecting",
  documentId,
  initialTitle = "Untitled Document",
  awarenessUsers = [],
  commentsOpen = false,
  onToggleComments,
  aiOpen = false,
  onToggleAi,
  onToggleVersionHistory,
  userRole = null,
}: EditorHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [shareOpen, setShareOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Sync pinned status on mount/update
  useEffect(() => {
    if (!documentId) return;
    documentService.get(documentId)
      .then(doc => setIsPinned(doc.isPinned ?? false))
      .catch(() => {});
  }, [documentId]);

  // Click outside options dropdown handler
  useEffect(() => {
    if (!optionsOpen) return;
    function handler(e: MouseEvent) {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setOptionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [optionsOpen]);

  async function handlePinToggle() {
    if (!documentId) return;
    setOptionsOpen(false);
    try {
      const res = await documentService.togglePin(documentId);
      setIsPinned(res.isPinned);
      sidebarEvents.emitRefresh();
    } catch (err) {
      console.error("Failed to pin document", err);
    }
  }

  async function handleCopyLink() {
    setOptionsOpen(false);
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    } catch {
      alert("Failed to copy link");
    }
  }

  async function handleDelete() {
    if (!documentId) return;
    setOptionsOpen(false);
    if (!window.confirm(`Are you sure you want to delete "${initialTitle}"?`)) return;
    try {
      await documentService.delete(documentId);
      sidebarEvents.emitRefresh();
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Failed to delete document", err);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const canSeeComments = userRole !== 'viewer';

  return (
    <>
      <header
        className="flex items-center justify-between px-5 py-2.5 shrink-0"
        style={{
          background: "rgb(var(--color-bg-surface))",
          borderBottom: "1px solid rgb(var(--color-border))",
        }}
      >
        {/* Left Side: Breadcrumbs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <button
              onClick={() => navigate("/")}
              className="hover:text-slate-800 transition-colors bg-transparent border-none cursor-pointer p-0 font-medium"
            >
              ShareSpace
            </button>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-700 max-w-[140px] truncate" title={initialTitle}>
              {initialTitle}
            </span>
          </div>

          <div className="w-[1px] h-3.5 bg-slate-200" />
          <ConnectionStatusBadge status={connectionStatus} />
        </div>

        {/* Right Side: Collab indicators & Actions */}
        <div className="flex items-center gap-2">
          {/* Active Collaborators presence display */}
          <div className="flex items-center mr-1">
            <PresenceAvatars users={awarenessUsers} />
          </div>

          {/* Comments Panel Toggle */}
          {canSeeComments && onToggleComments && (
            <button
              onClick={onToggleComments}
              className="btn text-xs px-2.5 py-1.5 rounded-lg border hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
              style={{
                background: commentsOpen ? 'rgb(99 102 241 / 0.08)' : 'transparent',
                borderColor: commentsOpen ? 'rgb(99 102 241 / 0.4)' : 'rgb(var(--color-border))',
                color: commentsOpen ? 'rgb(99 102 241)' : undefined,
              }}
              title="Toggle comments"
            >
              💬 Comments
            </button>
          )}

          {/* AI Panel Toggle */}
          {onToggleAi && (
            <button
              onClick={onToggleAi}
              className="btn text-xs px-2.5 py-1.5 rounded-lg border hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
              style={{
                background: aiOpen ? 'rgb(99 102 241 / 0.08)' : 'transparent',
                borderColor: aiOpen ? 'rgb(99 102 241 / 0.4)' : 'rgb(var(--color-border))',
                color: aiOpen ? 'rgb(99 102 241)' : undefined,
              }}
              title="Toggle AI Assistant"
            >
              ✦ AI Assistant
            </button>
          )}

          {/* Share Trigger Button */}
          <button
            onClick={() => setShareOpen(true)}
            className="btn btn-primary text-xs px-3.5 py-1.5 shadow-sm font-semibold"
          >
            Share
          </button>

          {/* More options menu trigger */}
          <div className="relative" ref={optionsRef}>
            <button
              onClick={() => setOptionsOpen(!optionsOpen)}
              className="btn-icon border border-slate-200 text-slate-500 hover:text-slate-700"
              title="Document settings"
              style={{ padding: "5px" }}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>

            {optionsOpen && (
              <div
                className="absolute right-0 mt-1 z-50 rounded-lg py-1 min-w-[150px] shadow-lg animate-scaleIn"
                style={{
                  background: "rgb(var(--color-bg-surface))",
                  border: "1px solid rgb(var(--color-border))",
                }}
              >
                <button
                  onClick={handlePinToggle}
                  className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer border-none bg-transparent hover:bg-slate-50 text-slate-700"
                >
                  <span>★</span>
                  {isPinned ? "Unpin document" : "Pin document"}
                </button>
                <button
                  onClick={handleCopyLink}
                  className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer border-none bg-transparent hover:bg-slate-50 text-slate-700"
                >
                  <span>🔗</span>
                  Copy link
                </button>
                {onToggleVersionHistory && (
                  <button
                    onClick={() => { setOptionsOpen(false); onToggleVersionHistory(); }}
                    className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer border-none bg-transparent hover:bg-slate-50 text-slate-700 border-b border-slate-100"
                  >
                    <span>🕒</span>
                    Version history
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer border-none bg-transparent hover:bg-red-50 text-red-600"
                >
                  <span>🗑</span>
                  Delete document
                </button>
              </div>
            )}
          </div>

          {/* User Section & Logout */}
          {user && (
            <div className="flex items-center gap-2 ml-1 pl-2 border-l border-slate-200">
              <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shadow-sm border border-slate-200">
                {(user.name || user.email || 'US').slice(0,2).toUpperCase()}
              </div>
              <button onClick={handleLogout} className="btn-icon hover:text-red-500" title="Sign out">
                <svg className="h-3.8 w-3.8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Share dialog modal */}
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} documentId={documentId} />
    </>
  );
}
