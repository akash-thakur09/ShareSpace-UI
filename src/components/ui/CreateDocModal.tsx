import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "./Modal";
import { documentService } from "../../services/document.service";

interface CreateDocModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (publicId: string, title: string) => void;
}

const DOC_TYPES = [
  { value: "blank",    label: "Blank",         icon: "□", desc: "Start from scratch" },
  { value: "notes",   label: "Notes",          icon: "✎", desc: "Quick notes & ideas" },
  { value: "project", label: "Project Doc",    icon: "◈", desc: "Structured project plan" },
  { value: "meeting", label: "Meeting Notes",  icon: "◉", desc: "Agenda & action items" },
];

export function CreateDocModal({ open, onClose, onCreated }: CreateDocModalProps) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [type, setType] = useState("blank");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = name.trim() || "Untitled Document";
    setLoading(true);
    setError("");
    try {
      const doc = await documentService.create({ title, metadata: { type } });
      onCreated?.(doc.publicId, title);
      handleClose();
      navigate(`/doc/${doc.publicId}`);
    } catch {
      setError("Failed to create document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setType("blank");
    setError("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="New Document">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "rgb(var(--color-text-secondary))" }}>
            Document name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled Document"
            className="input"
            autoFocus
            maxLength={80}
          />
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "rgb(var(--color-text-secondary))" }}>
            Document type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DOC_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all border cursor-pointer"
                style={{
                  background: type === t.value ? "rgb(99 102 241 / 0.06)" : "rgb(var(--color-bg-elevated))",
                  borderColor: type === t.value ? "rgb(99 102 241 / 0.4)" : "rgb(var(--color-border))",
                  boxShadow: type === t.value ? "0 0 0 3px rgb(99 102 241 / 0.08)" : "none",
                }}
              >
                <span
                  className="text-base leading-none w-5 text-center shrink-0"
                  style={{ color: type === t.value ? "rgb(99 102 241)" : "rgb(var(--color-text-muted))" }}
                >
                  {t.icon}
                </span>
                <div>
                  <p
                    className="text-xs font-medium"
                    style={{ color: type === t.value ? "rgb(79 70 229)" : "rgb(var(--color-text-secondary))" }}
                  >
                    {t.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "rgb(var(--color-text-faint))" }}>
                    {t.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs" style={{ color: "rgb(var(--color-error))" }}>{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="btn text-xs px-4 py-2 rounded-lg border cursor-pointer"
            style={{
              background: "transparent",
              borderColor: "rgb(var(--color-border))",
              color: "rgb(var(--color-text-secondary))",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary text-xs px-4 py-2"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Creating...
              </span>
            ) : "Create Document"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
