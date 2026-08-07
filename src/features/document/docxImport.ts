import * as mammoth from "mammoth/mammoth.browser";
import type { DocumentBlock, DocumentBlockKind } from "./templates";

const headingPattern = /^(?:[一二三四五六七八九十]+、|（[一二三四五六七八九十]+）|\d+[.．、]\s*[^，。；]{1,40}$)/;

function decodeHtml(value: string) {
  const named: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  };
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, entity: string) => named[entity.toLowerCase()] ?? match);
}

function plainText(html: string) {
  return decodeHtml(html.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, ""))
    .replace(/[\t ]+/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .trim();
}

function flattenTables(html: string) {
  return html.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_, table: string) => {
    const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map((row) => [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map((cell) => plainText(cell[1]))
        .filter(Boolean)
        .join(" ｜ "))
      .filter(Boolean);
    return rows.map((row) => `<p>${row}</p>`).join("");
  });
}

function inferKind(tag: string, text: string, index: number): DocumentBlockKind {
  if (/^h[1-6]$/i.test(tag)) return index === 0 ? "title" : "heading";
  if (index === 0 && text.length <= 80) return "title";
  return headingPattern.test(text) ? "heading" : "paragraph";
}

export function documentBlocksFromMammothHtml(html: string): DocumentBlock[] {
  const normalized = flattenTables(html);
  const candidates = [...normalized.matchAll(/<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((match) => ({ tag: match[1], text: plainText(match[2]) }))
    .filter((item) => item.text);

  // Word documents often split a centered title across two consecutive lines.
  if (
    candidates.length >= 2 &&
    candidates[0].text.length <= 32 &&
    candidates[1].text.length <= 32 &&
    !/[：:。！？]$/.test(candidates[0].text)
  ) {
    candidates.splice(0, 2, { tag: "h1", text: candidates[0].text + candidates[1].text });
  }

  return candidates.map((item, index) => ({
    id: `docx-block-${index + 1}`,
    kind: inferKind(item.tag, item.text, index),
    text: item.text,
  }));
}

export async function importDocx(arrayBuffer: ArrayBuffer) {
  const result = await mammoth.convertToHtml({ arrayBuffer }, {
    includeDefaultStyleMap: true,
    ignoreEmptyParagraphs: true,
  });
  const blocks = documentBlocksFromMammothHtml(result.value);
  if (blocks.length === 0) throw new Error("DOCX 中没有可显示的正文内容");
  return { blocks, warnings: result.messages.map((message) => message.message) };
}
