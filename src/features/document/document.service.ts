import { nanoid } from "nanoid";

const STORAGE_KEY = "doc-mapping";

type DocMapping = Record<string, string>;

function loadMapping(): DocMapping {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

function saveMapping(mapping: DocMapping) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
}

export function createDocument(containerId: string): string {
  const docId = nanoid(6);

  const mapping = loadMapping();
  mapping[docId] = containerId;
  saveMapping(mapping);

  return docId;
}

export function resolveDocument(docId: string): string | null {
  const mapping = loadMapping();
  return mapping[docId] ?? null;
}