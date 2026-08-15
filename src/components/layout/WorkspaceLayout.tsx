import { EditorCanvas } from "../../features/editor/EditorCanvas";
import { useParams } from "react-router-dom";

export function WorkspaceLayout() {
  const { documentId } = useParams<{ documentId: string }>();
  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: "rgb(var(--color-bg-base))" }}
    >
      <div className="flex-1 flex flex-col min-w-0">
        <EditorCanvas key={documentId} />
      </div>
    </div>
  );
}
