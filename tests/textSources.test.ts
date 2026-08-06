import { describe, expect, it } from "vitest";
import {
  createTextDocumentTemplate,
  normalizeTextBlocks,
} from "../src/features/document/textSources";

describe("read-only text sources", () => {
  it("normalizes line endings, blank lines and oversized paragraphs", () => {
    const blocks = normalizeTextBlocks(`第一段。\r\n\r\n${"long text ".repeat(80)}\r\n第三段。`);

    expect(blocks[0].text).toBe("第一段。");
    expect(blocks.length).toBeGreaterThan(3);
    expect(blocks.every((block) => block.text.length <= 241)).toBe(true);
  });

  it("reserves the first-page learning area and preserves all text blocks", () => {
    const template = createTextDocumentTemplate(
      "测试小说.txt",
      Array.from({ length: 30 }, (_, index) => `第 ${index + 1} 段内容。`).join("\n\n"),
    );

    expect(template.fileName).toBe("测试小说.txt");
    expect(template.firstPage.upper[0].kind).toBe("title");
    expect(template.firstPage.lower.length).toBeGreaterThan(0);
    expect(template.continuation.length).toBeGreaterThan(0);
    expect(
      template.firstPage.upper.filter((block) => block.kind === "paragraph").length +
        template.firstPage.lower.length +
        template.continuation.length,
    ).toBe(30);
  });
});
