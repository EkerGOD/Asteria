# Asteria / 星识 产品需求文档

## 产品定位

Asteria / 星识 是一个 desktop-first、AI-native 的个人知识系统，面向个人和小团队的本地知识管理、检索与问答场景。

英文 tagline：An AI-native personal knowledge system.

中文 slogan：让每一次对话，成为知识星图的一部分。

Asteria / 星识 的核心价值是：让用户在桌面端沉淀结构化知识，把分散的知识星点连接成可回溯、可发散、可提问的知识星图，并用 RAG 基于自己的知识库提问、回溯和生成答案。

Asteria / 星识 MVP 不是 Web-first SaaS。桌面应用是主要产品形态；开发期出现的浏览器页面或 Vite dev server 只服务于 Tauri 开发流程。

## 目标用户

MVP 目标用户：

- 需要整理碎片化知识的开发者、研究者、写作者、产品/运营人员和独立创作者。
- 偏好本地优先工作流，希望知识库和 AI Provider 配置由自己掌控的用户。
- 能接受早期产品形态、能配置 OpenAI-compatible Provider、能在开发期使用 Docker Compose 的技术型早期用户。

MVP 非目标用户：

- 需要 SSO、RBAC、审计日志、集中式管理或合规流程的企业团队。
- 主要依赖移动端、浏览器插件、实时协作或云同步的用户。
- 希望 Asteria / 星识 替代完整文档管理系统、团队聊天系统或托管向量数据库服务的用户。

## MVP 做什么

MVP 需要证明 Asteria / 星识 可以作为一个 desktop-first 的本地 AI 知识助手运行。

MVP 范围包括：

- 基于 Tauri 的桌面应用壳。
- React + Vite + TypeScript + Tailwind CSS UI。
- FastAPI 本地后端服务。
- PostgreSQL + pgvector 持久化和语义检索。
- SQLAlchemy ORM 和 Alembic 数据库迁移。
- conversations、messages、projects、knowledge units、tags 的基础管理。
- 手动创建、编辑、归档、搜索和标记 knowledge units。
- OpenAI-compatible Provider 配置。
- knowledge units 的 embedding 生成和刷新。
- 基于 pgvector 的语义检索。
- 基于检索结果的 RAG 问答。
- 基础应用设置和诊断状态。

## MVP 不做什么

MVP 不包含：

- Web-first 产品形态或公开 Web 应用。
- 多用户账号、登录、权限、团队空间或组织管理。
- 云同步、托管存储或远程协作。
- 移动端应用。
- 浏览器插件采集。
- PDF、Office、图片、OCR、音频等完整文件解析流水线。
- 自动网页爬取。
- 超出单次 RAG 问答的 Agent 执行能力。
- 计费、订阅、用量统计或管理员后台。
- Prompt Studio、Prompt 版本管理或复杂自动化流程。
- 生产级安装包、自动更新、签名和发布流程。

## 核心用户流程

### 首次启动与 Provider 配置

1. 用户打开 Asteria / 星识 桌面应用。
2. 桌面应用连接本地 FastAPI 服务。
3. 用户点击左下角 ⚙️ 设置按钮，打开 Settings Overlay。
4. 在 Providers Tab 中创建或选择一个 OpenAI-compatible Provider。
5. 用户填写 base URL、API key、chat model、embedding model 和 embedding dimension。
6. 后端验证 Provider 连通性。
7. 用户将该 Provider 保存为 active provider。

### 管理仓库（Repository / Vault）

1. 用户点击左侧面板底部仓库名 → 弹出菜单 →「管理仓库…」。
2. 新建仓库：在指定目录下创建文件夹并注册为 Repository。
3. 打开本地仓库：选择已有本地文件夹注册为 Repository。
4. 已创建的仓库间可快速切换，仓库间数据完全隔离。

### 浏览和编辑文件

1. 用户在左侧文件浏览器浏览当前仓库的文件树。
2. 点击文件 → 在中央 Editor 以新 Tab 打开。
3. 在 Editor 中编辑 Markdown 文件，支持编辑/预览模式切换。
4. 选中文本 → 右键→「提取为 Knowledge 单元」或调用 AI 辅助。

### RAG 提问

1. 用户在右侧面板切换到 Chat 视图。
2. 在 Chat 下半区选择或创建 conversation。
3. 在输入框中输入问题（支持 `@knowledge` 引用特定知识）。
4. 桌面前端将请求发送给 FastAPI。
5. 后端执行 RAG 流程：保存 user message → 检索相关知识片段 → 构造 prompt → 调用 AI Provider。
6. 后端保存 assistant message 和 retrieval metadata。
7. Chat 视图上半区展示回答和引用的 source references。

