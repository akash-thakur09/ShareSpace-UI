// src/features/editor/useFluidDocument.ts
import { useEffect, useState } from "react";
import { SharedString } from "fluid-framework/legacy";
import { getFluidContainer } from "../../fluid/container";

export function useFluidDocument() {
  const [doc, setDoc] = useState<SharedString | null>(null);

  useEffect(() => {
    async function init() {
      const params = new URLSearchParams(window.location.search);
      let containerId = params.get("doc");

      if (!containerId) {
        // CREATE container
        const result = await getFluidContainer();
        containerId = result.containerId!;

        // PUT containerId in URL
        params.set("doc", containerId);
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}?${params.toString()}`
        );

        setDoc(result.container.initialObjects.document as SharedString);
      } else {
        // LOAD existing container
        const { container } = await getFluidContainer(containerId);
        setDoc(container.initialObjects.document as SharedString);
      }
    }

    init();
  }, []);

  return doc;
}