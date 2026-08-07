import { useRef, useState, type ChangeEvent } from "react";
import { importDocx } from "../document/docxImport";
import { createImportedDocumentTemplate } from "../document/textSources";
import type { DocumentTemplate } from "../document/templates";
import type { NovelReadingProgress } from "../reader/novelReader";
import type { NovelLibraryEntry } from "../reader/NovelLibraryService";

export interface NovelShelfItem extends NovelLibraryEntry {
  progress?: NovelReadingProgress;
}

interface TextPanelProps {
  currentBackgroundName: string;
  currentNovelFingerprint?: string;
  novels: NovelShelfItem[];
  libraryError?: string;
  busyNovelId?: string;
  onSelectBackground: (name: string, content: string, author?: string) => void;
  onSelectTemplate: (template: DocumentTemplate) => void;
  onImportNovel: (name: string, content: string, file: { size: number; lastModified: number }) => Promise<void>;
  onOpenNovel: (novel: NovelLibraryEntry) => Promise<void>;
  onDeleteNovel: (novel: NovelLibraryEntry) => Promise<void>;
}

function formatFileSize(size: number) {
  return size >= 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function TextPanel({
  currentBackgroundName,
  currentNovelFingerprint,
  novels,
  libraryError,
  busyNovelId,
  onSelectBackground,
  onSelectTemplate,
  onImportNovel,
  onOpenNovel,
  onDeleteNovel,
}: TextPanelProps) {
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const novelInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);

  const importText = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const isDocx = file.name.toLowerCase().endsWith(".docx");
    const sizeLimit = isDocx ? 20 : 2;
    if (file.size > sizeLimit * 1024 * 1024) {
      setError(`单个 ${isDocx ? "DOCX" : "TXT"} 文件限制为 ${sizeLimit}MB。`);
      return;
    }

    try {
      setImporting(true);
      if (isDocx) {
        const { blocks } = await importDocx(await file.arrayBuffer());
        onSelectTemplate(createImportedDocumentTemplate(file.name, blocks, "本地导入 · DOCX 只读文档"));
      } else {
        const content = await file.text();
        onSelectBackground(file.name, content, "本地导入 · TXT 只读文本");
      }
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? `导入失败：${cause.message}` : "无法读取该文件。");
    } finally {
      setImporting(false);
    }
  };

  const importNovel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("小说阅读模式目前只支持 UTF-8 TXT 文件。");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("单个小说 TXT 文件限制为 20MB。");
      return;
    }
    try {
      setImporting(true);
      await onImportNovel(file.name, await file.text(), { size: file.size, lastModified: file.lastModified });
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? `小说导入失败：${cause.message}` : "无法读取小说 TXT。");
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="feature-panel" aria-labelledby="text-panel-title">
      <header className="feature-panel-header">
        <div>
          <span className="feature-eyebrow">READ-ONLY TEXT</span>
          <h1 id="text-panel-title">文本</h1>
          <p>导入只读背景文档，或从本地小说书架继续阅读。</p>
        </div>
        <div className="import-actions">
          <button className="secondary-button" onClick={() => backgroundInputRef.current?.click()}>
            导入背景文档
          </button>
          <button className="primary-button" onClick={() => novelInputRef.current?.click()}>
            {importing ? "正在导入…" : "导入小说 TXT"}
          </button>
        </div>
        <input
          ref={backgroundInputRef}
          className="visually-hidden"
          type="file"
          accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={importText}
        />
        <input ref={novelInputRef} className="visually-hidden" type="file"
          accept=".txt,text/plain" onChange={importNovel} />
      </header>

      {(error || libraryError) && <div className="panel-error" role="alert">{error || libraryError}</div>}

      <section className="novel-shelf" aria-labelledby="novel-shelf-title">
        <div className="novel-shelf-heading">
          <div>
            <span className="feature-eyebrow">LOCAL NOVEL SHELF</span>
            <h2 id="novel-shelf-title">小说书架</h2>
          </div>
          <span>{novels.length} 本</span>
        </div>
        {novels.length === 0 ? (
          <div className="novel-shelf-empty">还没有小说。导入 TXT 后会保存到 App 的本地书架中。</div>
        ) : (
          <div className="novel-list">
            {novels.map((novel) => {
              const progress = novel.progress;
              const percent = progress
                ? Math.round((progress.lastPage / Math.max(1, progress.totalPages)) * 100)
                : 0;
              const active = currentNovelFingerprint === novel.fingerprint;
              return (
                <article className={`novel-card${active ? " is-selected" : ""}`} key={novel.id}>
                  <span className="text-file-icon">TXT</span>
                  <div className="novel-card-copy">
                    <h3>{novel.name.replace(/\.txt$/i, "")}</h3>
                    <p>{formatFileSize(novel.size)} · {progress ? `已读 ${percent}%` : "尚未开始"}</p>
                    <div className="novel-progress-track"><i style={{ width: `${percent}%` }} /></div>
                    <small>{progress ? `上次第 ${progress.lastPage} / ${progress.totalPages} 页` : "阅读进度会自动保存"}</small>
                  </div>
                  <div className="novel-card-actions">
                    <button className="primary-button" disabled={busyNovelId === novel.id}
                      onClick={() => void onOpenNovel(novel)}>
                      {busyNovelId === novel.id ? "读取中…" : progress ? "继续阅读" : "开始阅读"}
                    </button>
                    <button className="text-danger-button" disabled={busyNovelId === novel.id}
                      onClick={() => {
                        if (window.confirm(`从 App 书架删除《${novel.name.replace(/\.txt$/i, "")} 》？\n原始 TXT 文件不会受影响。`)) {
                          void onDeleteNovel(novel);
                        }
                      }}>删除</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="import-guidance">
        <h2>背景文档</h2>
        <p>背景支持 TXT / DOCX，只读且自动绕开六行学习区。小说支持最大 20MB 的 UTF-8 TXT，保存在 App 本地数据目录。</p>
        <strong>当前背景：{currentBackgroundName || "内置办公文档"}</strong>
      </div>
    </section>
  );
}