### Knowledge 知识管理

1. 用户在右侧面板切换到 Knowledge 视图。
2. 浏览卡片/列表视图，或切换到图谱视图查看知识关系。
3. Knowledge 可由 Agent 在对话中自动生成/修改/删除/更新。
4. 用户也可手动新建、编辑、归档、打标签、刷新 embeddings。
5. 每条 Knowledge 可溯源至生成它的对话。

### Project 管理

1. 在 Chat 视图下方工具栏点击 Project 选择器。
2. 切换已有 Project / 新建 Project / 选择不使用 Project。
3. Project 是 Chat 对话的管理容器，用于系统性长期任务。
4. Project 与文件系统中的 Repository 是独立概念线。

## 布局与视图

Asteria MVP 采用 Obsidian 风格的多区域 AppShell 布局，而非传统独立页面模式：

```
┌─────────────────────────────────────────────────────────────┐
│  [file-a.md] [file-b.md]                           Tab Bar │
├──────┬──────────┬─────────────────┬────────────────────────┤
│ 竖   │ 文件     │   中央 Editor   │  右侧多功能面板        │
│ 向   │ 浏览器   │   AI-native    │  · Chat (上下分)       │
│ 工   │ (可折叠) │   工作台       │  · Knowledge           │
│ 具   │          │                │  · Outline             │
│ 栏   │ 仓库文件树│  md 编辑      │  · Graph               │
│      │          │  AI 辅助      │                        │
│      │ [Vault▾]│  Knowledge 提取│  图标按钮切换视图       │
│  ⚙️   │          │                │                        │
├──────┴──────────┴─────────────────┴────────────────────────┤
│  Markdown · Ln 42, Col 18 · 1,280 字 · UTF-8    状态栏     │
└─────────────────────────────────────────────────────────────┘
```

各区域职责：

- **Tab Bar**：打开文件的 Tab 切换，Obsidian 细条风格。
- **左侧竖向工具栏**：快捷操作图标按钮（面板切换、命令面板入口），底部固定设置 ⚙️。
- **左侧文件浏览器（可折叠）**：纯文件管理 — 当前 Repository（Vault）的文件树，仓库切换器。
- **中央 Editor**：AI-native 工作台 — md 编辑/预览、AI 辅助润色、Knowledge 提取、对话式协作。
- **右侧多功能面板（可折叠）**：图标切换 Chat / Knowledge / Outline / Graph 视图。
  - Chat 视图：上下分 — 消息流+输入 / History+Project 管理器。
  - Knowledge 视图：卡片/列表 ↔ 图谱模式，Agent 驱动生长 + 手动管理。
  - Outline 视图：当前 md 文件大纲结构。
  - Graph 视图：Knowledge 节点关系图谱。
- **底部状态栏**：文件类型、行列号、字数、编码，后续扩展。
- **Settings Overlay**（左下角 ⚙️ 进入）：Providers、Diagnostics 等配置子页面，全屏浮层形式。

MVP 不需要 marketing page、pricing page、login page 或 team admin page。

## 验收标准

MVP 达成时应满足：

- 主要用户体验运行在 Tauri 桌面应用中。
- React 前端不直接连接 PostgreSQL。
- React 前端不直接调用 AI Provider。
- 所有数据库访问都由 FastAPI 通过 SQLAlchemy 处理。
- 所有 AI 调用都由 FastAPI 通过 Provider abstraction 处理。
- PostgreSQL 存储 conversations、messages、projects、knowledge units、tags、embeddings、AI provider 配置和 app settings。
- 用户可以配置 OpenAI-compatible Provider。
- 用户可以创建至少一个 project。
- 用户可以创建、编辑、标记、归档和列表查看 knowledge units。
- 用户可以创建 conversation 并发送 messages。
- 用户可以为 knowledge units 生成 embeddings。
- 用户可以提问，并收到基于检索知识的回答。
- RAG response 能展示被用于上下文的 knowledge units。
- 开发期可以通过 Docker Compose 启动 PostgreSQL + pgvector。
- 后端测试覆盖数据库模型、Provider abstraction 边界和 RAG service 行为。
- 前端测试或类型检查覆盖 AppShell 布局、各区域视图渲染、Provider 设置表单、Knowledge CRUD 和 Chat 流程。
