import { EditorCanvas } from "../../features/editor/EditorCanvas";
import { AiAssistantPanel } from "../panels/AiAssistantPanel";

export function WorkspaceLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <EditorCanvas />
      </div>

      {/* AI Assistant Sidebar */}
      <aside className="w-80 border-l border-slate-800 bg-slate-900/50 backdrop-blur-sm hidden lg:block">
        <AiAssistantPanel />
      </aside>
    </div>
  );
}