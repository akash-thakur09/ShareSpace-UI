import { useState } from "react";

export function DocumentSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const documents = [
    { id: 1, title: "Project Proposal", date: "2 hours ago", icon: "📄" },
    { id: 2, title: "Meeting Notes", date: "Yesterday", icon: "📝" },
    { id: 3, title: "Design System", date: "2 days ago", icon: "🎨" },
    { id: 4, title: "API Documentation", date: "1 week ago", icon: "📚" },
  ];

  if (isCollapsed) {
    return (
      <aside className="w-12 border-r border-slate-800 bg-slate-900/30 flex flex-col items-center py-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="btn-icon"
          title="Expand sidebar"
        >
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/30 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-200">Documents</h3>
        <div className="flex items-center gap-1">
          <button className="btn-icon" title="New document">
            <svg
              className="h-4 w-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="btn-icon"
            title="Collapse sidebar"
          >
            <svg
              className="h-4 w-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-800">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search documents..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {documents.map((doc) => (
            <button
              key={doc.id}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <span className="text-lg">{doc.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate group-hover:text-slate-100">
                    {doc.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{doc.date}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 p-3">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800/50 hover:text-slate-300 transition-colors">
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          View History
        </button>
      </div>
    </aside>
  );
}
