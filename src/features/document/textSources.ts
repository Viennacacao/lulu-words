import { estimateBlockLines } from "./documentLayout";
import type { DocumentBlock, DocumentTemplate } from "./templates";

export interface BuiltInText {
  id: string;
  name: string;
  author: string;
  description: string;
  content: string;
}

export const builtInTexts: BuiltInText[] = [
  {
    id: "pride-and-prejudice",
    name: "Pride and Prejudice",
    author: "Jane Austen · 公版英文节选",
    description: "适合模拟英文小说阅读页面",
    content: `It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.

However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.

“My dear Mr. Bennet,” said his lady to him one day, “have you heard that Netherfield Park is let at last?”

Mr. Bennet replied that he had not.

“But it is,” returned she; “for Mrs. Long has just been here, and she told me all about it.”

Mr. Bennet made no answer. His wife continued to describe the new arrival, the house, and the hopes of the neighbourhood with great animation.`,
  },
  {
    id: "alice-in-wonderland",
    name: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll · 公版英文节选",
    description: "段落较短，适合测试分页与字号",
    content: `Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do.

Once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it. “And what is the use of a book,” thought Alice, “without pictures or conversations?”

She was considering in her own mind whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.

There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, “Oh dear! Oh dear! I shall be late!”

When the Rabbit actually took a watch out of its waistcoat-pocket, Alice started to her feet and ran across the field after it.`,
  },
];

function splitLongParagraph(text: string, maximumLength = 240) {
  if (text.length <= maximumLength) return [text];

  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maximumLength) {
    const candidates = [
      remaining.lastIndexOf("。", maximumLength),
      remaining.lastIndexOf("！", maximumLength),
      remaining.lastIndexOf("？", maximumLength),
      remaining.lastIndexOf(". ", maximumLength),
      remaining.lastIndexOf("; ", maximumLength),
      remaining.lastIndexOf(" ", maximumLength),
    ];
    const splitAt = Math.max(...candidates, Math.floor(maximumLength * 0.6));
    chunks.push(remaining.slice(0, splitAt + 1).trim());
    remaining = remaining.slice(splitAt + 1).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export function normalizeTextBlocks(text: string): DocumentBlock[] {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n|\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .flatMap((paragraph) => splitLongParagraph(paragraph));

  return paragraphs.map((paragraph, index) => ({
    id: `text-p-${index + 1}`,
    kind: "paragraph",
    text: paragraph,
  }));
}

function takeWithinCapacity(
  blocks: DocumentBlock[],
  capacity: number,
): [DocumentBlock[], DocumentBlock[]] {
  const selected: DocumentBlock[] = [];
  let usedLines = 0;
  let index = 0;

  while (index < blocks.length) {
    const lines = estimateBlockLines(blocks[index]);
    if (selected.length > 0 && usedLines + lines > capacity) break;
    selected.push(blocks[index]);
    usedLines += lines;
    index += 1;
  }
  return [selected, blocks.slice(index)];
}

export function createTextDocumentTemplate(
  name: string,
  text: string,
  author = "本地 TXT 文本",
): DocumentTemplate {
  const normalized = normalizeTextBlocks(text);
  const safeBlocks = normalized.length > 0
    ? normalized
    : [{ id: "text-empty", kind: "paragraph" as const, text: "该文本没有可显示的正文内容。" }];

  const title: DocumentBlock = { id: "text-title", kind: "title", text: name };
  const meta: DocumentBlock = { id: "text-meta", kind: "meta", text: author };
  const [upperBody, afterUpper] = takeWithinCapacity(safeBlocks, 5);
  const [lower, continuation] = takeWithinCapacity(afterUpper, 11);

  return {
    id: `text-${name}-${text.length}`,
    name,
    fileName: name.endsWith(".txt") ? name : `${name}.txt`,
    revision: text.length,
    firstPage: {
      upper: [title, meta, ...upperBody],
      lower,
    },
    continuation,
  };
}
