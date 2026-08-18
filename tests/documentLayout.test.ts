import { describe, expect, it } from "vitest";
import {
  clampDocumentZoom,
  DOCUMENT_LAYOUT,
  DocumentLayoutCache,
  paginateDocumentBlocks,
} from "../src/features/document/documentLayout";
import {
  documentTemplates,
  type DocumentBlock,
} from "../src/features/document/templates";

describe("document layout", () => {
  it("keeps six default learning lines without inserting extra blank lines", () => {
    expect(DOCUMENT_LAYOUT.defaultLearningRows).toBe(6);
    expect(DOCUMENT_LAYOUT.lineHeight * DOCUMENT_LAYOUT.defaultLearningRows).toBe(204);
    expect(DOCUMENT_LAYOUT.learningGapLines).toBe(0);
  });

  it("provides three distinct built-in read-only templates", () => {
    expect(documentTemplates.map((template) => template.name)).toEqual([
      "项目周报",
      "会议纪要",
      "财务报告",
    ]);
    expect(new Set(documentTemplates.map((template) => template.id)).size).toBe(3);
  });

  it("paginates continuation blocks without changing their order", () => {
    const blocks: DocumentBlock[] = [
      { id: "a", kind: "paragraph", text: "甲".repeat(31) },
      { id: "b", kind: "paragraph", text: "乙".repeat(62) },
      { id: "c", kind: "heading", text: "第三部分" },
    ];

    const pages = paginateDocumentBlocks(blocks, 3);

    expect(pages).toHaveLength(2);
    expect(pages.flat().map((block) => block.id)).toEqual(["a", "b", "c"]);
  });

  it("reuses cached layout and keeps zoom outside logical pagination", () => {
    const cache = new DocumentLayoutCache();
    const template = documentTemplates[0];
    const first = cache.get(template);
    const second = cache.get(template);
    const largerFont = cache.get(template, 20);

    expect(second).toBe(first);
    expect(largerFont.cacheKey).not.toBe(first.cacheKey);
    expect(first.pageCount).toBeGreaterThan(1);
    expect(clampDocumentZoom(0.2)).toBe(0.8);
    expect(clampDocumentZoom(1.06)).toBe(1.1);
    expect(clampDocumentZoom(2)).toBe(1.2);
    expect(cache.get(template).pageCount).toBe(first.pageCount);
    expect(first.camouflageLines).toHaveLength(6);
    expect(first.camouflageLines.join("").length).toBeGreaterThan(20);
  });

  it("builds an eight-row layout with its own cache key and camouflage", () => {
    const cache = new DocumentLayoutCache();
    const template = documentTemplates[0];
    const six = cache.get(template);
    const eight = cache.get(template, 17, 8);

    expect(eight).not.toBe(six);
    expect(eight.cacheKey).toContain("rows-8");
    expect(six.cacheKey).toContain("rows-6");
    expect(eight.camouflageLines).toHaveLength(8);
    // 8 行学习区下移后第一页下部容量变小，正文分页应正确重排
    expect(eight.pageCount).toBeGreaterThanOrEqual(six.pageCount);
    // 同参数命中缓存
    expect(cache.get(template, 17, 8)).toBe(eight);
  });

  it("reserves real document text for camouflage without duplication or loss", () => {
    const text = "用户导入文档内容".repeat(180);
    const layout = new DocumentLayoutCache().get({
      id: "imported",
      name: "用户文档",
      fileName: "用户文档.docx",
      revision: 1,
      firstPage: {
        upper: [{ id: "content", kind: "paragraph", text }],
        lower: [],
      },
      continuation: [],
    });
    const reconstructed = [
      ...layout.firstPage.upper.map((block) => block.text),
      ...layout.camouflageLines,
      ...layout.firstPage.lower.map((block) => block.text),
      ...layout.continuationPages.flat().map((block) => block.text),
    ].join("");
    expect(reconstructed).toBe(text);
  });
});
