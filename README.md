# 文档背词

文档背词是一款为 macOS 设计的本地英语学习工具。它将单词学习和小说阅读融入一张只读办公文档页面，帮助你在工作间隙中低调、连续地学习。

应用不编辑 Word 文档，也不会修改导入的原文件。所有学习进度、助记、小说和设置都保存在当前电脑。

## 安装

1. 下载适用于 Apple Silicon Mac 的 DMG 安装包。
2. 打开 DMG，将“文档背词”拖入“应用程序”。
3. 从“应用程序”启动。

如果 macOS 提示应用来源未知，请在 Finder 中右键点击应用，选择“打开”，并在系统对话框中再次确认。

## 界面与使用

顶部保留了熟悉的文档工具栏视觉。其中“学习”、“选词”、“文本”、“统计”和“我的”是应用的功能入口。

### 背单词

文档第一页中部是固定六行学习区：

1. 单词、音标和发音。
2. 中文释义。
3. 助记，可自行编辑并保存。
4. 常用短语。
5. 英文例句。
6. 例句翻译。

点击“选词”可切换 CET-4、CET-6、IELTS、TOEFL、PTE 和 TOEIC 词书。每本词书切换后会立即载入对应内容，学习记录按单词共享，不会因切换词书丢失。

学习操作集中在可拖动的浮动栏中。字号调整会同时作用于文档正文和学习区，文档缩放则只改变页面的整体显示比例。

### 背景文档

进入“文本”，点击“导入背景文档”，可选择 TXT 或 DOCX。应用会提取文字并将其排入只读页面，中间自动为六行学习区留出位置。

- 背景 TXT：最大 2 MB，建议使用 UTF-8 编码。
- DOCX：最大 20 MB，支持标题、段落、编号和表格文字提取。

DOCX 导入用于生成适合阅读的模拟页面，不会复制 Word 中的图片、批注、页眉页脚或精确版式。

### 小说阅读

“文本”页同时包含本地小说书架。点击“导入小说 TXT”后，小说会复制到应用的本地数据目录，下次启动无需重新选择原文件。

书架会显示每本小说的文件大小、阅读百分比和上次页码。你可以在多本小说之间切换，继续上次位置，或从头开始。调整字号导致重新分页时，应用仍会尽量回到同一段文字。

从书架删除小说只会删除 App 中保存的副本，不会删除或修改用户原始 TXT。单本小说上限为 20 MB，建议使用 UTF-8 编码。

### AI 助手

浮动栏右侧的输入框可向 DeepSeek 提问。AI 会根据当前单词、例句或小说片段给出回答。

使用前进入“我的”，在 DeepSeek 设置中填写：

- API Key。
- API 地址，默认为 `https://api.deepseek.com`。
- 希望使用的模型名称。

API Key 仅保存在当前电脑的应用偏好中。公开发布的安装包不应内置任何个人 API Key。

## 快捷键

### 单词模式

| 按键 | 操作 |
| --- | --- |
| <kbd>Space</kbd> | 显示或隐藏答案 |
| <kbd>1</kbd> | 忘记 |
| <kbd>2</kbd> | 模糊 |
| <kbd>3</kbd> | 认识 |
| <kbd>P</kbd> | 播放单词发音 |
| <kbd>E</kbd> | 编辑助记 |
| <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd> | 保存助记 |
| <kbd>H</kbd> | 隐藏或恢复学习区 |
| <kbd>←</kbd>/<kbd>→</kbd> | 上一个或下一个单词 |

### 小说模式

| 按键 | 操作 |
| --- | --- |
| <kbd>←</kbd>/<kbd>→</kbd> | 上一页或下一页 |
| <kbd>Space</kbd> | 下一页 |
| <kbd>H</kbd> | 隐藏或恢复小说文字 |
| <kbd>Esc</kbd> | 返回背单词 |

浮动栏也可直接输入页码跳转。

## 本地数据与隐私

文档背词是本地优先应用：

- 学习进度、复习日志和助记保存在本地 SQLite 数据库。
- 小说副本保存在 `~/Library/Application Support/com.luluwords.desktop/novels`。
- 字号、词书、AI 配置等偏好保存在当前 Mac。
- 只有在你主动使用 AI 提问时，问题和当前学习上下文才会发送至所配置的 DeepSeek 接口。
- 导入的背景文档只用于当前应用会话，不会覆盖原文件。

## 开发与构建

需要 Node.js 20 或更高版本、npm、Rust stable 和 Xcode Command Line Tools。

浏览器界面预览：

```bash
npm install
npm run dev
```

浏览器预览不能持久化小说书架文件。调试完整桌面功能请运行：

```bash
npm run desktop:dev
```

生成 macOS 应用和 DMG：

```bash
npm run desktop:build
```

本地开发者可以复制 `.env.example` 配置默认 DeepSeek 参数：

```bash
cp .env.example .env
```

Vite 会将 `VITE_` 开头的变量写入构建产物。因此对外发布前必须保持 `VITE_DEEPSEEK_API_KEY` 为空，由用户在“我的”中自行填写。`.env` 已被 Git 忽略。

项目检查命令：

```bash
npm run typecheck
npm test
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## 词书与许可

内置词书为非官方学习清单。数据来源、授权和第三方说明请查看 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。
