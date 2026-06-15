# Asteria Markdown 编辑器 — 实现计划

> 在 Tauri v2 + Vue 3 + TypeScript 项目上，从零构建 Obsidian 风格的 Markdown 编辑器。
>
> **技术栈**：Tauri v2 / Vue 3 / TypeScript / CodeMirror 6 / 自研 Markdown 解析器

---

## 目录结构

```
src/
├── main.ts
├── App.vue
├── components/
│   ├── editor/
│   │   ├── MarkdownEditor.vue       # 编辑器主组件（CM6 容器）
│   │   └── EditorToolbar.vue        # 工具栏
│   ├── file-tree/
│   │   ├── FileTree.vue             # 文件树容器
│   │   ├── FileTreeNode.vue         # 递归节点组件
│   │   └── FileTreeContextMenu.vue  # 右键菜单
│   ├── tabs/
│   │   └── TabBar.vue               # 标签栏
│   └── layout/
│       └── Sidebar.vue              # 侧边栏容器
├── parser/
│   ├── types.ts                     # AST 节点类型定义
│   ├── lexer.ts                     # 词法分析器（块级 + 行内 Token 化）
│   ├── inline-parser.ts             # 行内元素解析器
│   ├── parser.ts                    # 语法分析器（Token → AST）
│   └── index.ts                     # 统一导出
├── editor/
│   ├── decorations.ts               # Decoration 生成逻辑
│   ├── widgets.ts                   # Widget 定义（图片、代码块等）
│   ├── cursor-tracker.ts            # 光标行追踪
│   ├── code-highlighter.ts          # 代码块语法高亮
│   ├── theme.ts                     # CM6 主题
│   └── index.ts                     # 组装 CM6 扩展
├── composables/
│   ├── useFileManager.ts            # 文件操作逻辑
│   ├── useEditorState.ts            # 编辑器状态管理
│   └── useTabs.ts                   # 标签页管理
├── styles/
│   ├── variables.css                # CSS 变量（主题色）
│   ├── editor.css                   # 编辑器样式
│   └── global.css                   # 全局样式
└── utils/
    └── debounce.ts

src-tauri/
├── src/
│   ├── main.rs
│   ├── lib.rs
│   └── commands/
│       ├── mod.rs
│       └── file_ops.rs              # 文件操作命令
└── capabilities/
    └── default.json
```

---

## Phase 1: 项目基础设施

### Step 1.1 — 安装依赖

- [x] 安装 CodeMirror 6 核心包
  ```bash
  bun add codemirror @codemirror/state @codemirror/view @codemirror/commands @codemirror/language
  ```
- [x] 安装 Tauri 前端插件
  ```bash
  bun add @tauri-apps/plugin-fs @tauri-apps/plugin-dialog
  ```
- [x] 安装 Tauri Rust 插件
  ```bash
  cargo add tauri-plugin-fs --manifest-path src-tauri/Cargo.toml
  cargo add tauri-plugin-dialog --manifest-path src-tauri/Cargo.toml
  ```
- [x] 验证：`bun install` 无报错

**知识点**：
- `@codemirror/state` — 不可变状态管理（EditorState、Transaction）
- `@codemirror/view` — 视图层（EditorView、Decoration、Widget）
- `@codemirror/commands` — 标准编辑命令（撤销、复制等）
- `@codemirror/language` — 语言支持基础设施（syntaxTree）
- `codemirror` — 包含 `basicSetup` 的便捷包

### Step 1.2 — 配置 Tauri 权限

- [x] 修改 `src-tauri/capabilities/default.json`，添加 `fs` 和 `dialog` 权限
- [x] 在 `lib.rs` 中注册 `tauri_plugin_fs` 和 `tauri_plugin_dialog`

**知识点**：
- Tauri v2 使用 Capability 系统替代 v1 的 scope 配置
- `fs:allow-read-text-file` 等细粒度权限控制
- 权限声明与前端 `@tauri-apps/plugin-*` 的对应关系

### Step 1.3 — 创建目录结构

- [ ] 创建计划中列出的所有目录和空文件骨架
- [ ] 验证：`bun run dev` 正常启动，页面显示默认模板

