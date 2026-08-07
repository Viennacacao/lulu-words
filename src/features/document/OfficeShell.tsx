import type { PropsWithChildren } from "react";
import type { AppView } from "../../core/preferences/AppPreferences";
import type { DocumentTemplate } from "./templates";

interface OfficeShellProps extends PropsWithChildren {
  activeView: AppView;
  currentTemplateId: string;
  documentTitle: string;
  pageCount: number;
  wordCount: number;
  zoom: number;
  fontSize: number;
  templates: DocumentTemplate[];
  onViewChange: (view: AppView) => void;
  onTemplateChange: (templateId: string) => void;
  onZoomChange: (zoom: number) => void;
  onFontSizeChange: (fontSize: number) => void;
}

const featureTabs: Array<{ id: AppView; label: string }> = [
  { id: "study", label: "学习" },
  { id: "wordbooks", label: "选词" },
  { id: "texts", label: "文本" },
  { id: "statistics", label: "统计" },
  { id: "profile", label: "我的" },
];

export function OfficeShell({
  children,
  activeView,
  currentTemplateId,
  documentTitle,
  pageCount,
  wordCount,
  zoom,
  fontSize,
  templates,
  onViewChange,
  onTemplateChange,
  onZoomChange,
  onFontSizeChange,
}: OfficeShellProps) {
  const isCustomText = !templates.some((template) => template.id === currentTemplateId);

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

        <nav className="menu-row" aria-label="应用功能导航">
          <span>文件</span><span>开始</span><span>插入</span><span>页面</span>
          <span>引用</span><span>审阅</span><span>视图</span>
          <i className="menu-divider" aria-hidden="true" />
          {featureTabs.map((tab) => (
            <button
              className={activeView === tab.id ? "active" : undefined}
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="ribbon">
          <div className="ribbon-group font-controls">
            <strong>仿宋_GB2312</strong>
            <button aria-label="缩小字号" onClick={() => onFontSizeChange(fontSize - 1)}>A−</button>
            <select
              aria-label="文档字号"
              value={fontSize}
              onChange={(event) => onFontSizeChange(Number(event.target.value))}
            >
              <option value="15">小四 · 15</option>
              <option value="16">四号 · 16</option>
              <option value="17">三号 · 17</option>
              <option value="18">小二 · 18</option>
              <option value="19">二号 · 19</option>
              <option value="20">小一 · 20</option>
            </select>
            <button aria-label="放大字号" onClick={() => onFontSizeChange(fontSize + 1)}>A＋</button>
          </div>
          <div className="ribbon-group" aria-hidden="true"><b>B</b><i>I</i><u>U</u><span>A</span></div>
          <div className="ribbon-group" aria-hidden="true"><span>☷</span><span>≡</span><span>☰</span><span>↔</span></div>
          <div className="ribbon-group styles" aria-hidden="true"><b>正文</b><b>标题 1</b><b>标题 2</b></div>
          <label className="template-picker">
            <span>文档模板</span>
            <select
              aria-label="选择只读文档模板"
              value={isCustomText ? currentTemplateId : currentTemplateId}
              onChange={(event) => onTemplateChange(event.target.value)}
            >
              {isCustomText && <option value={currentTemplateId}>当前导入文档</option>}
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
