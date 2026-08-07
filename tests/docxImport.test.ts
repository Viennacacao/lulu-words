import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { documentBlocksFromMammothHtml, importDocx } from "../src/features/document/docxImport";

describe("DOCX import", () => {
  it("recognizes split titles, Chinese headings, paragraphs and table rows", () => {
    const blocks = documentBlocksFromMammothHtml(`
      <p>关于反欺诈系统信创适配改造项目</p><p>立项的请示</p>
      <p>行长办公会：</p><p>现报请审议。</p><p>一、基本情况</p>
      <table><tr><td><p>系统</p></td><td><p>预算</p></td></tr><tr><td>反欺诈</td><td>95</td></tr></table>
    `);
    expect(blocks[0]).toMatchObject({ kind: "title", text: "关于反欺诈系统信创适配改造项目立项的请示" });
    expect(blocks).toContainEqual(expect.objectContaining({ kind: "heading", text: "一、基本情况" }));
    expect(blocks).toContainEqual(expect.objectContaining({ text: "反欺诈 ｜ 95" }));
  });

  const localFile = process.env.LULU_DOCX_TEST_FILE;
  it.runIf(Boolean(localFile && existsSync(localFile)))("imports the supplied real-world DOCX", async () => {
    const bytes = readFileSync(localFile!);
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const { blocks } = await importDocx(arrayBuffer);
    expect(blocks[0].text).toContain("关于反欺诈系统信创适配改造项目");
    expect(blocks.some((block) => block.text.includes("反欺诈系统") && block.text.includes("95"))).toBe(true);
    expect(blocks.length).toBeGreaterThan(25);
  });
});
