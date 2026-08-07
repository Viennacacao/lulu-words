export interface NovelReaderDocument {
  name: string;
  pages: string[][];
}

const DEFAULT_CHARACTERS_PER_LINE = 31;
const DEFAULT_LINES_PER_PAGE = 5;
const breakCharacters = new Set(["。", "！", "？", "；", "，", ".", "!", "?", ";", ","]);

function splitParagraph(paragraph: string, maximumLength: number) {
  if (paragraph.length <= maximumLength) return [paragraph];
  const lines: string[] = [];
  let remaining = paragraph;

  while (remaining.length > maximumLength) {
    const minimumBreak = Math.floor(maximumLength * 0.68);
    let breakAt = maximumLength;
    for (let index = maximumLength - 1; index >= minimumBreak; index -= 1) {
      if (breakCharacters.has(remaining[index])) {
        breakAt = index + 1;
        break;
      }
    }
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  return lines;
}

export function createNovelReaderDocument(
  name: string,
  text: string,
  charactersPerLine = DEFAULT_CHARACTERS_PER_LINE,
  linesPerPage = DEFAULT_LINES_PER_PAGE,
): NovelReaderDocument {
  if (charactersPerLine < 10 || linesPerPage < 1) throw new Error("小说排版参数无效");
  const lines = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .filter(Boolean)
    .flatMap((line) => splitParagraph(line, charactersPerLine));

  if (lines.length === 0) throw new Error("小说 TXT 中没有可显示的文字");
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage));
  }
  return { name: name.replace(/\.txt$/i, ""), pages };
}
