# v0.11.0 阶段 1 — 编辑器技术选型报告

> 产出日期：2026-04-30
> 评估维度：MD 语法高亮、编辑/预览切换、WYSIWYG、轻量程度、Tauri/webview 兼容性、AI 辅助可扩展性

## 候选方案

| 方案 | 类型 | 底层 | React 集成 |
|------|------|------|------------|
| **CodeMirror 6** | 纯源码编辑器 | 自研 Lezer 解析器 | `@uiw/react-codemirror` |
| **TipTap** | 富文本框架 (headless) | ProseMirror | 一等公民支持 |
| **Milkdown** | WYSIWYG Markdown 框架 | ProseMirror + Remark | `@milkdown/react` |
| **Monaco Editor** | IDE 级源码编辑器 | VS Code 内核 | `@monaco-editor/react` |

## 六维评估

### 1. Markdown 语法高亮

| 方案 | 评分 | 说明 |
|------|------|------|
| CodeMirror 6 | ★★★★★ | `@codemirror/lang-markdown` + Lezer 解析器，GFM 完整支持，树式解析 |
| Milkdown | ★★★★★ | CodeMirror 6 驱动源码模式，Remark 解析 AST，双向同步 |
| TipTap | ★★★☆☆ | 原生是富文本编辑器，MD 通过 `@tiptap/extension-markdown` 扩展转换，语法高亮依赖代码块扩展 |
| Monaco | ★★★☆☆ | Markdown 仅 basic syntax colorization，无高级 MD 语言服务 |

### 2. 编辑/预览切换

| 方案 | 评分 | 说明 |
|------|------|------|
| Milkdown | ★★★★★ | Crepe 组件内置 CodeMirror 6 源码视图 ↔ WYSIWYG 双向切换 |
| CodeMirror 6 | ★★★★☆ | 纯源码编辑；预览需自建 React 渲染面板（react-markdown 复用已有） |
| TipTap | ★★★☆☆ | WYSIWYG 为主；源码模式需自行实现 MD 序列化/反序列化切换 |
| Monaco | ★★★★☆ | 纯源码编辑；预览需自建面板，与 CodeMirror 6 类似 |

### 3. WYSIWYG

| 方案 | 评分 | 说明 |
|------|------|------|
| Milkdown | ★★★★★ | 原生 WYSIWYG Markdown，所见即所得，底层仍是纯 Markdown 文本 |
| TipTap | ★★★★★ | 成熟富文本 WYSIWYG，但以 HTML 为内部模型，Markdown 为转换层 |
| CodeMirror 6 | ★★☆☆☆ | 纯源码编辑器，无 WYSIWYG |
| Monaco | ★★☆☆☆ | 纯源码编辑器，无 WYSIWYG |

### 4. 轻量程度 (bundle size / 性能)

| 方案 | gzip 大小 | 评分 | 说明 |
|------|-----------|------|------|
| Milkdown | ~40 KB (最小核心) | ★★★★★ | 插件化，按需加载。核心极轻 |
| CodeMirror 6 | ~50–60 KB (最小) | ★★★★☆ | 模块化极佳，可精确控制扩展。`basicSetup` 不必要时应跳过 |
| TipTap | ~60–90 KB (StarterKit) | ★★★☆☆ | 功能丰富的代价，100+ 扩展可选加载 |
| Monaco | ~706 KB (单 worker) | ★☆☆☆☆ | 2.7 MB 未压缩。需懒加载并仅使用 editor worker |

### 5. Tauri / WebView 兼容性

| 方案 | 评分 | 说明 |
|------|------|------|
| Monaco | ★★★★★ | 已验证：miaogu-notepad（Tauri + Monaco）成功交付，< 25MB exe |
| TipTap | ★★★★☆ | ProseMirror 底层，标准 DOM 操作，预期兼容良好 |
| CodeMirror 6 | ★★★★☆ | **必须**在 CSP 中添加 `style-src 'unsafe-inline'`（CM6 运行时注入内联样式）。已知修复方案，社区有文档 |
| Milkdown | ★★★★☆ | 源码模式依赖 CodeMirror 6（同 CSP 约束），WYSIWYG 模式依赖 ProseMirror |

### 6. AI 辅助可扩展性

| 方案 | 评分 | 说明 |
|------|------|------|
| TipTap | ★★★★★ | 成熟的事务 API、node/mark 扩展系统、decoration 层。AI inline suggestion 可作为 node 插入。100+ 扩展生态 |
| Milkdown | ★★★★☆ | ProseMirror 事务 API 完整暴露，插件系统灵活。需自行编写 AI 插件 |
| CodeMirror 6 | ★★★★☆ | 编程化文本插入、选区操作、decoration API。Inline suggestion 可实现为 decoration |
| Monaco | ★★★★☆ | 完整编程 API、decoration API。有 Tauri + Monaco + AI 内联补全的参考项目 |

## 总评

| 方案 | MD 高亮 | 编辑/预览 | WYSIWYG | 轻量 | Tauri 兼容 | AI 扩展 | 综合 |
|------|---------|-----------|---------|------|-----------|---------|------|
| CodeMirror 6 | 5 | 4 | 2 | 4 | 4 | 4 | **23** |
| TipTap | 3 | 3 | 5 | 3 | 4 | 5 | **23** |
| **Milkdown** | **5** | **5** | **5** | **5** | **4** | **4** | **28** |
| Monaco | 3 | 4 | 2 | 1 | 5 | 4 | **19** |

## 推荐：Milkdown

**理由**：

1. **Markdown 是唯一数据源** — Milkdown 内部以纯 Markdown 文本为权威状态（ProseMirror 编辑器仅作渲染层），完全契合 Asteria 基于 Git 仓库的文件模型
2. **WYSIWYG + 源码双模式** — 用户可在所见即所得和源码编辑之间切换，满足从写作到精确控制的全部场景
3. **插件化轻量架构** — 最小核心 ~40KB gzipped，按需加载数学公式、图表、代码高亮等扩展
4. **ProseMirror 基石** — 继承 ProseMirror 的成熟事务模型、历史管理和未来协作编辑能力（Y.js）
5. **Remark 生态** — 复用统一的 Markdown AST 解析，与前端已有的 `react-markdown` + `remarkGfm` 技术栈一致

**需要关注的风险**：

| 风险 | 应对 |
|------|------|
| v7 是 headless 架构，需自行构建工具栏/菜单 | 使用 `@milkdown/crepe` 组件作为起点，逐步定制 |
| 仅有单个维护者（bus factor） | 底层 ProseMirror + Remark 是成熟社区项目；Milkdown 本质是胶水层 |
| React 集成还不够"React 化" | 封装 1–2 个适配组件，隔离非 React 惯用 API |
| Crepe 仍在成熟中 | 阶段 2 从 Crepe 开始验证，如不稳定可退回使用核心 API |

## 备选：TipTap

如果 Milkdown 的 headless 实现成本超出预期，**TipTap 是降级方案**：
- 生态成熟、文档完善、React 一等支持
- 但核心权衡：HTML 为内部模型，Markdown 是导入导出层，与 Git 仓库文件模型有语义差异

---

*阶段 1 完成。请确认推荐方案或选择备选方案，确认后将更新 ROADMAP v0.11.0 约束并进入阶段 2 实现。*
