import { useState } from "react";

export function EditorHeader() {
  const [title, setTitle] = useState("Untitled Document");
  const [isEditing, setIsEditing] = useState(false);

  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm px-6 py-3">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <span className="text-lg font-semibold text-slate-100 hidden sm:block">ShareSpace</span>
        </div>

        {/* Document Title */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setIsEditing(false);
              }}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-slate-300 hover:text-slate-100 transition-colors px-2 py-1 rounded hover:bg-slate-800"
            >
              {title}
            </button>
          )}
          <span className="badge badge-primary text-xs">Live</span>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Collaborators */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex -space-x-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 border-2 border-slate-900 flex items-center justify-center text-xs font-medium text-white">
              JD
            </div>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 border-2 border-slate-900 flex items-center justify-center text-xs font-medium text-white">
              AS
            </div>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 border-2 border-slate-900 flex items-center justify-center text-xs font-medium text-white">
              +3
            </div>
          </div>
        </div>

        {/* Share Button */}
        <button className="btn-primary text-sm">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          Share
        </button>

        {/* Menu */}
        <button className="btn-icon">
          <svg
            className="h-5 w-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
