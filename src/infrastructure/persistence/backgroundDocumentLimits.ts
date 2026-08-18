import type {
  BackgroundDocumentRecord,
  StoredBackgroundDocument,
} from "../../core/repository/BackgroundDocumentRepository";

/** 已保存背景文档上限：50 篇 / 总量 20MB（blocks JSON 字节数） */
export const BACKGROUND_DOCUMENT_LIMITS = Object.freeze({
  maxDocuments: 50,
  maxTotalBytes: 20 * 1024 * 1024,
});

export function blocksJsonBytes(blocks: unknown[]): number {
  return JSON.stringify(blocks).length;
}

export function documentRecordFromStored(
  document: StoredBackgroundDocument,
): BackgroundDocumentRecord {
  return {
    id: document.id,
    name: document.name,
    author: document.author,
    kind: document.kind,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
