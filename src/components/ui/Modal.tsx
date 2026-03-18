import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, children, width = "420px" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgb(0 0 0 / 0.35)", backdropFilter: "blur(2px)", animation: "fadeIn 150ms ease" }}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative flex flex-col rounded-2xl w-full"
        style={{
          maxWidth: width,
          background: "rgb(var(--color-bg-surface))",
          border: "1px solid rgb(var(--color-border))",
          boxShadow: "0 20px 60px rgb(0 0 0 / 0.15), 0 4px 16px rgb(0 0 0 / 0.08)",
          animation: "scaleIn 150ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgb(var(--color-border))" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "rgb(var(--color-text-primary))" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="btn-icon -mr-1"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
