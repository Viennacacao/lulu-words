export interface NovelReaderLine {
  text: string;
  firstInParagraph: boolean;
  heading: boolean;
  startOffset: number;
  endOffset: number;
}

export interface NovelReaderPage {
  lines: NovelReaderLine[];
  startOffset: number;
  endOffset: number;
}

export interface NovelReaderDocument {
  name: string;
  fingerprint: string;
  sourceText: string;
  pages: NovelReaderPage[];
}

export interface NovelReadingProgress {
  fingerprint: string;
  name: string;
  offset: number;
  lastPage: number;
  totalPages: number;
  updatedAt: string;
}

interface NovelReaderOptions {
  lineWidthEm?: number;
  linesPerPage?: number;
  fingerprint?: string;
}

const DEFAULT_LINE_WIDTH_EM = 34;
const DEFAULT_LINES_PER_PAGE = 6;
const closingPunctuation = new Set("，。！？；：、）》】”’…,.!?;:");
const headingPattern = /^(?:第.{1,18}[章节卷回部集篇]|序章|楔子|前言|后记)/;

function characterWidth(character: string) {
  if (/\s/.test(character)) return 0.35;
  if (/[\x00-\xff]/.test(character)) return /[A-Z]/.test(character) ? 0.66 : 0.57;
  if (/[，。！？；：、）》】”’…]/.test(character)) return 0.9;
  return 1;
}

function wrapParagraph(
  text: string,
  paragraphOffset: number,
  lineWidthEm: number,
  heading: boolean,
): NovelReaderLine[] {
  const lines: NovelReaderLine[] = [];
  let index = 0;
  let firstInParagraph = true;

  while (index < text.length) {
    const lineStart = index;
    const indentWidth = firstInParagraph && !heading ? 2.08 : 0;
    let width = indentWidth;
    let lastSpace = -1;

    while (index < text.length) {
      const character = text[index];
      const nextWidth = characterWidth(character) + 0.04;
      if (index > lineStart && width + nextWidth > lineWidthEm) break;
      width += nextWidth;
      if (/\s/.test(character)) lastSpace = index;
      index += 1;
    }

    if (index < text.length && closingPunctuation.has(text[index])) index += 1;
    if (index < text.length && /[\x00-\xff]/.test(text[index]) && lastSpace > lineStart + 4) {
      index = lastSpace + 1;
    }
    if (index === lineStart) index += 1;

    const lineText = text.slice(lineStart, index).trim();
    if (lineText) {
      lines.push({
        text: lineText,
        firstInParagraph,
        heading,
        startOffset: paragraphOffset + lineStart,
        endOffset: paragraphOffset + index,
      });
      firstInParagraph = false;
    }
  }
  return lines;
}

export function createNovelFingerprint(name: string, size: number, lastModified: number) {
  return `${name.toLowerCase()}:${size}:${lastModified}`;
}

export function createNovelReaderDocument(
  name: string,
  text: string,
  options: NovelReaderOptions = {},
): NovelReaderDocument {
  const lineWidthEm = options.lineWidthEm ?? DEFAULT_LINE_WIDTH_EM;
  const linesPerPage = options.linesPerPage ?? DEFAULT_LINES_PER_PAGE;
  if (lineWidthEm < 12 || linesPerPage < 1) throw new Error("小说排版参数无效");

  const sourceText = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines: NovelReaderLine[] = [];
  let sourceOffset = 0;
  for (const rawParagraph of sourceText.split("\n")) {
    const leadingWhitespace = rawParagraph.length - rawParagraph.trimStart().length;
    const paragraph = rawParagraph.trim();
    if (paragraph) {
      lines.push(...wrapParagraph(
        paragraph,
        sourceOffset + leadingWhitespace,
        lineWidthEm,
        headingPattern.test(paragraph),
      ));
    }
    sourceOffset += rawParagraph.length + 1;
  }

  if (lines.length === 0) throw new Error("小说 TXT 中没有可显示的文字");
  const pages: NovelReaderPage[] = [];
  for (let index = 0; index < lines.length; index += linesPerPage) {
    const pageLines = lines.slice(index, index + linesPerPage);
    pages.push({
      lines: pageLines,
      startOffset: pageLines[0].startOffset,
      endOffset: pageLines[pageLines.length - 1].endOffset,
    });
  }

  return {
    name: name.replace(/\.txt$/i, ""),
    fingerprint: options.fingerprint ?? `${name.toLowerCase()}:${sourceText.length}`,
    sourceText,
    pages,
  };
}

export function findNovelPageIndex(pages: NovelReaderPage[], offset: number) {
  if (pages.length === 0 || offset <= pages[0].startOffset) return 0;
  let low = 0;
  let high = pages.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (pages[middle].startOffset <= offset && offset <= pages[middle].endOffset) return middle;
    if (pages[middle].startOffset < offset) low = middle + 1;
    else high = middle - 1;
  }
  return Math.min(pages.length - 1, Math.max(0, high));
}

export class NovelProgressStore {
  private readonly key = "lulu-words.novel-progress.v1";

  constructor(private readonly storage: Storage = window.localStorage) {}

  load(fingerprint: string): NovelReadingProgress | undefined {
    try {
      const records = JSON.parse(this.storage.getItem(this.key) ?? "{}") as Record<string, NovelReadingProgress>;
      return records[fingerprint];
    } catch {
      return undefined;
    }
  }

  save(progress: NovelReadingProgress) {
    let records: Record<string, NovelReadingProgress> = {};
    try {
      records = JSON.parse(this.storage.getItem(this.key) ?? "{}") as Record<string, NovelReadingProgress>;
    } catch {
      records = {};
    }
    records[progress.fingerprint] = progress;
    const recent = Object.values(records)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 30);
    this.storage.setItem(this.key, JSON.stringify(Object.fromEntries(recent.map((item) => [item.fingerprint, item]))));
  }
}
