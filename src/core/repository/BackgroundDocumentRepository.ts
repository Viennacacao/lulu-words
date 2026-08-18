import type { DocumentBlock } from "../../features/document/templates";

export type BackgroundDocumentKind = "txt" | "docx";

export interface BackgroundDocumentRecord {
  id: string;
  name: string;
  author: string;
  kind: BackgroundDocumentKind;
  createdAt: string;
  updatedAt: string;
}

export interface StoredBackgroundDocument extends BackgroundDocumentRecord {
  blocks: DocumentBlock[];
}

export interface BackgroundDocumentRepository {
  list(): Promise<BackgroundDocumentRecord[]>;
  load(id: string): Promise<StoredBackgroundDocument | undefined>;
  save(document: StoredBackgroundDocument): Promise<void>;
  delete(id: string): Promise<void>;
}
