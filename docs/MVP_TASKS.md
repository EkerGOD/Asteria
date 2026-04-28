# MVP Tasks

## 任务规则

每个任务都应该足够小，适合一次开发 session 和一个小提交完成。

每个实现任务都必须包含：

- Scope
- Do Not
- Acceptance Criteria
- Test Command

AI coding assistant 每次执行任务时必须：

- 先阅读相关 docs。
- 只处理任务范围内的内容。
- 避免无关重构。
- 完成后列出修改文件。
- 运行指定测试命令，或明确说明为什么无法运行。

## Phase 0: Documentation Baseline

### Task 0.1: Confirm Desktop-First Documentation

Scope:

- 检查 `docs/PRD.md`、`docs/ARCHITECTURE.md`、`docs/DATABASE_SCHEMA.md`、`docs/DESKTOP_APP.md`、`docs/AI_WORKFLOW.md`。
- 修正任何暗示 Asteria / 星识 是 Web-first 的表述。
- 统一核心术语。

Do Not:

- 不创建业务代码。
- 不创建前端或后端项目。
- 不修改数据库 migrations。

Acceptance Criteria:

- 文档一致描述 Asteria / 星识 为 desktop-first。
- 文档明确前端不直接访问数据库。
- 文档明确前端不直接调用 AI Provider。

Test Command:

```bash
git diff -- docs
```

## Phase 1: Repository Foundation

### Task 1.1: Scaffold Desktop App

Scope:

- 创建 `apps/desktop`。
- 使用 Tauri、React、Vite、TypeScript、Tailwind CSS。
- 创建最小桌面壳，包含 Chat、Knowledge、Projects、Settings、Diagnostics 占位页面。
- 添加 frontend lint 和 typecheck scripts。

Do Not:

- 不实现业务功能。
- 不添加数据库访问。
- 不从前端调用 AI Provider。

Acceptance Criteria:

- 桌面应用可以在开发模式启动。
- 路由能渲染占位页面。
- Typecheck 通过。

Test Command:

```bash
cd apps/desktop && npm run typecheck
```

### Task 1.2: Scaffold FastAPI App

Scope:

- 创建 `apps/api`。
- 建立 FastAPI 应用结构。
- 添加 health endpoint。
- 添加 database URL 和本地 API settings 的配置读取。
- 添加 backend test setup。

Do Not:

- 不实现 domain CRUD。
- 不实现 AI Provider 调用。
- 不添加 frontend code。

Acceptance Criteria:

- `GET /health` 返回 API 状态。
- 可以从 `apps/api` 运行 tests。
- 应用可以用 `uvicorn` 启动。

Test Command:

```bash
cd apps/api && pytest
```

### Task 1.3: Add Development Docker Compose

Scope:

- 添加 PostgreSQL + pgvector 的 Docker Compose service。
- 记录必要环境变量。
- 确保 `apps/api` 开发期可连接本地数据库。

Do Not:

- 不添加生产部署配置。
- 不添加云数据库配置。
- 不添加无关基础设施。

Acceptance Criteria:

- PostgreSQL 可以本地启动。
- pgvector extension 可以启用。
- API 配置可以引用本地 database URL。

Test Command:

```bash
docker compose up -d db
```

## Phase 2: Database Foundation

### Task 2.1: Add SQLAlchemy and Alembic Setup

Scope:

- 配置 SQLAlchemy engine、session lifecycle 和 base model conventions。
- 为 `apps/api` 配置 Alembic。
- 添加初始 migration 路径。

Do Not:

- 不在同一任务中添加全部 domain tables。
- 不实现 API endpoints。
- 不添加 frontend code。

Acceptance Criteria:

- Alembic 可以连接开发数据库。
- API 有清晰的 database session dependency。
- Tests 可以创建和清理 database sessions。

Test Command:

```bash
cd apps/api && alembic current
```

### Task 2.2: Implement MVP Database Schema

Scope:

- 按 `docs/DATABASE_SCHEMA.md` 添加 SQLAlchemy models 和 Alembic migration。
- 包含必要 constraints、relationships 和 indexes。
- 包含 pgvector extension setup。

Do Not:

- 不实现 CRUD endpoints。
- 不实现 RAG logic。
- 不添加超出最小测试 fixtures 的 seed data。

Acceptance Criteria:

- Migration 创建全部 MVP tables。
- Migration 创建 pgvector extension。
- Model relationships 与 schema 文档一致。
- Database tests 覆盖关键 constraints 和 cascade behavior。

