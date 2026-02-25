import { Editor } from "@tiptap/react";

interface EditorToolbarProps {
  editor: Editor;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  icon: React.ReactNode;
  label: string;
}

const ToolbarButton = ({
  onClick,
  isActive = false,
  icon,
  label,
}: ToolbarButtonProps) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all
      ${
        isActive
          ? "bg-indigo-600 text-white"
          : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
      }
    `}
    title={label}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const Divider = () => <div className="h-6 w-px bg-slate-700" />;

export function EditorToolbar({ editor }: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/30 px-4 py-2 overflow-x-auto scrollbar-hide">
      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
          </svg>
        }
        label="Bold"
      />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        }
        label="Italic"
      />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M9 5l6 14M15 5L9 19" />
          </svg>
        }
        label="Strike"
      />

      <Divider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        icon={<span className="text-base font-bold">H1</span>}
        label="Heading 1"
      />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        icon={<span className="text-sm font-bold">H2</span>}
        label="Heading 2"
      />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        icon={<span className="text-xs font-bold">H3</span>}
        label="Heading 3"
      />

      <Divider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        }
        label="Bullet List"
      />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01" />
          </svg>
        }
        label="Numbered List"
      />

      <Divider />

      {/* Code */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        }
        label="Code"
      />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
        label="Code Block"
      />

      <Divider />

      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        }
        label="Undo"
      />

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </svg>
        }
        label="Redo"
      />
    </div>
  );
}
