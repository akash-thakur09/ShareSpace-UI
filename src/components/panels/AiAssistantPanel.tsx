import { useState, useRef, useEffect } from "react";
import { aiService, type AiAction } from "../../services/ai.service";
import { Editor } from "@tiptap/react";

interface Message {
  role: "user" | "assistant";
  text: string;
  isSelectionAction?: boolean;
}

interface AiAssistantPanelProps {
  editor?: Editor;
  open: boolean;
  onClose: () => void;
}

const GLOBAL_ACTIONS: { action: AiAction; icon: string; label: string; desc: string }[] = [
  { action: "improve",   icon: "✦", label: "Improve Writing", desc: "Make the content more professional" },
  { action: "summarize", icon: "◈", label: "Summarize",       desc: "Create a brief summary of the doc" },
  { action: "grammar",   icon: "◎", label: "Fix Grammar",     desc: "Check spelling and formatting" },
];

const SELECTION_ACTIONS: { action: AiAction; label: string; prompt: string }[] = [
  { action: "custom", label: "Improve writing", prompt: "Improve the writing of the following text: " },
  { action: "custom", label: "Make it professional", prompt: "Rewrite the following text to be more professional: " },
  { action: "custom", label: "Shorten", prompt: "Shorten and simplify the following text: " },
  { action: "custom", label: "Expand", prompt: "Expand the following text with more detail: " },
  { action: "custom", label: "Summarize selection", prompt: "Summarize the following text concisely: " },
  { action: "custom", label: "Fix grammar", prompt: "Fix the spelling and grammar of the following text: " },
];

