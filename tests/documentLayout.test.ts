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
  it("keeps exactly five learning lines without an extra lower spacer", () => {
    expect(DOCUMENT_LAYOUT.learningRows).toBe(5);
    expect(DOCUMENT_LAYOUT.lineHeight * DOCUMENT_LAYOUT.learningRows).toBe(170);
    expect(
      DOCUMENT_LAYOUT.lowerContentTop -
        (DOCUMENT_LAYOUT.learningTop +
          DOCUMENT_LAYOUT.lineHeight * DOCUMENT_LAYOUT.learningRows),
    ).toBe(0);
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
  });
});
