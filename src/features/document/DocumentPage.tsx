import type { ReactNode } from "react";
import type { DocumentLayoutResult } from "./documentLayout";
import type { DocumentBlock } from "./templates";

interface DocumentPageProps {
  learningBlock: ReactNode;
  layout: DocumentLayoutResult;
}

function DocumentContent({ blocks }: { blocks: DocumentBlock[] }) {
  return blocks.map((block) => {
    if (block.kind === "title") return <h1 key={block.id}>{block.text}</h1>;
    if (block.kind === "heading") return <h2 key={block.id}>{block.text}</h2>;
    return (
      <p className={block.kind === "meta" ? "document-meta" : undefined} key={block.id}>
        {block.text}
      </p>
    );
  });
}

export function DocumentPage({ learningBlock, layout }: DocumentPageProps) {
  return (
    <div className="document-stack">
      <article className="document-page" aria-label="只读模拟文档第一页">
        <div className="page-corner top-left" />
        <div className="page-corner top-right" />
        <section className="document-copy document-copy--top">
          <DocumentContent blocks={layout.firstPage.upper} />
        </section>

        <div className="learning-slot">{learningBlock}</div>

        <section className="document-copy document-copy--bottom">
          <DocumentContent blocks={layout.firstPage.lower} />
        </section>
        <div className="page-number">— 1 —</div>
      </article>

      {layout.continuationPages.map((blocks, index) => (
        <article
          className="document-page"
          aria-label={`只读模拟文档第 ${index + 2} 页`}
          key={`${layout.cacheKey}:${index}`}
        >
          <div className="page-corner top-left" />
          <div className="page-corner top-right" />
          <section className="document-copy document-copy--flow">
            <DocumentContent blocks={blocks} />
          </section>
          <div className="page-number">— {index + 2} —</div>
        </article>
      ))}
    </div>
  );
}