---

## Phase 2: Markdown 解析器

### Step 2.1 — AST 类型定义

- [x] 创建 `src/parser/types.ts`
- [x] 定义 `Position` 接口（line, column, offset）
- [x] 定义 `SourceSpan` 接口（start, end）
- [x] 定义 `TokenType` 枚举
  - 块级：Heading, CodeFence, Blockquote, List, ListItem, HorizontalRule, Paragraph, Table
  - 行内：Bold, Italic, BoldItalic, InlineCode, Link, Image, Strikethrough, TaskCheckbox, HardBreak
  - 基础：Text, Newline, EOF
- [x] 定义 `Token` 接口（type, value, span, children?, meta?）
- [x] 定义 `MDNode` 接口（type, span, children?, props?）
- [x] 验证：TypeScript 编译通过

**知识点**：
- AST vs Token 流：Token 是扁平的，AST 是树形的
- 为什么需要 `SourceSpan`：用于编辑器中定位和映射
- `meta` 字段的作用：存储节点附加信息（标题级别、代码语言、列表有序/无序）

### Step 2.2 — 块级词法分析器

- [x] 创建 `src/parser/lexer.ts`
- [x] 实现 `BlockLexer` 类，逐行扫描文档
- [x] 识别 ATX 标题 `# ~ ######`
- [x] 识别围栏代码块 ` ``` `（含语言标识，跟踪开/关状态）
- [x] 识别引用 `> `
- [x] 识别无序列表 `- ` `* ` `+ `
- [x] 识别有序列表 `1. `
- [x] 识别任务列表 `- [ ] ` `- [x] `
- [x] 识别分割线 `---` `***` `___`
- [x] 识别表格 `|...|...|`
- [x] 识别空行（段落分隔符）
- [x] 普通段落作为默认兜底
- [x] 每个 Token 记录行号范围和原始文本
- [x] 编写测试验证输出

**知识点**：
- 词法分析器的本质：有限状态机（FSM）
- 为什么先做块级再做行内：Markdown 是两层语法
- 围栏代码块的状态跟踪：类似括号匹配

### Step 2.3 — 行内词法分析器

- [x] 创建 `src/parser/inline-parser.ts`
- [x] 实现 `InlineLexer` 类，对段落/标题内容做行内扫描
- [x] 识别粗体 `**text**` / `__text__`
- [x] 识别斜体 `*text*` / `_text_`
- [x] 识别粗斜体 `***text***`
- [x] 识别行内代码 `` `code` ``
- [x] 识别链接 `[text](url)`
- [x] 识别图片 `![alt](src)`
- [x] 识别删除线 `~~text~~`
- [x] 处理嵌套：如 `**bold *and italic***`
- [x] 处理转义：`\*` 不触发斜体
- [x] 编写测试验证嵌套用例

**知识点**：
- 行内解析的难点：歧义（`*` 可以是粗体或斜体的开头）
- 优先级规则：行内代码 > 粗体 > 斜体 > 链接 > 图片
- 递归下降 vs 状态机：行内解析适合用状态机
- 左右值绑定（left-flanking / right-flanking delimiter run）：CommonMark 核心概念

### Step 2.4 — 语法分析器（Token → AST）

- [x] 创建 `src/parser/parser.ts`
- [x] 实现 `Parser` 类，接收 Token 数组，输出 `MDNode[]`
- [x] 块级组装：列表项归入列表节点
- [x] 块级组装：引用块内的段落归入引用节点
- [x] 块级组装：表格解析为结构化数据（表头行 + 分隔行 + 数据行）
- [x] 行内组装：将行内 Token 树挂到段落/标题节点的 `children` 下
- [x] 创建 `src/parser/index.ts`，统一导出 `parse(markdown: string): MDNode[]`
- [x] 验证：`parse("# Hello\n\nThis is **bold**.")` 输出正确 AST

**知识点**：
- 递归下降解析：列表中可以嵌套列表
- CommonMark 规范的核心概念
- 为什么自研解析器而非用 Lezer 树：完全掌控 AST 结构

---

## Phase 3: CodeMirror 6 基础

### Step 3.1 — 最小编辑器

- [x] 创建 `src/components/editor/MarkdownEditor.vue`
- [x] 使用 `<script setup lang="ts">` + Composition API
- [x] 在 `onMounted` 中创建 CM6 EditorView，挂载到 DOM 元素
- [x] 使用 `basicSetup` + 空文档
- [x] 在 `onUnmounted` 中调用 `view.destroy()`
- [x] 监听文档变更事件（`EditorView.updateListener`）
- [x] 验证：页面显示一个可编辑的文本区域，能输入文字

**知识点**：
- CM6 的不可变状态模型：每次编辑产生 Transaction → 新 State
- EditorView 是 State 的"渲染器"
- `basicSetup` 包含哪些默认扩展（行号、括号匹配、自动缩进等）
- 为什么要在 `onUnmounted` 中 `view.destroy()`：防止内存泄漏

### Step 3.2 — 加载示例文档

- [x] 给编辑器预填一段 Markdown 示例文本
- [x] 验证：编辑器显示多行 Markdown 原始文本

---

## Phase 4: WYSIWYG 引擎

### Step 4.1 — 光标行追踪

- [x] 创建 `src/editor/cursor-tracker.ts`
- [x] 实现 `cursorLineField: StateField<Set<number>>`
- [x] 在 `update` 中检测 `tr.selection`，更新行号集合
- [x] 导出 `getCursorLines(state)` 工具函数
- [x] 验证：在控制台打印光标行号，移动光标验证

**知识点**：
- `StateField` 是 CM6 中存储自定义状态的机制
- `Transaction` 的 `selection` 属性表示光标变化
- 为什么用 `Set<number>`：支持多光标

### Step 4.2 — 第一个 Decoration（隐藏粗体标记）

- [x] 创建 `src/editor/decorations.ts`
- [x] 实现 `buildDecorations(view, cursorLines)` 函数
- [x] 用自研 Parser 解析文档，遍历 AST
- [x] 找到所有 `Bold` 节点，对非光标行：
  - 用 `Decoration.replace({})` 隐藏 `**` 标记
  - 用 `Decoration.mark({ class: "cm-bold" })` 给文字加粗
- [x] 使用 `ViewPlugin` 包装，在 `update` 中触发重建
- [x] 验证：`**bold**` 光标移开后 `**` 消失、文字变粗；光标移入恢复原始

**知识点**：
- `Decoration.mark` — 给范围添加样式类
- `Decoration.replace` — 隐藏/替换范围内容
- `DecorationSet` 必须按 `from` 位置排序
- `ViewPlugin.fromClass` 的 `decorations` 属性暴露给视图

### Step 4.3 — 扩展所有行内 Decoration

- [x] 斜体 `*italic*`：隐藏 `*`，加 italic 样式
- [x] 行内代码 `` `code` ``：隐藏 `` ` ``，加 code 样式（等宽+背景色）
- [x] 链接 `[text](url)`：隐藏语法，显示为带样式的链接文本
- [x] 删除线 `~~strikethrough~~`：隐藏 `~~`，加删除线样式
- [x] 验证：各种行内语法在光标移开后正确渲染

