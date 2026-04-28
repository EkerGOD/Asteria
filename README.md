# Asteria / 星识

Asteria / 星识 是一个 desktop-first、AI-native 的个人知识系统，用于本地知识管理、语义检索和基于个人知识库的 RAG 问答。

An AI-native personal knowledge system.

让每一次对话，成为知识星图的一部分。

Asteria / 星识 的核心意象来自星辰：分散的知识像星点一样散落，系统帮助用户把它们连接成可回溯、可发散、可提问的知识星图。

Asteria / 星识 MVP 的目标不是做一个 Web-first SaaS，而是先验证一个清晰的本地桌面架构：

```text
Tauri + React UI -> Local FastAPI API -> PostgreSQL + AI Provider Abstraction
```

## 当前状态

项目处于 MVP 早期阶段。

当前仓库重点是确定产品、架构、数据库 schema 和 AI coding assistant 协作流程。部分目录可能只是占位，不能假设前端、后端或 Docker Compose 已经完整可运行。

后续开发应按 `docs/MVP_TASKS.md` 中的小任务逐步推进。

## 技术栈

- Desktop: Tauri
- UI: React + Vite + TypeScript + Tailwind CSS
- Backend: FastAPI + Python
- Database: PostgreSQL + pgvector
- ORM: SQLAlchemy + Alembic
- AI: OpenAI-compatible Provider abstraction
- Development: Docker Compose

## 产品范围

MVP 做：

- 桌面端知识工作台。
- 本地 FastAPI 服务。
- PostgreSQL + pgvector 持久化与语义检索。
- conversations 和 messages 持久化。
- projects、knowledge units、tags 管理。
- AI Provider 配置。
- embedding 生成。
- semantic search。
- 带 source references 的 RAG 问答。

MVP 不做：

- Web-first 产品形态或公开 Web 应用。
- 多用户、登录、权限、团队空间。
- 云同步或远程协作。
- 移动端。
- 浏览器插件。
- 完整文件解析流水线。
- 插件市场。
- 生产级安装包和自动更新。

完整产品说明见 `docs/PRD.md`。

## 架构原则

硬性规则：

- `apps/desktop` 是桌面客户端，只调用本地 FastAPI。
- `apps/desktop` 不直接访问 PostgreSQL。
- `apps/desktop` 不直接调用 AI Provider。
- `apps/api` 是数据库访问、业务规则、embedding、retrieval、RAG 和 AI Provider 调用的唯一权威层。
- Tauri commands 只用于桌面原生能力，不用于绕过后端业务逻辑。

完整架构说明见 `docs/ARCHITECTURE.md` 和 `docs/DESKTOP_APP.md`。

## 仓库结构

```text
Asteria/
  apps/
    desktop/       Tauri + React desktop client
    api/           FastAPI local backend
  docs/            Product, architecture, schema, workflow docs
  infra/           Local development infrastructure
  packages/        Shared packages planned for later
  scripts/         Development and maintenance scripts
  AGENTS.md        Root agent instructions
  README.md        Project entrypoint
```

子目录可能包含自己的 `AGENTS.md`，修改对应目录前应先阅读。

## 关键文档

- `AGENTS.md`：仓库级 AI coding assistant 工作规则。
- `CLAUDE.md`：仓库级 Claude Code 协作规则（Claude Code 启动时自动加载）。
- `docs/PRD.md`：产品定位、目标用户、MVP 范围、页面和验收标准。
- `docs/ARCHITECTURE.md`：desktop-first 架构和职责边界。
- `docs/DATABASE_SCHEMA.md`：MVP 数据库 schema。
- `docs/MVP_TASKS.md`：分 Phase 的小任务清单。
- `docs/DESKTOP_APP.md`：Tauri 与 FastAPI 本地协作方式。
- `docs/AI_WORKFLOW.md`：如何与 AI coding assistant 协作开发。
- `docs/API_CONTRACT.md`：API contract 草案或接口约定。

## 开发方式

后续开发建议按以下顺序推进：

1. 从 `docs/MVP_TASKS.md` 选择一个小任务。
2. 明确 Scope、Do Not、Acceptance Criteria 和 Test Command。
3. 只修改该任务需要的文件。
4. 运行对应测试命令。
5. 完成后列出修改文件和测试结果。

推荐 prompt 格式见 `docs/AI_WORKFLOW.md`。

## 开发期运行模型

完整 scaffold 完成后，开发期目标运行方式是：

1. Docker Compose 启动 PostgreSQL + pgvector。
2. `apps/api` 使用 Alembic 初始化数据库。
3. FastAPI 通过 `uvicorn` 运行本地 API。
4. `apps/desktop` 通过 Vite 提供 React dev server。
5. Tauri 打开桌面窗口并连接本地 API。

在 scaffold 完成前，不应假设这些命令都可运行。

## 数据库

MVP schema 至少包含：

- `conversations`
- `messages`
- `knowledge_units`
- `tags`
- `knowledge_unit_tags`
- `knowledge_embeddings`
- `projects`
- `ai_providers`
- `app_settings`

字段、关系、索引和约束见 `docs/DATABASE_SCHEMA.md`。

## AI Provider

Asteria / 星识 使用 OpenAI-compatible Provider abstraction。

前端不直接保存或调用 Provider 细节。Provider 配置、health check、chat completion、embedding creation、错误规范化都应在 `apps/api` 中完成。

## 协作约定

任何实现任务都应保持小步提交。

完成一次任务后，应说明：

- 改了什么。
- 改了哪些文件。
- 运行了什么测试。
- 测试是否通过。
- 哪些内容应拆到后续任务。

详细规则见 `AGENTS.md`、`CLAUDE.md` 和 `docs/AI_WORKFLOW.md`。
