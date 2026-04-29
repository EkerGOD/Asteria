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

MVP 核心骨架已完成：

- FastAPI 后端：8 个路由模块，9 个 SQLAlchemy 模型，完整的 AI Provider 抽象，RAG 编排，语义检索。
- React 桌面 UI：5 个页面（Chat、Knowledge、Projects、Settings、Diagnostics），类型化 API 客户端。
- PostgreSQL + pgvector：MVP 数据库 schema，Alembic 迁移，15 个后端测试文件。
- Docker Compose 开发数据库可一键启动，`scripts/dev-smoke-test.py` 可验证全链路。

后续开发按 `docs/MVP_TASKS.md` 中的小任务逐步推进。

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

## 快速启动

### 前置条件

- Docker（带 Compose 支持）
- Python 3.11 或更新版本
- Node.js（仅桌面端需要）

### 第 1 步：启动数据库

从仓库根目录运行：

```bash
docker compose up -d db
```

这会在 `127.0.0.1:5432` 启动 PostgreSQL + pgvector。数据通过 Docker volume 持久化。

### 第 2 步：启动 API

```bash
cd apps/api

# 安装依赖
python -m pip install -e ".[dev]"

# 生成 secret key（用于加密 Provider API key）
# PowerShell:
$env:ASTERIA_API_SECRET_KEY = python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# 或写入 .env 文件重复使用：
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# 应用数据库迁移
alembic upgrade head

# 启动 API 服务
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

API 启动后，`GET http://127.0.0.1:8000/health` 返回 `{"status": "healthy"}`。

### 第 3 步：启动桌面（可选）

```bash
cd apps/desktop
npm install

# 纯浏览器开发模式
npm run dev

# 或 Tauri 桌面窗口模式
npm run tauri:dev
```

浏览器模式打开 `http://127.0.0.1:1420`；Tauri 模式打开原生桌面窗口。两者都调用同一本地 API。

### 首次验证

1. 打开桌面 UI，进入 **Diagnostics** 页面。
2. 确认 Local API 显示 `http://127.0.0.1:8000` 且状态为 healthy。
3. 在 **Settings** 页面配置一个 AI Provider（需要 OpenAI-compatible endpoint）。

更深层验证（含 RAG 全链路），参考 `docs/DEVELOPMENT_SMOKE_TEST.md`。

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