Test Command:

```bash
cd apps/api && pytest
```

## Phase 3: Backend Domain API

### Task 3.1: Implement Projects API

Scope:

- 添加 projects 的 create、list、retrieve、update、archive endpoints。
- 添加 request/response schemas。
- 添加 backend tests。

Do Not:

- 不实现 knowledge unit CRUD。
- 不实现 frontend screens。
- 不添加 AI behavior。

Acceptance Criteria:

- Projects 可以创建和列表查看。
- Project names 有校验。
- Archived projects 默认不出现在 list response 中。

Test Command:

```bash
cd apps/api && pytest
```

### Task 3.2: Implement Knowledge and Tags API

Scope:

- 添加 knowledge units 的 CRUD endpoints。
- 添加 tags 的 create、list、attach、detach 行为。
- 添加 project 和 tag filtering。
- 添加 backend tests。

Do Not:

- 不在此任务生成 embeddings。
- 不实现 semantic search。
- 不添加 desktop UI。

Acceptance Criteria:

- Knowledge units 可以创建、编辑、列表查看、归档、打标签。
- Tag uniqueness 被强制执行。
- Project 和 tag filters 可用。

Test Command:

```bash
cd apps/api && pytest
```

### Task 3.3: Implement Conversations and Messages API

Scope:

- 添加 conversations 的 create 和 list endpoints。
- 添加 messages 的 list 和 append endpoints。
- 持久化 message role、content、model、provider 和 retrieval metadata。

Do Not:

- 不调用 AI Provider。
- 不实现 RAG answer generation。
- 不添加 frontend chat UI。

Acceptance Criteria:

- Conversations 可以创建和列表查看。
- Messages 可以按时间顺序追加和读取。
- 删除或归档行为符合 schema policy。

Test Command:

```bash
cd apps/api && pytest
```

## Phase 4: AI and RAG Backend

### Task 4.1: Implement AI Provider Configuration API

Scope:

- 添加 AI providers 的 CRUD endpoints。
- 添加 active provider selection。
- 添加 provider health check endpoint。
- 按 schema policy 存储 secrets。

Do Not:

- 不把 Provider-specific code 加到前端。
- 不实现 chat 或 embedding flows。
- 不添加多个非 OpenAI-compatible 协议。

Acceptance Criteria:

- Provider 可以保存并设为 active。
- 同一时间最多一个 active provider。
- Health check 返回标准化成功或失败结果。

Test Command:

```bash
cd apps/api && pytest
```

### Task 4.2: Implement Provider Adapter Interface

Scope:

- 定义后端 chat completion 和 embedding creation interfaces。
- 实现 OpenAI-compatible HTTP adapter。
- 标准化 Provider errors。
- 使用 mocked HTTP calls 添加 unit tests。

Do Not:

- 不从 frontend 调用 adapter。
- 不实现 RAG orchestration。
- 如果简单 HTTP adapter 足够，不强依赖单一 vendor SDK。

Acceptance Criteria:

- Chat completion 和 embedding calls 使用同一抽象。
- Adapter tests 覆盖 success、auth failure、timeout、malformed response。
- Frontend types 不包含 Provider request payload 细节。

Test Command:

```bash
cd apps/api && pytest
```

### Task 4.3: Implement Knowledge Embedding Pipeline

Scope:

- 对 knowledge unit content 做 chunking。
- 通过 Provider abstraction 生成 embeddings。
- 将 embeddings 存储到 `knowledge_embeddings`。
- 在 knowledge content 变化时刷新 embeddings。

Do Not:

- 不实现 chat answer generation。
- 不添加 file ingestion。
- 除非最小实现必须，不添加 background workers。

Acceptance Criteria:

- Knowledge unit 可以生成 embeddings。
- 更新 content 会刷新 stale embeddings。
- 通过 content hashes 避免重复 embeddings。

Test Command:

```bash
cd apps/api && pytest
```

### Task 4.4: Implement Retrieval Service

Scope:

- 通过 active provider 为 query 生成 embedding。
- 使用 cosine similarity 查询 `knowledge_embeddings`。
- 支持 project 和 tag filters。
- 返回 chunks、source knowledge metadata 和 scores。

Do Not:

- 不生成最终 AI answer。
- 不添加 frontend UI。
- 不添加 advanced reranking。

Acceptance Criteria:

