import { useRef, useState, type ChangeEvent } from "react";
import { importDocx } from "../document/docxImport";
import { createImportedDocumentTemplate, type BuiltInText } from "../document/textSources";
import type { DocumentTemplate } from "../document/templates";

interface TextPanelProps {
  builtInTexts: BuiltInText[];
  selectedName: string;
  onSelect: (name: string, content: string, author?: string) => void;
  onSelectTemplate: (template: DocumentTemplate) => void;
}

export function TextPanel({ builtInTexts, selectedName, onSelect, onSelectTemplate }: TextPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
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

  return (
    <section className="feature-panel" aria-labelledby="text-panel-title">
      <header className="feature-panel-header">
        <div>
          <span className="feature-eyebrow">READ-ONLY TEXT</span>
          <h1 id="text-panel-title">选择文档背景</h1>
          <p>TXT 或 DOCX 只用于模拟文档排版，不提供正文编辑功能。</p>
        </div>
        <button className="primary-button" onClick={() => inputRef.current?.click()}>
          {importing ? "正在导入…" : "导入 TXT / DOCX"}
        </button>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={importText}
        />
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
        <p>TXT 支持 UTF-8 纯文本；DOCX 会提取标题、段落、编号与表格文字。导入内容只读，第一页始终绕开五行学习区。</p>
      </div>
    </section>
  );
}
