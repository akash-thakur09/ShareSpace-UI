import { EditorCanvas } from "../../features/editor/EditorCanvas";

export function WorkspaceLayout() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ flex: 1 }}>
        <EditorCanvas />
      </div>
      <div style={{ width: 320, borderLeft: "1px solid #ddd" }}>
        AI Assistant
      </div>
    </div>
  );
}