import { describe, expect, it } from "vitest";
import type { StoredBackgroundDocument } from "../src/core/repository/BackgroundDocumentRepository";
import { LocalBackgroundDocumentRepository } from "../src/infrastructure/persistence/LocalBackgroundDocumentRepository";
import { BACKGROUND_DOCUMENT_LIMITS } from "../src/infrastructure/persistence/backgroundDocumentLimits";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function makeDocument(index: number): StoredBackgroundDocument {
  return {
    id: `doc-${index}`,
    name: `文档${index}.txt`,
    author: "测试作者",
    kind: "txt",
    createdAt: "2026-08-18T00:00:00.000Z",
    updatedAt: `2026-08-18T00:0${index}:00.000Z`,
    blocks: [
      { id: `block-${index}`, kind: "paragraph", text: `第 ${index} 段内容用于测试保存往返。` },
    ],
  };
}

describe("LocalBackgroundDocumentRepository", () => {
  it("persists documents across repository instances", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalBackgroundDocumentRepository(storage);
    await repository.save(makeDocument(1));
    await repository.save(makeDocument(2));

    const reloaded = new LocalBackgroundDocumentRepository(storage);
    const list = await reloaded.list();
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe("doc-2");
    const stored = await reloaded.load("doc-1");
    expect(stored?.blocks[0].text).toContain("第 1 段内容");
  });

  it("overwrites a document with the same id instead of duplicating", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalBackgroundDocumentRepository(storage);
    await repository.save(makeDocument(1));
    const updated: StoredBackgroundDocument = {
      ...makeDocument(1),
      blocks: [{ id: "new-block", kind: "paragraph", text: "更新后的内容" }],
    };
    await repository.save(updated);
    expect((await repository.list())).toHaveLength(1);
    expect((await repository.load("doc-1"))?.blocks[0].text).toBe("更新后的内容");
  });

  it("deletes a saved document", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalBackgroundDocumentRepository(storage);
    await repository.save(makeDocument(1));
    await repository.save(makeDocument(2));
    await repository.delete("doc-1");
    const list = await repository.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("doc-2");
  });

  it("rejects saving beyond the document count limit", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalBackgroundDocumentRepository(storage);
    for (let index = 0; index < BACKGROUND_DOCUMENT_LIMITS.maxDocuments; index += 1) {
      await repository.save(makeDocument(index));
    }
    await expect(repository.save(makeDocument(999))).rejects.toThrow("最多");
  });

  it("rejects saving beyond the total byte limit", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalBackgroundDocumentRepository(storage);
    const huge: StoredBackgroundDocument = {
      id: "doc-huge",
      name: "大文档.txt",
      author: "测试",
      kind: "txt",
      createdAt: "2026-08-18T00:00:00.000Z",
      updatedAt: "2026-08-18T00:00:00.000Z",
      blocks: [{ id: "huge", kind: "paragraph", text: "大".repeat(BACKGROUND_DOCUMENT_LIMITS.maxTotalBytes) }],
    };
    await expect(repository.save(huge)).rejects.toThrow("20MB");
  });
});
