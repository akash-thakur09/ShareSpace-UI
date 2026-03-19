import { useState, useRef, useEffect } from "react";
import { aiService, type AiAction } from "../../services/ai.service";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS: { action: AiAction; icon: string; label: string; desc: string }[] = [
  { action: "improve",   icon: "✦", label: "Improve writing", desc: "Make it more professional" },
  { action: "summarize", icon: "◈", label: "Summarize",       desc: "Create a brief summary" },
  { action: "grammar",   icon: "◎", label: "Fix grammar",     desc: "Check spelling and errors" },
];

interface AiAssistantPanelProps {
  /** Current editor text content — passed in so AI can act on it */
  editorContent?: string;
}

export function AiAssistantPanel({ editorContent = "" }: AiAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(action: AiAction, customPrompt?: string) {
    const content = editorContent || input.trim();
    if (!content && action !== "custom") {
      setError("No content to process. Type something in the editor first.");
      return;
    }
    const userText = action === "custom"
      ? (customPrompt || input.trim())
      : `${SUGGESTIONS.find(s => s.action === action)?.label}: ${content.slice(0, 80)}${content.length > 80 ? "…" : ""}`;

    if (!userText) return;

    setMessages(prev => [...prev, { role: "user", text: userText }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const { reply } = await aiService.chat({
        action,
        content: content || userText,
        prompt: action === "custom" ? userText : undefined,
      });
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed");
      setMessages(prev => prev.slice(0, -1)); // remove optimistic user message
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    await sendMessage("custom", input.trim());
  }

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
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="ml-auto btn-icon text-xs"
            title="Clear chat"
            style={{ color: "rgb(var(--color-text-faint))" }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <>
            {/* Empty state */}
            <div className="flex flex-col items-center text-center pt-2 pb-2">
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "rgb(var(--color-bg-elevated))", border: "1px solid rgb(var(--color-border))" }}
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

            {/* Quick actions */}
            <div className="space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.action}
                  onClick={() => sendMessage(s.action)}
                  disabled={loading}
                  className="w-full text-left px-3.5 py-3 rounded-xl transition-all cursor-pointer border"
                  style={{
                    background: "rgb(var(--color-bg-elevated))",
                    borderColor: "rgb(var(--color-border))",
                    opacity: loading ? 0.6 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!loading) {
                      e.currentTarget.style.background = "rgb(var(--color-bg-overlay))";
                      e.currentTarget.style.borderColor = "rgb(99 102 241 / 0.35)";
                    }
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
          </>
        ) : (
          /* Chat messages */
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap"
                style={msg.role === "user" ? {
                  background: "rgb(99 102 241)",
                  color: "#fff",
                } : {
                  background: "rgb(var(--color-bg-elevated))",
                  border: "1px solid rgb(var(--color-border))",
                  color: "rgb(var(--color-text-primary))",
                }}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-xl px-3 py-2 flex items-center gap-1.5"
              style={{ background: "rgb(var(--color-bg-elevated))", border: "1px solid rgb(var(--color-border))" }}
            >
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="rounded-lg px-3 py-2 text-xs"
            style={{ background: "rgb(254 242 242)", color: "rgb(185 28 28)", border: "1px solid rgb(254 202 202)" }}
          >
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 shrink-0" style={{ borderTop: "1px solid rgb(var(--color-border))" }}>
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI anything..."
            rows={2}
            disabled={loading}
            className="input flex-1 resize-none text-xs leading-relaxed py-2"
            style={{ minHeight: "56px" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
          />
          <button
            type="submit"
            className="btn btn-primary p-2 self-end shrink-0"
            disabled={!input.trim() || loading}
            style={{ opacity: !input.trim() || loading ? 0.5 : 1 }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        <p className="text-xs mt-2" style={{ color: "rgb(var(--color-text-faint))" }}>
          AI can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
}
