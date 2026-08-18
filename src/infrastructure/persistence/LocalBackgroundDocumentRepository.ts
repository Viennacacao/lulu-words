import type {
  BackgroundDocumentRecord,
  BackgroundDocumentRepository,
  StoredBackgroundDocument,
} from "../../core/repository/BackgroundDocumentRepository";
import {
  BACKGROUND_DOCUMENT_LIMITS,
  blocksJsonBytes,
  documentRecordFromStored,
} from "./backgroundDocumentLimits";

export class LocalBackgroundDocumentRepository implements BackgroundDocumentRepository {
  private readonly key = "lulu-words.background-documents.v1";

  constructor(private readonly storage: Storage = window.localStorage) {}

  async list(): Promise<BackgroundDocumentRecord[]> {
    return this.read()
      .map(documentRecordFromStored)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async load(id: string): Promise<StoredBackgroundDocument | undefined> {
    return this.read().find((document) => document.id === id);
  }

  async save(document: StoredBackgroundDocument): Promise<void> {
    const documents = this.read();
    const existing = documents.some((item) => item.id === document.id);
    if (!existing && documents.length >= BACKGROUND_DOCUMENT_LIMITS.maxDocuments) {
      throw new Error(`已保存背景文档最多 ${BACKGROUND_DOCUMENT_LIMITS.maxDocuments} 篇，请先删除不需要的文档`);
    }
    const totalBytes = documents
      .filter((item) => item.id !== document.id)
      .reduce((sum, item) => sum + blocksJsonBytes(item.blocks), 0);
    if (totalBytes + blocksJsonBytes(document.blocks) > BACKGROUND_DOCUMENT_LIMITS.maxTotalBytes) {
      throw new Error("已保存背景文档总容量超过 20MB，请先删除不需要的文档");
    }
    const next = existing
      ? documents.map((item) => (item.id === document.id ? document : item))
      : [...documents, document];
    this.write(next);
  }

  async delete(id: string): Promise<void> {
    this.write(this.read().filter((document) => document.id !== id));
  }

  private read(): StoredBackgroundDocument[] {
    try {
      const parsed = JSON.parse(this.storage.getItem(this.key) ?? "[]") as StoredBackgroundDocument[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private write(documents: StoredBackgroundDocument[]): void {
    this.storage.setItem(this.key, JSON.stringify(documents));
  }
}
