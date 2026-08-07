# 文档背词

一个以只读办公文档为视觉环境、在第一页中部提供固定五行学习区的本地背单词应用。

当前已完成核心学习交互、文档融合视觉、Tauri 桌面壳、SQLite 本地存储、FSRS 复习调度、六套离线词书、TXT 小说背景、真实学习统计与字号排版。下一阶段继续接入 DOCX 导入和桌面体验。

## 已实现功能

- `学习`：五行学习区、快捷键评分、发音、助记和快速隐藏。
- `选词`：CET-4、CET-6、IELTS、TOEFL、PTE 学术核心、TOEIC 六套离线词书。
- `文本`：两份公版英文节选和本地 UTF-8 TXT 导入，只读分页且绕开学习区。
- `统计`：累计复习、今日目标、独立单词、到期卡片、评分分布和助记数量。
- `我的`：每日目标、发音速度和快捷键提示等纯本地设置。
- 文档工具栏：15–20px 真实字号调整；正文与学习区同步重排。页面缩放独立于字号。

内置词书均为非官方学习清单，来源和许可见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。

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
npm audit --audit-level=high
```

当前测试还会校验六套词书的数量、字段完整性、重复 ID 和跨词书进度共享。

## 重新生成词书

词书生成脚本不会把 65MB 的 ECDICT 源文件提交到仓库，只输出约 3.9MB 的应用数据。准备好三个已授权源文件后运行：

```bash
python3 scripts/build_wordbooks.py \
  --ecdict /path/to/ecdict.csv \
  --awl /path/to/words.json \
  --toeic /path/to/toeic_zh-hant.csv \
  --output src/assets/wordbooks
```

完整计划见 [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md)。
