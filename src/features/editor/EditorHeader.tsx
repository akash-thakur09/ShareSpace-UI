import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ShareModal } from "../../components/ui/ShareModal";
import { CreateDocModal } from "../../components/ui/CreateDocModal";
import { ConnectionStatusBadge } from "../../components/ui/ConnectionStatusBadge";
import { PresenceAvatars } from "../presence/PresenceAvatars";
import type { AwarenessUser } from "../presence/useAwareness";
import type { ConnectionStatus } from "../../hooks/useConnectionStatus";
import { useAuth } from "../../contexts/useAuth";
import { documentService } from "../../services/document.service";

interface EditorHeaderProps {
  connectionStatus?: ConnectionStatus;
  documentId?: string;
  initialTitle?: string;
  awarenessUsers?: AwarenessUser[];
  onTitleSaved?: (title: string) => void;
  readOnly?: boolean;
}

export function EditorHeader({
  connectionStatus = "connecting",
  documentId,
  initialTitle = "Untitled Document",
  awarenessUsers = [],
  onTitleSaved,
  readOnly = false,
}: EditorHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle]       = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync title when initialTitle changes (e.g. after document loads)
  useEffect(() => { setTitle(initialTitle); }, [initialTitle]);

  async function persistTitle(newTitle: string) {
    if (!documentId || !newTitle.trim()) return;
    try {
      await documentService.update(documentId, { title: newTitle.trim() });
      onTitleSaved?.(newTitle.trim());
    } catch (err) {
      console.error("Failed to save title:", err);
    }
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    // Debounce save
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistTitle(value), 800);
  }

  function handleTitleBlur() {
    setIsEditing(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    persistTitle(title);
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <header
        className="flex items-center justify-between px-5 py-2.5 shrink-0"
        style={{
          background: "rgb(var(--color-bg-surface))",
          borderBottom: "1px solid rgb(var(--color-border))",
          boxShadow: "0 1px 3px rgb(0 0 0 / 0.04)",
        }}
      >
        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight hidden sm:block" style={{ color: "rgb(var(--color-text-primary))" }}>
              ShareSpace
            </span>
          </div>

          <div className="toolbar-sep" />

          {/* Document title */}
          <div className="flex items-center gap-2">
            {isEditing && !readOnly ? (
              <input
                type="text"
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={e => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
                className="input py-1 text-sm w-48"
                autoFocus
                maxLength={80}
              />
            ) : (
              <button
                onClick={() => { if (!readOnly) setIsEditing(true); }}
                className="text-sm font-medium px-2 py-1 rounded-md transition-colors border-none"
                style={{
                  color: "rgb(var(--color-text-secondary))",
                  background: "transparent",
                  cursor: readOnly ? "default" : "pointer",
                }}
                onMouseEnter={e => { if (!readOnly) e.currentTarget.style.background = "rgb(var(--color-bg-hover))"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                title={readOnly ? title : "Click to rename"}
              >
                {title}
              </button>
            )}
            <ConnectionStatusBadge status={connectionStatus} />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center mr-1">
            <PresenceAvatars users={awarenessUsers} />
          </div>

          {/* New Doc */}
          <button
            onClick={() => setCreateOpen(true)}
            className="btn text-xs px-3 py-1.5 gap-1.5 rounded-lg border cursor-pointer"
            style={{ background: "transparent", borderColor: "rgb(var(--color-border))", color: "rgb(var(--color-text-secondary))" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgb(var(--color-bg-hover))"; e.currentTarget.style.color = "rgb(var(--color-text-primary))"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgb(var(--color-text-secondary))"; }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Doc
          </button>

          {/* Share */}
          <button onClick={() => setShareOpen(true)} className="btn btn-primary text-xs px-3 py-1.5 gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>

          {/* User + Logout */}
          {user && (
            <div className="flex items-center gap-2 ml-1 pl-2" style={{ borderLeft: "1px solid rgb(var(--color-border))" }}>
              <span className="hidden sm:block text-xs" style={{ color: "rgb(var(--color-text-muted))" }}>
                {user.name || user.email}
              </span>
              <button onClick={handleLogout} className="btn-icon" title="Sign out">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} documentId={documentId} />
      <CreateDocModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
