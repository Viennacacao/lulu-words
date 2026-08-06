import { useRef, useState, type ChangeEvent } from "react";
import type { BuiltInText } from "../document/textSources";

interface TextPanelProps {
  builtInTexts: BuiltInText[];
  selectedName: string;
  onSelect: (name: string, content: string, author?: string) => void;
}

export function TextPanel({ builtInTexts, selectedName, onSelect }: TextPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const importText = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("第一版单个 TXT 文件限制为 2MB，请拆分后再导入。");
      return;
    }

    try {
      const content = await file.text();
      setError("");
      onSelect(file.name, content, "本地导入 · 只读文本");
    } catch {
      setError("无法读取该 TXT 文件，请确认文件编码为 UTF-8。");
    }
  };

  return (
    <section className="feature-panel" aria-labelledby="text-panel-title">
      <header className="feature-panel-header">
        <div>
          <span className="feature-eyebrow">READ-ONLY TEXT</span>
          <h1 id="text-panel-title">选择文档背景</h1>
          <p>小说或 TXT 只用于模拟文档排版，不提供正文编辑功能。</p>
        </div>
        <button className="primary-button" onClick={() => inputRef.current?.click()}>
          导入 TXT
        </button>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept=".txt,text/plain"
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
        <h2>本地 TXT 规则</h2>
        <p>支持 UTF-8 纯文本，空行会识别为段落；超长段落会自动拆分，第一页始终绕开五行学习区。</p>
      </div>
    </section>
  );
}
