import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createNovelReaderDocument,
  findNovelPageIndex,
  NovelProgressStore,
} from "../src/features/reader/novelReader";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("novel reader", () => {
  it("preserves paragraphs and creates natural six-line pages", () => {
    const novel = createNovelReaderDocument(
      "测试小说.txt",
      `第一章 开始\r\n${"这是一段用于测试自然换行的中文小说文字。".repeat(8)}`,
      { lineWidthEm: 20, linesPerPage: 6 },
    );
    expect(novel.name).toBe("测试小说");
    expect(novel.pages[0].lines).toHaveLength(6);
    expect(novel.pages[0].lines[0]).toMatchObject({ text: "第一章 开始", heading: true });
    expect(novel.pages[0].lines[1].firstInParagraph).toBe(true);
    expect(novel.pages.flatMap((page) => page.lines).every((line) => line.text.length <= 22)).toBe(true);
  });

  it("restores the same text position after a font-driven reflow", () => {
    const text = "这是一个自然段。".repeat(100);
    const compact = createNovelReaderDocument("book.txt", text, { lineWidthEm: 22 });
    const wide = createNovelReaderDocument("book.txt", text, { lineWidthEm: 34 });
    const offset = compact.pages[5].startOffset;
    const restoredPage = findNovelPageIndex(wide.pages, offset);
    expect(wide.pages[restoredPage].startOffset).toBeLessThanOrEqual(offset);
    expect(wide.pages[restoredPage].endOffset).toBeGreaterThanOrEqual(offset);
  });

  it("persists progress by file fingerprint", () => {
    const store = new NovelProgressStore(new MemoryStorage());
    const progress = {
      fingerprint: "book:100:1",
      name: "测试小说",
      offset: 345,
      lastPage: 12,
      totalPages: 100,
      updatedAt: "2026-08-07T00:00:00.000Z",
    };
    store.save(progress);
    expect(store.load(progress.fingerprint)).toEqual(progress);
  });

  it("rejects an empty text", () => {
    expect(() => createNovelReaderDocument("empty.txt", " \r\n\n ")).toThrow("没有可显示");
  });

  const localFile = process.env.LULU_NOVEL_TEST_FILE;
  it.runIf(Boolean(localFile && existsSync(localFile)))("imports the supplied full novel", () => {
    const text = readFileSync(localFile!, "utf8");
    const novel = createNovelReaderDocument("doupocangqiong-fiction.txt", text);
    expect(novel.pages[0].lines).toHaveLength(6);
    expect(novel.pages[0].lines[0].text).toContain("第一章");
    expect(novel.pages.length).toBeGreaterThan(8_000);
  });
});