### Step 4.4 — 块级 Widget（图片、分割线）

- [x] 创建 `src/editor/widgets.ts`
- [x] 实现 `ImageWidget extends WidgetType`
  - `toDOM()` 返回 `<img>` 元素
  - `eq()` 比较 src 和 alt
  - `ignoreEvent()` 返回 false
- [x] 实现 `HorizontalRuleWidget`：返回 `<hr>` 元素
- [x] 在 `decorations.ts` 中用 `Decoration.replace({ widget, block: true })` 替换
- [x] 验证：`![alt](path)` 渲染为图片，`---` 渲染为水平线

**知识点**：
- `WidgetType.toDOM()` — 创建实际 DOM 元素
- `WidgetType.eq()` — CM6 用此判断是否复用 DOM（性能关键）
- `block: true` — 块级 widget 影响行高计算
- `ignoreEvent()` — 控制 widget 是否响应鼠标/键盘事件

### Step 4.5 — 标题渲染

- [x] 隐藏 `#` 标记
- [x] 根据级别（h1-h6）应用不同字号
- [x] 整行应用 `Decoration.line({ class: "cm-heading-N" })`
- [x] 验证：`# Title` 显示为大号粗体，`## Subtitle` 稍小

### Step 4.6 — 列表与引用渲染

- [x] 列表：隐藏 `-` / `*` / `1.` 标记，用 `BulletWidget` 显示圆点
- [x] 引用：隐藏 `>` 标记，整行加左边框样式 + 缩进
- [x] 任务列表：`- [ ]` 替换为 `CheckboxWidget`（可点击切换）
- [x] 验证：列表、引用、任务列表正确渲染

