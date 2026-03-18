import { useState } from "react";
import { Modal } from "./Modal";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShareModal({ open, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = window.location.href;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement("textarea");
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Share Document">
      <div className="flex flex-col gap-4">
        {/* Info */}
        <p className="text-xs leading-relaxed" style={{ color: "rgb(var(--color-text-muted))" }}>
          Anyone with this link can view and collaborate on this document in real time.
        </p>

        {/* Link row */}
        <div className="flex gap-2">
          <div
            className="flex-1 flex items-center px-3 rounded-lg text-xs truncate"
            style={{
              background: "rgb(var(--color-bg-elevated))",
              border: "1px solid rgb(var(--color-border))",
              color: "rgb(var(--color-text-secondary))",
              height: "36px",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span className="truncate">{shareUrl}</span>
          </div>
          <button
            onClick={handleCopy}
            className="btn btn-primary shrink-0 px-3 text-xs gap-1.5 transition-all"
            style={{ minWidth: "90px" }}
          >
            {copied ? (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid rgb(var(--color-border))" }} />

        {/* Access note */}
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgb(99 102 241 / 0.08)", border: "1px solid rgb(99 102 241 / 0.15)" }}
          >
            <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
          </div>
          <p className="text-xs" style={{ color: "rgb(var(--color-text-muted))" }}>
            Collaboration is live — changes sync in real time for everyone with the link.
          </p>
        </div>
      </div>
    </Modal>
  );
}
