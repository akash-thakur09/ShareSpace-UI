import { Editor } from "@tiptap/react";

interface EditorToolbarProps {
  editor: Editor;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}

const ToolbarBtn = ({ onClick, isActive = false, title, children }: ToolbarButtonProps) => (
  <button
    onClick={onClick}
    title={title}
    style={isActive ? {
      background: "rgb(99 102 241 / 0.08)",
      color: "rgb(79 70 229)",
      borderColor: "rgb(99 102 241 / 0.25)"
    } : {
      background: "transparent",
      color: "rgb(var(--color-text-muted))",
      borderColor: "transparent"
    }}
    className="flex items-center justify-center h-7.5 w-7.5 rounded-md text-xs font-semibold transition-all cursor-pointer border border-solid hover:bg-slate-50 hover:text-slate-700"
  >
    {children}
  </button>
);

const Sep = () => <div className="toolbar-sep mx-1" />;

export function EditorToolbar({ editor }: EditorToolbarProps) {
  return (
    <div
      className="flex items-center gap-0.5 px-4 py-1 overflow-x-auto scrollbar-hide shrink-0 border-b"
      style={{
        background: "rgb(var(--color-bg-surface))",
        borderColor: "rgb(var(--color-border-subtle))"
      }}
    >
      {/* 1. History Group */}
      <div className="flex items-center gap-0.5">
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </svg>
        </ToolbarBtn>
      </div>

      <Sep />

      {/* 2. Style Group */}
      <div className="flex items-center gap-0.5">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Bold (Ctrl+B)">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
          </svg>
        </ToolbarBtn>

        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Italic (Ctrl+I)">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <line x1="19" y1="4" x2="10" y2="4" />
            <line x1="14" y1="20" x2="5" y2="20" />
            <line x1="15" y1="4" x2="9" y2="20" />
          </svg>
        </ToolbarBtn>

        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} title="Strikethrough">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5C7.5 5.567 9.567 4 12 4s4.5 1.567 4.5 3.5c0 1.5-1 2.5-2.5 3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 16.5C16.5 18.433 14.433 20 12 20s-4.5-1.567-4.5-3.5" />
          </svg>
        </ToolbarBtn>
      </div>

      <Sep />

      {/* 3. Heading Group */}
      <div className="flex items-center gap-0.5">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive("heading", { level: 1 })} title="Heading 1">
          <span className="text-[10px] font-bold">H1</span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })} title="Heading 2">
          <span className="text-[10px] font-bold">H2</span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive("heading", { level: 3 })} title="Heading 3">
          <span className="text-[10px] font-bold">H3</span>
        </ToolbarBtn>
      </div>

      <Sep />

      {/* 4. Lists Group */}
      <div className="flex items-center gap-0.5">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")} title="Bullet list">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="5" cy="7" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="5" cy="17" r="1.5" fill="currentColor" stroke="none" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h11M9 12h11M9 17h11" />
          </svg>
        </ToolbarBtn>

        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")} title="Numbered list">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h11M9 12h11M9 17h11" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h1v3M4 9h2M4 13l1.5-1.5a1 1 0 011.5 1v.5a1 1 0 01-1 1H4M4 17h1.5a1 1 0 010 2H4" />
          </svg>
        </ToolbarBtn>
      </div>

      <Sep />

      {/* 5. Code Group */}
      <div className="flex items-center gap-0.5">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive("code")} title="Inline code">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-3 3 3 3m8-6l3 3-3 3" />
          </svg>
        </ToolbarBtn>

        <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive("codeBlock")} title="Code block">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth={1.5} />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10l-2 2 2 2m8-4l2 2-2 2" />
          </svg>
        </ToolbarBtn>
      </div>
    </div>
  );
}
