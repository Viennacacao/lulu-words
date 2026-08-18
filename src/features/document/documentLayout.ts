import type { DocumentBlock, DocumentTemplate } from "./templates";

export const DOCUMENT_LAYOUT = Object.freeze({
  pageWidth: 794,
  pageHeight: 1123,
  pageMarginX: 92,
  lineHeight: 34,
  defaultLearningRows: 6,
  learningTop: 386,
  learningGapLines: 0,
  lowerContentTop: 631,
  continuationLineCapacity: 27,
});

const PARAGRAPH_CHARACTERS_PER_LINE = 31;

export interface DocumentLayoutResult {
  cacheKey: string;
  firstPage: DocumentTemplate["firstPage"];
  camouflageLines: string[];
  continuationPages: DocumentBlock[][];
  pageCount: number;
  wordCount: number;
}

export function estimateBlockLines(block: DocumentBlock): number {
  const textLines = Math.max(
    1,
    Math.ceil(block.text.length / PARAGRAPH_CHARACTERS_PER_LINE),
  );

  if (block.kind === "title" || block.kind === "heading") {
    return textLines + 1;
  }
  return textLines;
}

export function paginateDocumentBlocks(
  blocks: DocumentBlock[],
  lineCapacity: number = DOCUMENT_LAYOUT.continuationLineCapacity,
): DocumentBlock[][] {
  if (lineCapacity < 1) {
    throw new Error("Document page line capacity must be positive");
  }
  if (blocks.length === 0) return [];

  const pages: DocumentBlock[][] = [];
  let currentPage: DocumentBlock[] = [];
  let usedLines = 0;

  for (const block of blocks) {
    const blockLines = estimateBlockLines(block);
    if (currentPage.length > 0 && usedLines + blockLines > lineCapacity) {
      pages.push(currentPage);
      currentPage = [];
      usedLines = 0;
    }

    currentPage.push(block);
    usedLines += blockLines;
  }

  if (currentPage.length > 0) pages.push(currentPage);
  return pages;
}

function countDocumentCharacters(template: DocumentTemplate) {
  return [
    ...template.firstPage.upper,
    ...template.firstPage.lower,
    ...template.continuation,
  ].reduce((total, current) => total + current.text.length, 0);
}

export type LearningRowCount = 6 | 8;

export class DocumentLayoutCache {
  private readonly layouts = new Map<string, DocumentLayoutResult>();

  get(
    template: DocumentTemplate,
    fontSize = 17,
    learningRows: LearningRowCount = DOCUMENT_LAYOUT.defaultLearningRows as LearningRowCount,
  ): DocumentLayoutResult {
    const normalizedFontSize = Math.min(20, Math.max(15, Math.round(fontSize)));
    const cacheKey = `${template.id}:${template.revision}:font-${normalizedFontSize}:rows-${learningRows}`;
    const cached = this.layouts.get(cacheKey);
    if (cached) return cached;

    const ratio = 17 / normalizedFontSize;
    const lineHeight = normalizedFontSize * 2;
    const learningGap = lineHeight * DOCUMENT_LAYOUT.learningGapLines;
    const upperCapacity = Math.max(
      5,
      Math.floor((DOCUMENT_LAYOUT.learningTop - learningGap - 65) / lineHeight),
    );
    const lowerTop = DOCUMENT_LAYOUT.learningTop +
      learningRows * lineHeight + learningGap;
    const lowerCapacity = Math.max(
      7,
      Math.floor((DOCUMENT_LAYOUT.pageHeight - 72 - lowerTop) / lineHeight),
    );
    const continuationCapacity = Math.max(
      20,
      Math.floor(DOCUMENT_LAYOUT.continuationLineCapacity * ratio),
    );
    const charactersPerLine = Math.max(
      24,
      Math.floor(PARAGRAPH_CHARACTERS_PER_LINE * ratio),
    );
    const allBlocks = [
      ...template.firstPage.upper,
      ...template.firstPage.lower,
      ...template.continuation,
    ];
    const [upper, afterUpper] = takeBlocksWithinPage(
      allBlocks,
      upperCapacity,
      charactersPerLine,
    );
    const [camouflageLines, afterCamouflage] = takeCamouflageLines(
      afterUpper,
      learningRows,
      charactersPerLine,
    );
    const [lower, lowerOverflow] = takeBlocksWithinPage(
      afterCamouflage,
      lowerCapacity,
      charactersPerLine,
    );
    const continuationPages = paginateDocumentBlocks(
      lowerOverflow,
      continuationCapacity,
    );
    const layout: DocumentLayoutResult = {
      cacheKey,
      firstPage: { upper, lower },
      camouflageLines,
      continuationPages,
      pageCount: 1 + continuationPages.length,
      wordCount: countDocumentCharacters(template),
    };
    this.layouts.set(cacheKey, layout);
    return layout;
  }

  clear() {
    this.layouts.clear();
  }
}

function takeCamouflageLines(
  blocks: DocumentBlock[],
  lineCount: number,
  charactersPerLine: number,
): [string[], DocumentBlock[]] {
  const lines: string[] = [];
  const remaining = [...blocks];

  while (remaining.length > 0 && lines.length < lineCount) {
    const block = remaining.shift()!;
    const text = block.text.trim();
    if (!text) continue;

    if (block.kind === "title" || block.kind === "heading") {
      lines.push(text);
      continue;
    }

    let consumed = 0;
    while (consumed < text.length && lines.length < lineCount) {
      const end = Math.min(text.length, consumed + charactersPerLine);
      lines.push(text.slice(consumed, end));
      consumed = end;
    }
    if (consumed < text.length) {
      remaining.unshift({
        ...block,
        id: `${block.id}-after-camouflage`,
        text: text.slice(consumed),
      });
    }
  }

  while (lines.length < lineCount) lines.push("");
  return [lines, remaining];
}

function takeBlocksWithinPage(
  blocks: DocumentBlock[],
  lineCapacity: number,
  charactersPerLine = PARAGRAPH_CHARACTERS_PER_LINE,
): [DocumentBlock[], DocumentBlock[]] {
  const selected: DocumentBlock[] = [];
  let usedLines = 0;
  let index = 0;

  while (index < blocks.length) {
    const lines = estimateBlockLines(blocks[index]);
    if (usedLines + lines > lineCapacity) {
      const remainingLines = lineCapacity - usedLines;
      const block = blocks[index];
      if (
        remainingLines > 0 &&
        block.kind !== "title" &&
        block.kind !== "heading"
      ) {
        const splitAt = Math.min(block.text.length, remainingLines * charactersPerLine);
        const leadingText = block.text.slice(0, splitAt).trim();
        const trailingText = block.text.slice(splitAt).trim();
        if (leadingText) {
          selected.push({ ...block, id: `${block.id}-before-slot`, text: leadingText });
        }
        const remaining = trailingText
          ? [{ ...block, id: `${block.id}-after-slot`, text: trailingText }, ...blocks.slice(index + 1)]
          : blocks.slice(index + 1);
        return [selected, remaining];
      }
      if (selected.length > 0) break;
    }
    selected.push(blocks[index]);
    usedLines += lines;
    index += 1;
  }
  return [selected, blocks.slice(index)];
}

export function clampDocumentZoom(zoom: number) {
  return Math.min(1.2, Math.max(0.8, Math.round(zoom * 10) / 10));
}