- Retrieval 能返回相关 chunks。
- Filters 能限制结果范围。
- Tests 覆盖 empty database、no-match、filtered-match cases。

Test Command:

```bash
cd apps/api && pytest
```

### Task 4.5: Implement RAG Chat Endpoint

Scope:

- 添加接收 conversation user message 的 endpoint。
- 保存 user message。
- 检索相关 knowledge chunks。
- 构造 grounded prompt。
- 通过 Provider abstraction 调用 chat model。
- 保存并返回带 source metadata 的 assistant message。

Do Not:

- MVP 不要求 streaming responses，除非后端已有简单支持。
- 不添加 autonomous agent tools。
- 不向前端暴露 Provider-specific payloads。

Acceptance Criteria:

- 用户问题能生成并持久化 assistant answer。
- Source references 返回给前端。
- Provider failures 返回可操作 API errors。

Test Command:

```bash
cd apps/api && pytest
```

## Phase 5: Desktop UI

### Task 5.1: Connect Desktop App to Local API

Scope:

- 在 `apps/desktop` 添加 typed API client。
- 添加 local API base URL 配置。
- 在 Diagnostics 中展示 API health status。

Do Not:

- 不添加直接数据库访问。
- 不添加直接 AI Provider 调用。
- 不一次性实现全部页面。

Acceptance Criteria:

- Desktop app 可以显示本地 API health。
- API errors 有可见 UI states。
- Typecheck 通过。

Test Command:

```bash
cd apps/desktop && npm run typecheck
```

### Task 5.2: Implement Settings UI for Providers

Scope:

- 添加 provider list、create/edit form、active provider selection、health check action。
- 只调用 FastAPI endpoints。
- 展示 validation 和 error states。

Do Not:

- 不只把 provider secrets 存在 frontend state。
- 不从 desktop code 直接调用 Provider API。
- 不实现 chat UI。

Acceptance Criteria:

- 用户可以在桌面应用中创建并激活 provider。
- Health check result 可见。
- 表单校验阻止空 required fields。

Test Command:

```bash
cd apps/desktop && npm run typecheck
```

### Task 5.3: Implement Projects and Knowledge UI

Scope:

- 添加 project list 和 project editor。
- 添加 knowledge list、detail editor、tag controls、filters、archive action。
- 只调用 FastAPI endpoints。

Do Not:

- 不实现 RAG chat UI。
- 不添加 file import。
- 不添加直接数据库访问。

Acceptance Criteria:

- 用户可以创建 project。
- 用户可以创建、编辑、打标签、过滤和归档 knowledge unit。
- Empty、loading、error states 完整。

Test Command:

```bash
cd apps/desktop && npm run typecheck
```

### Task 5.4: Implement Chat UI with RAG Sources

Scope:

- 添加 conversation list 和 message thread。
- 添加 message composer。
- 调用 RAG chat endpoint。
- 渲染 assistant answer 和 source references。

Do Not:

- 不直接调用 AI Provider。
- 除非后端已支持，不添加 streaming。
- 不添加 multi-user chat。

Acceptance Criteria:

- 用户可以创建或选择 conversation。
- 用户可以发送问题并收到回答。
- 后端返回 source references 时前端可见。

Test Command:

```bash
cd apps/desktop && npm run typecheck
```

## Phase 6: Quality and Release Readiness

### Task 6.1: Add End-to-End Development Smoke Test

Scope:

- 添加文档化 smoke test，覆盖 database、API health、provider settings、knowledge creation、embedding、RAG answer。
- 尽可能自动化开发期可自动化部分。

Do Not:

- 不构建生产安装包。
- 不添加 cloud deployment。
- 不添加无关 feature polish。

Acceptance Criteria:

- 开发者可以从 clean checkout 跟随一条 smoke test path。
- Smoke test 能发现 database、API、frontend wiring 缺失。
- 手动步骤被明确标记。

Test Command:

```bash
docker compose up -d db
```

### Task 6.2: Prepare Future Packaging Notes

Scope:

- 记录 Tauri 和 FastAPI sidecar packaging assumptions。
- 标出 bundled database、secrets storage、auto-update 的未决问题。
- 将 notes 与 MVP implementation 分开。

Do Not:

- 不实现 packaging。
- 不添加 installer scripts。
- 不改变 runtime architecture。

Acceptance Criteria:

- Packaging risks 被记录。
- MVP development workflow 不变。
- 不修改业务代码。

Test Command:

```bash
git diff -- docs
```
