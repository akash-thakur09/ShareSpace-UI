import { useState } from "react";

const suggestions = [
  { icon: "✦", label: "Improve writing", desc: "Make it more professional" },
  { icon: "◈", label: "Summarize", desc: "Create a brief summary" },
  { icon: "◎", label: "Fix grammar", desc: "Check spelling and errors" },
];

export function AiAssistantPanel() {
  const [input, setInput] = useState("");

  return (
    <div className="flex h-full flex-col" style={{ background: "rgb(var(--color-bg-surface))" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid rgb(var(--color-border))" }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-sm shrink-0">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "rgb(var(--color-text-primary))" }}>
            AI Assistant
          </p>
          <p className="text-xs" style={{ color: "rgb(var(--color-text-faint))" }}>
            Powered by GPT-4
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">
        {/* Empty state */}
        <div className="flex flex-col items-center text-center pt-4 pb-2">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center mb-3"
            style={{
              background: "rgb(var(--color-bg-elevated))",
              border: "1px solid rgb(var(--color-border))",
            }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ color: "rgb(var(--color-text-faint))" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: "rgb(var(--color-text-secondary))" }}>
            How can I help?
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "rgb(var(--color-text-muted))" }}>
            Ask me to summarize, rewrite, or improve your content
          </p>
        </div>

        {/* Suggestions */}
        <div className="space-y-1.5">
          {suggestions.map((s) => (
            <button
              key={s.label}
              className="w-full text-left px-3.5 py-3 rounded-xl transition-all cursor-pointer border"
              style={{
                background: "rgb(var(--color-bg-elevated))",
                borderColor: "rgb(var(--color-border))",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgb(var(--color-bg-overlay))";
                e.currentTarget.style.borderColor = "rgb(99 102 241 / 0.35)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgb(var(--color-bg-elevated))";
                e.currentTarget.style.borderColor = "rgb(var(--color-border))";
              }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-indigo-500 text-base leading-none">{s.icon}</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "rgb(var(--color-text-secondary))" }}>
                    {s.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "rgb(var(--color-text-faint))" }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 shrink-0" style={{ borderTop: "1px solid rgb(var(--color-border))" }}>
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI anything..."
            rows={2}
            className="input flex-1 resize-none text-xs leading-relaxed py-2"
            style={{ minHeight: "56px" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && input.trim()) {
                e.preventDefault();
                setInput("");
              }
            }}
          />
          <button
            className="btn btn-primary p-2 self-end shrink-0"
            disabled={!input.trim()}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: "rgb(var(--color-text-faint))" }}>
          AI can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
}
