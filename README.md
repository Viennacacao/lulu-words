# 文档背词

一个以只读办公文档为视觉环境、在第一页中部提供固定五行学习区的本地背单词应用。

当前已完成核心学习交互、文档融合视觉、Tauri 桌面壳、SQLite 本地存储、FSRS 复习调度，以及三套只读文档模板、分页缓存与稳定缩放。下一阶段接入 DOCX 导入和安全的只读排版。

## 环境要求

- Node.js 20 或更高版本。
- npm。
- 桌面端开发需要 Rust stable；macOS 还需要 Xcode Command Line Tools。

## 浏览器预览

```bash
npm install
npm run dev
```

浏览器预览使用 `localStorage` 作为本地存储，适合快速调试界面和学习流程。

## 桌面端运行

```bash
npm install
npm run desktop:dev
```

桌面端使用应用数据目录中的 `lulu-words.db`，通过 SQLite 保存卡片状态、复习日志和助记。

仅构建本地调试可执行文件、不生成安装包：

```bash
npm run desktop:build -- --debug --no-bundle
```

## 验证

```bash
npm run typecheck
npm run test
npm run build
cd src-tauri && cargo check --locked
```

完整计划见 [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md)。