export function AiAssistantPanel({ editor, open, onClose }: AiAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Get current selection from TipTap
  const getEditorSelection = () => {
    if (!editor || editor.isDestroyed) return "";
    const { from, to } = editor.state.selection;
    if (from === to) return "";
    return editor.state.doc.textBetween(from, to, " ");
  };

  const selectionText = getEditorSelection();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(action: AiAction, customPromptText?: string) {
    const selected = getEditorSelection();
    const docText = editor?.getText() || "";
    
    // Choose content context (selection first, then doc, then prompt)
    const contextContent = selected || docText || input.trim();
    if (!contextContent && action !== "custom") {
      setError("No document content or selection available to process.");
      return;
    }

    let userText = "";
    const finalPrompt = customPromptText;

    if (selected) {
      // Selection specific behavior
      userText = `Selection Action (${selected.slice(0, 30)}${selected.length > 30 ? "..." : ""})`;
    } else {
      userText = action === "custom"
        ? (customPromptText || input.trim())
        : `${GLOBAL_ACTIONS.find(s => s.action === action)?.label || action}`;
    }

    if (!userText) return;

    setMessages(prev => [...prev, { role: "user", text: userText, isSelectionAction: !!selected }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const { reply } = await aiService.chat({
        action,
        content: contextContent,
        prompt: finalPrompt || (action === "custom" ? userText : undefined),
      });
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed");
      setMessages(prev => prev.slice(0, -1)); // remove user msg on error
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    await sendMessage("custom", input.trim());
  }

  // Insert responses back into editor
  function handleReplaceSelection(text: string) {
    if (!editor) return;
    editor.chain().focus().insertContent(text).run();
  }

  function handleInsertBelow(text: string) {
    if (!editor) return;
    editor.chain().focus().insertContent("\n" + text).run();
  }

  async function handleCopyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert("AI reply copied to clipboard!");
    } catch {
      alert("Failed to copy response.");
    }
  }

  if (!open) return null;

  return (
    <aside
      className="w-76 flex flex-col shrink-0 border-l animate-slideInRight"
      style={{
        background: "rgb(var(--color-bg-surface))",
        borderColor: "rgb(var(--color-border))",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid rgb(var(--color-border))" }}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 shadow-sm shrink-0">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-800">
            AI Assistant
          </p>
          <p className="text-[10px] text-slate-400">
            Powered by GPT-4
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="btn-icon p-1"
            title="Clear conversation"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
        <button onClick={onClose} className="btn-icon p-1" aria-label="Close panel">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 flex flex-col gap-3">
        {selectionText && (
          <div className="rounded-lg p-2.5 bg-indigo-50/50 border border-indigo-100/50 text-[10px] text-indigo-700">
            <span className="font-bold">Selection detected</span> ({selectionText.length} characters). AI actions will apply to selected text.
          </div>
        )}

        {messages.length === 0 ? (
          <>
            {/* Empty State */}
            <div className="flex flex-col items-center text-center py-6">
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center border mb-3">
                <span className="text-slate-400 text-lg">✦</span>
              </div>
              <p className="text-xs font-semibold text-slate-700 mb-0.5">
                How can I help?
              </p>
              <p className="text-[10px] text-slate-400 leading-relaxed px-4">
                Ask me to improve, summarize, or edit your document content.
              </p>
            </div>

            {/* Quick Context actions */}
            <div className="flex flex-col gap-1.5 mt-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 px-1">
                Suggested Actions
              </p>
              {selectionText ? (
                // Selected text options
                <div className="grid grid-cols-2 gap-1.5">
                  {SELECTION_ACTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage("custom", `${s.prompt}"${selectionText}"`)}
                      className="text-left px-2.5 py-2.5 rounded-lg border text-[10px] font-medium bg-slate-50 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 text-slate-700 cursor-pointer transition-all"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              ) : (
                // Global options
                GLOBAL_ACTIONS.map((s) => (
                  <button
                    key={s.action}
                    onClick={() => sendMessage(s.action)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer bg-slate-50 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20"
                  >
                    <span className="text-indigo-500 text-sm">{s.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-700">
                        {s.label}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate mt-0.5">
                        {s.desc}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          /* Conversation messages */
          messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div key={i} className="flex flex-col gap-1.5">
                <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[90%] rounded-xl px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap shadow-sm border border-transparent"
                    style={isUser ? {
                      background: "rgb(99 102 241)",
                      color: "#ffffff",
                    } : {
                      background: "#ffffff",
                      borderColor: "rgb(var(--color-border))",
                      color: "rgb(var(--color-text-secondary))",
                    }}
                  >
                    {msg.text}
                  </div>
                </div>

                {/* Assistant insertion action shortcuts */}
                {!isUser && (
                  <div className="flex gap-1.5 justify-start pl-1">
                    {editor && (
                      <>
                        <button
                          onClick={() => handleReplaceSelection(msg.text)}
                          className="px-2 py-0.5 rounded border text-[9px] font-semibold bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          Replace Selection
                        </button>
                        <button
                          onClick={() => handleInsertBelow(msg.text)}
                          className="px-2 py-0.5 rounded border text-[9px] font-semibold bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Insert below
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleCopyToClipboard(msg.text)}
                      className="px-2 py-0.5 rounded border text-[9px] font-semibold bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Bounce dots */}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl px-3 py-2 flex items-center gap-1.5 bg-slate-50 border border-slate-100">
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

        {/* Errors display */}
        {error && (
          <div className="rounded-lg px-3 py-2 text-xs bg-red-50 text-red-700 border border-red-200 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input query form */}
      <div className="p-3 shrink-0 border-t" style={{ borderColor: "rgb(var(--color-border))" }}>
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI anything..."
            rows={2}
            disabled={loading}
            className="input flex-1 resize-none text-[11px] leading-normal py-2"
            style={{ minHeight: "48px" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
          />
          <button
            type="submit"
            className="btn btn-primary p-2 self-end shrink-0"
            disabled={!input.trim() || loading}
            style={{ opacity: !input.trim() || loading ? 0.5 : 1 }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        <p className="text-[10px] mt-2 text-center" style={{ color: "rgb(var(--color-text-faint))" }}>
          Verify crucial information.
        </p>
      </div>
    </aside>
  );
}
