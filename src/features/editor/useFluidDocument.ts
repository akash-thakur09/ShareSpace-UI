import { useEffect, useState } from "react";
import { SharedString } from "fluid-framework/legacy";
import { getFluidContainer } from "../../fluid/container";
import {
  createDocument,
  resolveDocument
} from "../document/document.service";

export function useFluidDocument() {
  const [doc, setDoc] = useState<SharedString | null>(null);

  useEffect(() => {
    async function init() {
      const params = new URLSearchParams(window.location.search);
      const docId = params.get("doc");

      if (!docId) {
        // CREATE Fluid container
        const result = await getFluidContainer();

        // CREATE short public docId
        const shortDocId = createDocument(result.containerId);

        // PUT short docId in URL
        params.set("doc", shortDocId);
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}?${params.toString()}`
        );

        setDoc(result.container.initialObjects.document as SharedString);
      } else {
        // RESOLVE short docId → containerId
        const containerId = resolveDocument(docId);
        if (!containerId) {
          console.error("Invalid document ID");
          return;
        }

        const { container } = await getFluidContainer(containerId);
        setDoc(container.initialObjects.document as SharedString);
      }
    }

    init();
  }, []);

  return doc;
}