### Step 4.7 — 代码块 Widget

- [x] 实现 `CodeBlockWidget extends WidgetType`
- [x] 显示语言标签 + 代码内容（带基础高亮）
- [x] 用 `Decoration.replace({ widget, block: true })` 替换整个围栏代码块
- [x] 验证：` ```js\ncode\n``` ` 渲染为带样式的代码块

**知识点**：
- 代码块是跨行的，需要精确计算 `from` 和 `to` 范围
- Widget 内部可以包含任意 HTML/CSS

### Step 4.8 — 表格 Widget

- [x] 实现 `TableWidget extends WidgetType`
- [x] 解析表格 AST 为 HTML `<table>`
- [x] 替换整个表格语法区域
- [x] 验证：GFM 表格正确渲染为 HTML 表格

---

## Phase 5: Tauri 文件操作

### Step 5.1 — Rust 文件命令

- [ ] 创建 `src-tauri/src/commands/mod.rs` 和 `file_ops.rs`
- [ ] 定义 `FileEntry` 结构体（name, path, is_dir, children）
- [ ] 实现 `read_file(path) -> Result<String, String>`
- [ ] 实现 `write_file(path, content) -> Result<(), String>`
- [ ] 实现 `list_dir(path) -> Result<Vec<FileEntry>, String>`
- [ ] 实现 `create_file(path) -> Result<(), String>`
- [ ] 实现 `create_dir(path) -> Result<(), String>`
- [ ] 实现 `delete_path(path) -> Result<(), String>`
- [ ] 实现 `rename_path(old, new) -> Result<(), String>`
- [ ] 在 `lib.rs` 中注册所有命令
- [ ] 验证：在 Vue 中调用 `invoke("read_file", { path })` 能读取文件

**知识点**：
- `#[tauri::command]` 宏将 Rust 函数暴露给前端
- `Result<T, String>` 的 Err 会自动转为前端 JS 异常
- `serde` 序列化：Rust 结构体自动转为 JSON
- Tauri v2 的 fs 插件 vs 自定义命令的区别

---

## Phase 6: 文件管理器

### Step 6.1 — useFileManager composable

- [x] 创建 `src/composables/useFileManager.ts`
- [x] 定义响应式状态：`currentFolder`、`fileTree`、`selectedFile`
- [x] 实现 `openFolder()` — 打开文件夹选择对话框
- [x] 实现 `refreshTree()` — 刷新文件树
- [x] 实现 `selectFile(path)` — 选中文件
- [x] 实现 `createFile(path)` / `createDir(path)`
- [x] 实现 `deleteItem(path)` / `renameItem(oldPath, newPath)`
- [x] 实现 `readFile(path)` / `saveFile(path, content)`

**知识点**：
- Vue 3 Composition API 的 composable 模式
- `ref()` / `reactive()` 响应式状态
- `async` composable 方法
- 与 Tauri IPC 的交互模式

### Step 6.2 — FileTree 组件

- [x] 创建 `src/components/file-tree/FileTree.vue`
- [x] 创建 `src/components/file-tree/FileTreeNode.vue`
- [x] `FileTree.vue` 显示根目录，调用 `useFileManager`
- [x] `FileTreeNode.vue` 递归渲染文件夹/文件
- [x] 文件夹点击展开/折叠
- [x] 文件点击触发选中事件
- [ ] 验证：能正确显示目录结构

