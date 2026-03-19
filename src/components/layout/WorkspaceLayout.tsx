import { EditorCanvas } from "../../features/editor/EditorCanvas";
import { AiAssistantPanel } from "../panels/AiAssistantPanel";
import { useParams } from "react-router-dom";

export function WorkspaceLayout() {
  const { documentId } = useParams<{ documentId: string }>();
  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: "rgb(var(--color-bg-base))" }}
    >
      {/* Main editor — keyed by documentId to fully reinitialize Yjs/TipTap per doc */}
      <div className="flex-1 flex flex-col min-w-0">
        <EditorCanvas key={documentId} />
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
