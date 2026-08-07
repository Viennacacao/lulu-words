import { useRef, useState, type ChangeEvent } from "react";
import { importDocx } from "../document/docxImport";
import { createImportedDocumentTemplate, type BuiltInText } from "../document/textSources";
import type { DocumentTemplate } from "../document/templates";

interface TextPanelProps {
  builtInTexts: BuiltInText[];
  selectedName: string;
  novelName?: string;
  onSelect: (name: string, content: string, author?: string) => void;
  onSelectTemplate: (template: DocumentTemplate) => void;
  onSelectNovel: (name: string, content: string) => void;
}

export function TextPanel({ builtInTexts, selectedName, novelName, onSelect, onSelectTemplate, onSelectNovel }: TextPanelProps) {
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
        onSelect(file.name, content, "本地导入 · TXT 只读文本");
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
      onSelectNovel(file.name, await file.text());
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
          <h1 id="text-panel-title">文档与小说</h1>
          <p>背景文档维持办公伪装；小说 TXT 则进入五行沉浸阅读模式。</p>
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

      {error && <div className="panel-error" role="alert">{error}</div>}

      <div className="text-grid">
        {builtInTexts.map((text) => {
          const selected = selectedName === text.name;
          return (
            <article className={`text-card${selected ? " is-selected" : ""}`} key={text.id}>
              <span className="text-file-icon">TXT</span>
              <div>
                <h2>{text.name}</h2>
                <p>{text.author}</p>
                <small>{text.description}</small>
              </div>
              <button
                className={selected ? "secondary-button" : "primary-button"}
                disabled={selected}
                onClick={() => onSelect(text.name, text.content, text.author)}
              >
                {selected ? "正在使用" : "设为背景"}
              </button>
            </article>
          );
        })}
      </div>

      <div className="import-guidance">
        <h2>本地文档规则</h2>
        <p>背景支持 TXT / DOCX，只读且自动绕开学习区。小说支持最大 20MB 的 UTF-8 TXT，导入后每页显示五行，可用左右方向键翻页。</p>
        {novelName && <strong>当前小说：{novelName}</strong>}
      </div>
    </section>
  );
}
