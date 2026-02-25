// src/features/editor/EditorCanvas.tsx
import { useEffect, useState } from "react";
import { useFluidDocument } from "./useFluidDocument";

export function EditorCanvas() {
  const document = useFluidDocument(); // ✅ FIXED
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!document) return;

    const syncFromFluid = () => {
      setValue(document.getText());
    };

    // Initial sync
    syncFromFluid();

    document.on("sequenceDelta", syncFromFluid);

    return () => {
      document.off("sequenceDelta", syncFromFluid);
    };
  }, [document]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (!document) return;

    const newText = e.target.value;

    document.replaceText(
      0,
      document.getLength(),
      newText
    );
  }

  if (!document) {
    return <div>Loading editor…</div>;
  }

  return (
    <textarea
      value={value}
      onChange={handleChange}
      placeholder="Start typing…"
      style={{
        width: "100%",
        height: "100%",
        resize: "none",
        fontSize: "16px",
        lineHeight: "1.6",
        padding: "16px",
        border: "none",
        outline: "none"
      }}
    />
  );
}