import type { PropsWithChildren } from "react";
import type { DocumentTemplate } from "./templates";

interface OfficeShellProps extends PropsWithChildren {
  currentTemplateId: DocumentTemplate["id"];
  documentTitle: string;
  pageCount: number;
  wordCount: number;
  zoom: number;
  templates: DocumentTemplate[];
  onTemplateChange: (templateId: DocumentTemplate["id"]) => void;
  onZoomChange: (zoom: number) => void;
}

export function OfficeShell({
  children,
  currentTemplateId,
  documentTitle,
  pageCount,
  wordCount,
  zoom,
  templates,
  onTemplateChange,
  onZoomChange,
}: OfficeShellProps) {
  return (
    <div className="office-shell">
      <header className="office-header" aria-label="模拟文档工具栏">
        <div className="title-row">
          <div className="window-dots" aria-hidden="true">
            <span /><span /><span />
          </div>
          <div className="app-mark">W</div>
          <div className="document-title">{documentTitle}</div>
          <div className="header-status">已保存到本地</div>
        </div>
        <div className="menu-row" aria-hidden="true">
          <span>文件</span><span className="active">开始</span><span>插入</span><span>页面</span>
          <span>引用</span><span>审阅</span><span>视图</span><span>学习</span>
        </div>
        <div className="ribbon">
          <div className="ribbon-group wide" aria-hidden="true"><b>仿宋_GB2312</b><span>三号</span></div>
          <div className="ribbon-group" aria-hidden="true"><b>B</b><i>I</i><u>U</u><span>A</span></div>
          <div className="ribbon-group" aria-hidden="true"><span>☷</span><span>≡</span><span>☰</span><span>↔</span></div>
          <div className="ribbon-group styles" aria-hidden="true"><b>正文</b><b>标题 1</b><b>标题 2</b></div>
          <div className="ribbon-group" aria-hidden="true"><span>查找</span><span>选择</span></div>
          <label className="template-picker">
            <span>文档模板</span>
            <select
              aria-label="选择只读文档模板"
              value={currentTemplateId}
              onChange={(event) => onTemplateChange(event.target.value as DocumentTemplate["id"])}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </label>
        </div>
      </header>
      <main className="workspace">{children}</main>
      <footer className="status-bar">
        <span>页面：1/{pageCount}</span>
        <span>字数：{wordCount}</span>
        <span className="local-dot">● 本地模式</span>
        <span className="status-spacer" />
        <button aria-label="缩小文档" onClick={() => onZoomChange(zoom - 0.1)}>−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button aria-label="放大文档" onClick={() => onZoomChange(zoom + 0.1)}>＋</button>
      </footer>
    </div>
  );
}
