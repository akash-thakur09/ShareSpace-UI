import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { EditorToolbar } from "./EditorToolbar";
import { EditorHeader } from "./EditorHeader";
import { DocumentSidebar } from "./DocumentSidebar";

export function EditorCanvas() {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: {
          HTMLAttributes: {
            class: "bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-sm border border-slate-700",
          },
        },
      }),
    ],
    content: `
      <h1>Welcome to ShareSpace</h1>
      <p>Start collaborating in real-time with your team. This is a modern, production-ready collaborative editor.</p>
      <h2>Features</h2>
      <ul>
        <li>Real-time collaboration</li>
        <li>Rich text editing</li>
        <li>AI-powered assistance</li>
        <li>Version history</li>
      </ul>
      <p>Select text and use the toolbar above to format your content.</p>
    `,
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-slate max-w-none focus:outline-none min-h-full px-8 py-6",
      },
    },
  });

  if (!editor) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
          <p className="text-sm text-slate-400">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* Header */}
      <EditorHeader />

      {/* Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Document Sidebar */}
        <DocumentSidebar />

        {/* Editor Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          <div className="mx-auto max-w-4xl py-8">
            <EditorContent editor={editor} />
          </div>
        </main>
      </div>
    </div>
  );
}