**知识点**：
- Vue 递归组件（组件引用自身）
- `emit` 事件传递
- 条件渲染与过渡动画

### Step 6.3 — 右键菜单与文件 CRUD

- [x] 创建 `src/components/file-tree/FileTreeContextMenu.vue`
- [x] 实现右键菜单：新建文件、新建文件夹、重命名、删除
- [x] 调用 `useFileManager` 对应方法
- [x] 操作后刷新文件树
- [ ] 验证：能在文件树中新建、重命名、删除文件和文件夹

---

## Phase 7: 应用布局与集成

### Step 7.1 — 标签栏

- [x] 创建 `src/composables/useTabs.ts`
- [x] 创建 `src/components/tabs/TabBar.vue`
- [x] 管理打开的文件标签列表
- [x] 点击标签切换编辑器内容
- [x] 关闭标签（未保存时提示）
- [x] 标签上的修改标记（小圆点）

### Step 7.2 — 主布局

- [x] 重写 `src/App.vue`，组装布局：侧边栏 + 标签栏 + 编辑器
- [x] 创建 `src/components/layout/Sidebar.vue`
- [x] 侧边栏可折叠/展开
- [x] 文件选择 → 打开标签 → 编辑器加载内容
- [x] 编辑器内容变更 → 标签标记为已修改
- [x] Ctrl+S 保存当前文件
- [x] 验证：完整流程——打开文件夹 → 点击文件 → 编辑 → 保存

---

## Phase 8: 代码高亮 + 主题

### Step 8.1 — 基础语法高亮

- [x] 创建 `src/editor/code-highlighter.ts`
- [x] 在 `CodeBlockWidget` 内部实现基于正则的关键词高亮
- [x] 支持语言：JS/TS、Python、Rust、HTML/CSS、JSON
- [x] 定义 token 类型和对应颜色

### Step 8.2 — 编辑器主题

- [x] 创建 `src/editor/theme.ts`
- [x] 定义 CM6 主题（`EditorView.theme()`）
- [x] 创建 `src/styles/variables.css`，定义 CSS 变量（亮色/暗色）
- [x] 创建 `src/styles/editor.css`，编辑器专用样式
- [x] 创建 `src/styles/global.css`，全局样式
- [x] 所有 Widget 样式与主题一致

---

## Phase 9: 打磨与优化

### Step 9.1 — 性能优化

- [x] 视口渲染：只处理 `view.visibleRanges`
- [x] 增量 Decoration 更新（先 `map(tr.changes)` 再局部重建）
- [x] 光标移动防抖（50ms）
- [x] 使用 `RangeSetBuilder` 构建大量 Decoration
- [ ] 大文件测试（1000+ 行）

### Step 9.2 — 边界情况

- [x] 空文档处理
- [x] 未闭合语法（如只有 `**` 没有闭合）
- [x] 深层嵌套
- [x] Unicode / 中文字符
- [x] 超长行

---

## 进度总览

| Phase | 内容 | 预估时间 | 难度 |
|-------|------|---------|------|
| 1 | 项目基础设施 | 0.5 天 | 低 |
| 2 | Markdown 解析器 | 4-6 天 | 高 |
| 3 | CodeMirror 6 基础 | 0.5 天 | 低 |
| 4 | WYSIWYG 引擎 | 4-5 天 | 高 |
| 5 | Tauri 文件操作 | 1 天 | 中 |
| 6 | 文件管理器 | 2-3 天 | 中 |
| 7 | 应用布局与集成 | 2-3 天 | 中 |
| 8 | 代码高亮 + 主题 | 1 天 | 中 |
| 9 | 打磨与优化 | 1-2 天 | 中 |

**总计约 16-22 天**

---

## 备注

- 每完成一个 Step 后，建议运行 `bun run dev` 验证当前进度
- Phase 2 和 Phase 4 是核心难点，遇到问题可以暂停并讨论
- 解析器可以先用简单的测试用例验证，不需要完整的测试框架
- CM6 的 Decoration 排序问题是最常见的坑，注意 `from` 位置必须有序
