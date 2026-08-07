# 文档背词

一个以只读办公文档为视觉环境、在第一页中部提供固定五行学习区的本地背单词应用。

当前已完成核心学习交互、文档融合视觉、Tauri 桌面壳、SQLite 本地存储、FSRS 复习调度、六套离线词书、TXT/DOCX 只读导入、DeepSeek 学习助手、真实学习统计与字号排版。

## 已实现功能

- `学习`：五行学习区、快捷键评分、发音、助记和快速隐藏。
- `选词`：CET-4、CET-6、IELTS、TOEFL、PTE 学术核心、TOEIC 六套离线词书。
- `文本`：两份公版英文节选和本地 UTF-8 TXT / DOCX 导入，只读分页且绕开学习区。
- `统计`：累计复习、今日目标、独立单词、到期卡片、评分分布和助记数量。
- `我的`：每日目标、发音速度、快捷键提示和 DeepSeek 配置等纯本地设置。
- `AI 助手`：浮动栏直接输入问题，回答向上展开，并自动带入当前单词、释义、短语和例句上下文。
- `小说阅读`：导入最大 20MB 的 UTF-8 TXT，将小说正文按每页五行显示在学习区，支持方向键翻页并随时返回背词。
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

## 导入 TXT / DOCX

进入顶部 `文本`，点击 `导入背景文档`。背景 TXT 限制为 2MB，DOCX 限制为 20MB。DOCX 会提取标题、正文、编号与表格文字，并重新排入应用的只读文档页面；它不会复刻 Word 的图片、批注、页眉页脚和精确版式，也不提供文档编辑功能。

同一页面的 `导入小说 TXT` 是独立的阅读入口：它不会替换背景文档，而是把中间五行学习区切换成小说正文。按 <kbd>←</kbd>/<kbd>→</kbd> 翻页，<kbd>Space</kbd> 下一页，<kbd>Esc</kbd> 或浮动栏 `返回背词` 退出阅读模式。小说只在当前运行期间载入，重新打开应用后需要再次选择文件。

## DeepSeek AI 配置

推荐打开顶部 `我的`，在 `DeepSeek 设置` 中填写 API Key、API 地址和模型。设置保存在当前电脑的本地偏好中。回到 `学习` 后，在浮动操作栏右侧输入问题并按回车或点击 `发送`。

个人本地开发也可以复制环境配置：

```bash
cp .env.example .env
```

然后在 `.env` 中填写 `VITE_DEEPSEEK_API_KEY`，重新运行或构建应用。`.env` 已被 Git 忽略。注意：Vite 环境变量会在构建时写入前端资源，因此含真实 Key 的安装包只能自用，不能上传 GitHub Release 或发给他人。对外发布时请保持 `.env` 中的 Key 为空，让每位用户在 `我的` 中自行填写。

默认接口为 `https://api.deepseek.com`，应用通过桌面端后端请求 `/chat/completions`，默认模型可在 `我的` 中修改。

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
