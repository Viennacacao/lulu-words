import type { DocumentBlock, DocumentTemplate } from "./templates";

export const DOCUMENT_LAYOUT = Object.freeze({
  pageWidth: 794,
  pageHeight: 1123,
  pageMarginX: 92,
  lineHeight: 34,
  learningRows: 5,
  learningTop: 386,
  lowerContentTop: 590,
  continuationLineCapacity: 27,
});

const PARAGRAPH_CHARACTERS_PER_LINE = 31;

export interface DocumentLayoutResult {
  cacheKey: string;
  firstPage: DocumentTemplate["firstPage"];
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

export class DocumentLayoutCache {
  private readonly layouts = new Map<string, DocumentLayoutResult>();

  get(template: DocumentTemplate, fontSize = 17): DocumentLayoutResult {
    const normalizedFontSize = Math.min(20, Math.max(15, Math.round(fontSize)));
    const cacheKey = `${template.id}:${template.revision}:font-${normalizedFontSize}`;
    const cached = this.layouts.get(cacheKey);
    if (cached) return cached;

    const ratio = 17 / normalizedFontSize;
    const upperCapacity = Math.max(7, Math.floor(10 * ratio));
    const lowerCapacity = Math.max(8, Math.floor(13 * ratio));
    const continuationCapacity = Math.max(
      20,
      Math.floor(DOCUMENT_LAYOUT.continuationLineCapacity * ratio),
    );
    const [upper, upperOverflow] = takeBlocksWithinPage(
      template.firstPage.upper,
      upperCapacity,
    );
    const [lower, lowerOverflow] = takeBlocksWithinPage(
      [...upperOverflow, ...template.firstPage.lower],
      lowerCapacity,
    );
    const continuationPages = paginateDocumentBlocks(
      [...lowerOverflow, ...template.continuation],
      continuationCapacity,
    );
    const layout: DocumentLayoutResult = {
      cacheKey,
      firstPage: { upper, lower },
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

function takeBlocksWithinPage(
  blocks: DocumentBlock[],
  lineCapacity: number,
): [DocumentBlock[], DocumentBlock[]] {
  const selected: DocumentBlock[] = [];
  let usedLines = 0;
  let index = 0;

  while (index < blocks.length) {
    const lines = estimateBlockLines(blocks[index]);
    if (selected.length > 0 && usedLines + lines > lineCapacity) break;
    selected.push(blocks[index]);
    usedLines += lines;
    index += 1;
  }
  return [selected, blocks.slice(index)];
}

export function clampDocumentZoom(zoom: number) {
  return Math.min(1.2, Math.max(0.8, Math.round(zoom * 10) / 10));
}
