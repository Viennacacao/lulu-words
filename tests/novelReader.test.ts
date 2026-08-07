import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createNovelReaderDocument } from "../src/features/reader/novelReader";

describe("novel reader", () => {
  it("normalizes CRLF, wraps long paragraphs and creates five-line pages", () => {
    const novel = createNovelReaderDocument(
      "测试小说.txt",
      `第一章 开始\r\n${"这是一段用于测试自动换行的中文小说文字。".repeat(5)}`,
      20,
      5,
    );
    expect(novel.name).toBe("测试小说");
    expect(novel.pages[0]).toHaveLength(5);
    expect(novel.pages[0][0]).toBe("第一章 开始");
    expect(novel.pages.flat().every((line) => line.length <= 20)).toBe(true);
  });

  it("rejects an empty text", () => {
    expect(() => createNovelReaderDocument("empty.txt", " \r\n\n ")).toThrow("没有可显示");
  });

  const localFile = process.env.LULU_NOVEL_TEST_FILE;
  it.runIf(Boolean(localFile && existsSync(localFile)))("imports the supplied full novel", () => {
    const text = readFileSync(localFile!, "utf8");
    const novel = createNovelReaderDocument("doupocangqiong-fiction.txt", text);
    expect(novel.pages[0]).toHaveLength(5);
    expect(novel.pages[0][0]).toContain("第一章");
    expect(novel.pages.length).toBeGreaterThan(10_000);
  });
});
