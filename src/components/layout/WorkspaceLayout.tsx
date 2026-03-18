import { EditorCanvas } from "../../features/editor/EditorCanvas";
import { AiAssistantPanel } from "../panels/AiAssistantPanel";

export function WorkspaceLayout() {
  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: "rgb(var(--color-bg-base))" }}
    >
      {/* Main editor */}
      <div className="flex-1 flex flex-col min-w-0">
        <EditorCanvas />
      </div>

      {/* AI panel */}
      <aside
        className="w-72 hidden lg:flex flex-col shrink-0"
        style={{ borderLeft: "1px solid rgb(var(--color-border-subtle))" }}
      >
        <AiAssistantPanel />
      </aside>
    </div>
  );
}
