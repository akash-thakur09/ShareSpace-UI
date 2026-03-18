import { useState } from "react";

export function AiAssistantPanel() {
  const [input, setInput] = useState("");

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">AI Assistant</h2>
            <p className="text-xs text-slate-400">Powered by GPT-4</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="text-sm text-slate-400 text-center py-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 mb-3">
            <svg
              className="h-6 w-6 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <p className="text-slate-300 font-medium mb-1">How can I help you?</p>
          <p className="text-xs">Ask me to summarize, rewrite, or improve your content</p>
        </div>

        {/* Example suggestions */}
        <div className="space-y-2">
          <button className="w-full text-left px-4 py-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors text-sm text-slate-300 border border-slate-700/50">
            <span className="block font-medium mb-1">✨ Improve writing</span>
            <span className="text-xs text-slate-400">Make it more professional</span>
          </button>
          <button className="w-full text-left px-4 py-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors text-sm text-slate-300 border border-slate-700/50">
            <span className="block font-medium mb-1">📝 Summarize</span>
            <span className="text-xs text-slate-400">Create a brief summary</span>
          </button>
          <button className="w-full text-left px-4 py-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors text-sm text-slate-300 border border-slate-700/50">
            <span className="block font-medium mb-1">🔍 Find errors</span>
            <span className="text-xs text-slate-400">Check grammar and spelling</span>
          </button>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-800 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI anything..."
            className="input flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) {
                // Handle send
                setInput("");
              }
            }}
          />
          <button
            className="btn-primary px-4"
            disabled={!input.trim()}
          >
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
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
