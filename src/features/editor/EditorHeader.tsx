import { useState } from "react";
import { ShareModal } from "../../components/ui/ShareModal";
import { CreateDocModal } from "../../components/ui/CreateDocModal";

export function EditorHeader() {
  const [title, setTitle] = useState("Untitled Document");
  const [isEditing, setIsEditing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

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
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => { if (e.key === "Enter") setIsEditing(false); }}
                className="input py-1 text-sm w-48"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm font-medium px-2 py-1 rounded-md transition-colors border-none cursor-pointer"
                style={{ color: "rgb(var(--color-text-secondary))", background: "transparent" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgb(var(--color-bg-hover))")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                title="Click to rename"
              >
                {title}
              </button>
            )}
            <span className="badge badge-live">Live</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Collaborator avatars */}
          <div className="hidden md:flex items-center -space-x-2 mr-1">
            {[
              { initials: "JD", from: "#6366f1", to: "#8b5cf6" },
              { initials: "AS", from: "#06b6d4", to: "#3b82f6" },
              { initials: "+2", from: "#10b981", to: "#059669" },
            ].map((u) => (
              <div
                key={u.initials}
                className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, ${u.from}, ${u.to})`,
                  boxShadow: "0 0 0 2px rgb(255 255 255)",
                }}
              >
                {u.initials}
              </div>
            ))}
          </div>

          {/* New Doc */}
          <button
            onClick={() => setCreateOpen(true)}
            className="btn text-xs px-3 py-1.5 gap-1.5 rounded-lg border cursor-pointer"
            style={{
              background: "transparent",
              borderColor: "rgb(var(--color-border))",
              color: "rgb(var(--color-text-secondary))",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgb(var(--color-bg-hover))";
              e.currentTarget.style.color = "rgb(var(--color-text-primary))";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgb(var(--color-text-secondary))";
            }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Doc
          </button>

          {/* Share */}
          <button
            onClick={() => setShareOpen(true)}
            className="btn btn-primary text-xs px-3 py-1.5 gap-1.5"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>

          {/* More */}
          <button className="btn-icon">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </header>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
      <CreateDocModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
