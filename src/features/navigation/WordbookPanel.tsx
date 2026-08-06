import { useMemo, useState } from "react";
import type { WordbookId, WordbookManifest } from "../../data/wordbooks";

interface WordbookPanelProps {
  manifests: WordbookManifest[];
  selectedId: WordbookId;
  loadingId?: WordbookId;
  error?: string;
  onSelect: (id: WordbookId) => void;
}

export function WordbookPanel({
  manifests,
  selectedId,
  loadingId,
  error,
  onSelect,
}: WordbookPanelProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return manifests;
    return manifests.filter((item) =>
      `${item.name} ${item.shortName} ${item.description}`.toLowerCase().includes(normalized),
    );
  }, [manifests, query]);

  return (
    <section className="feature-panel" aria-labelledby="wordbook-panel-title">
      <header className="feature-panel-header">
        <div>
          <span className="feature-eyebrow">WORD LIBRARY</span>
          <h1 id="wordbook-panel-title">选择学习词库</h1>
          <p>不同词库共享同一个单词进度，切换不会丢失复习记录。</p>
        </div>
        <label className="panel-search">
          <span>搜索词库</span>
          <input
            type="search"
            value={query}
            placeholder="雅思、四级、TOEFL…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </header>

      {error && <div className="panel-error" role="alert">{error}</div>}

      <div className="wordbook-grid">
        {filtered.map((wordbook) => {
          const selected = wordbook.id === selectedId;
          const loading = wordbook.id === loadingId;
          return (
            <article className={`wordbook-card${selected ? " is-selected" : ""}`} key={wordbook.id}>
              <div className="wordbook-monogram">{wordbook.shortName.slice(0, 1)}</div>
              <div className="wordbook-copy">
                <div className="wordbook-title-row">
                  <h2>{wordbook.name}</h2>
                  <span>{wordbook.shortName}</span>
                </div>
                <p>{wordbook.description}</p>
                <small>
                  {wordbook.wordCount.toLocaleString()} 词 · {wordbook.sourceName} · {wordbook.license}
                </small>
              </div>
              <button
                className={selected ? "secondary-button" : "primary-button"}
                disabled={selected || loading}
                onClick={() => onSelect(wordbook.id)}
              >
                {loading ? "载入中…" : selected ? "当前词库" : "选择"}
              </button>
            </article>
          );
        })}
      </div>
      <p className="source-note">考试名称仅用于分类，所有清单均为非官方学习词表；来源与许可证见项目第三方说明。</p>
    </section>
  );
}
