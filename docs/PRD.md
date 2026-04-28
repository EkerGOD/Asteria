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
3. 用户进入 Settings 页面。
4. 用户创建或选择一个 OpenAI-compatible Provider。
5. 用户填写 base URL、API key、chat model、embedding model 和 embedding dimension。
6. 后端验证 Provider 连通性。
7. 用户将该 Provider 保存为 active provider。

### 创建知识

1. 用户进入 Knowledge 页面。
2. 用户创建 knowledge unit，填写 title、content、project 和 tags。
3. 后端保存 knowledge unit。
4. 后端为 knowledge unit 创建或刷新 embeddings。
5. 用户可以通过 project、tag、文本搜索或语义搜索找到该知识。

### RAG 提问

1. 用户进入 Chat 页面。
2. 用户选择或创建 conversation。
3. 用户输入问题。
4. 桌面前端将请求发送给 FastAPI。
5. 后端保存 user message。
6. 后端为问题生成 embedding，检索相关知识片段，构造上下文 prompt，并调用 active AI Provider。
7. 后端保存 assistant message 和 retrieval metadata。
8. 桌面前端展示回答和引用的 knowledge units。

### 项目和标签组织

1. 用户创建 project 来区分不同工作上下文。
2. 用户将 conversations 和 knowledge units 关联到 project。
3. 用户创建 tags 并绑定到 knowledge units。
4. 用户通过 project 和 tags 过滤知识。

## 页面列表

MVP 桌面页面：

- Chat：conversation 列表、消息线程、输入框、RAG source references、Provider/model 状态。
- Knowledge：knowledge units 列表、搜索、project 过滤、tag 过滤。
- Knowledge Detail：创建、编辑、归档、打标签、重新生成 embedding。
- Projects：创建、编辑、归档和选择 projects。
- Settings：管理 AI providers、active provider、model 名称、embedding dimension、API base URL 和本地偏好。
- Diagnostics：本地 API 状态、数据库连接状态、Provider 连通性、embedding 队列或刷新状态。

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
- 前端测试或类型检查覆盖主要页面渲染、Provider 设置表单、Knowledge CRUD 流程和 Chat 流程。
