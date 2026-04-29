# apps/api Claude Code Instructions

本文档是 Asteria / 星识 后端目录的 Claude Code 协作规则。修改 `apps/api` 前，先阅读仓库根目录 `CLAUDE.md`，再按任务范围阅读相关 docs。

`apps/api` 是 Asteria / 星识 的本地 FastAPI 服务层，也是数据库访问、业务规则、AI Provider 调用、embedding、retrieval 和 RAG orchestration 的唯一权威层。

## 必读上下文

按任务类型阅读：

- 后端架构或职责边界：`docs/ARCHITECTURE.md`、`docs/DESKTOP_APP.md`。
- 数据库模型或 migration：`docs/DATABASE_SCHEMA.md`。
- API route、request/response 约定：`docs/API_CONTRACT.md`。
- Provider、embedding、retrieval、RAG：`docs/ARCHITECTURE.md`、`docs/PRD.md`。
- 任务拆分和验收标准：`docs/MVP_TASKS.md`、`docs/AI_WORKFLOW.md`。

如果文档之间出现冲突，优先保持：

- desktop-first 架构。
- `apps/api` 拥有所有数据库和 AI 行为。
- `apps/desktop` 只通过本地 HTTP API 使用这些能力。

## 技术栈

- FastAPI
- Python
- SQLAlchemy
- Alembic
- PostgreSQL
- pgvector
- OpenAI-compatible Provider abstraction
- pytest

## 目录职责

`apps/api` 负责：

- FastAPI application、routes、dependencies 和 request/response contracts。
- SQLAlchemy models、database sessions 和 Alembic migrations。
- conversations、messages、projects、knowledge units、tags、providers、settings 的业务规则。
- API validation、错误规范化和可操作的错误响应。
- AI Provider abstraction、OpenAI-compatible adapter、health check、chat completion 和 embedding creation。
- knowledge unit chunking、embedding 生成与刷新。
- 基于 pgvector 的 semantic search 和 retrieval。
- RAG prompt orchestration、source references 和 message 持久化。
- 后端单元测试、API 测试和数据库行为测试。

`apps/api` 不负责：

- React 页面、组件、客户端路由或视觉布局。
- Tauri 窗口生命周期、桌面菜单、系统托盘或原生 shell 配置。
- 任何 Web-first SaaS、登录、多用户、云同步、团队协作或插件市场能力。
- 前端状态管理或浏览器端 Provider 调用。

## 硬性规则

- 所有数据库访问必须留在 `apps/api`。
- 所有 AI Provider 调用必须通过后端 Provider abstraction。
- 不向前端暴露 Provider-specific request payload 或响应细节。
- 不在代码、测试、fixture、日志或文档示例中硬编码真实 API key。
- Provider API key 不能明文持久化；按 schema 使用加密字段或后续 secret storage 方案。
- RAG、embedding、retrieval 逻辑不得放到 `apps/desktop`。
- Routes 应保持薄层：解析输入、调用 service、返回 response。
- 业务规则放在 services；Provider 适配放在 `app/ai`；RAG/retrieval 放在 `app/rag` 或等价清晰模块。
- 不为了单个小任务引入大型框架、任务队列或非必要依赖。

## 建议应用结构

如果任务要求创建或扩展后端 scaffold，优先保持类似结构：

```text
apps/api/
  app/
    main.py
    api/
      routes/
    core/
      config.py
      errors.py
    db/
      session.py
      base.py
    models/
    schemas/
    services/
    ai/
    rag/
  alembic/
  tests/
```

当前仓库仍处于 MVP 早期阶段。若上述目录或文件尚不存在，不要仅因为本文件提到它们就主动创建；只有任务 Scope 明确要求 scaffold 或实现时才创建。

## 数据库和 migration 规则

- 以 `docs/DATABASE_SCHEMA.md` 为 schema 权威来源。
- 使用 UUID primary key、`timestamptz`、`jsonb`、归档字段和约束时，保持与 schema 文档一致。
- Alembic migration 应先创建 `pgcrypto` 和 `vector` extensions，再创建依赖 vector 的 columns/indexes。
- 删除和归档策略遵守 schema：普通 UI 流程优先 archive，hard delete 只用于明确场景。
- 关系、cascade、partial unique index、vector index 等行为需要测试覆盖。
- Schema 变化必须同步更新 `docs/DATABASE_SCHEMA.md` 和相关 API 文档。

## API 规则

- API path、资源命名和 request/response 先对齐 `docs/API_CONTRACT.md`。
- Response schema 不泄漏数据库内部实现或 Provider secret。
- List endpoints 应考虑 archived 过滤、project/tag filters、排序和分页的后续扩展。
- 错误响应应稳定、可读、可被前端展示；不要把 Provider 原始错误直接透传给 UI。
- 本地开发 API 应绑定 localhost；CORS 只允许已知本地开发 origin。

## AI Provider 与 RAG 规则

- MVP Provider 类型为 `openai_compatible`。
- Provider adapter 负责 base URL、API key、model、embedding dimension、timeout、retry 和错误映射。
- Chat completion 和 embedding creation 使用同一后端抽象入口。
- Embedding dimension MVP 默认遵守 `docs/DATABASE_SCHEMA.md` 的 `1536` 约束。
- Retrieval 返回 chunks、knowledge metadata、scores 和 source references；前端只渲染这些结果。
- RAG endpoint 负责保存 user message、检索上下文、调用 Provider、保存 assistant message，并返回 source metadata。
- MVP 不默认实现 streaming、agent tools、自动文件解析或 background worker，除非任务明确要求。

## 测试要求

根据任务范围选择最小有效验证：

- 后端测试：`cd apps/api && pytest`
- Migration 检查：`cd apps/api && alembic current`
- 数据库启动：`docker compose up -d db`
- 文档变更：检查相关 docs diff

如果后端 scaffold、依赖、数据库或 git 元数据尚不可用，最终回复中必须明确说明无法运行的命令和原因。

测试优先覆盖：

- Request validation 和 API responses。
- Service 层业务规则。
- SQLAlchemy model constraints、relationships 和 cascade/archive behavior。
- Provider adapter success、auth failure、timeout、malformed response。
- Retrieval empty/no-match/filtered-match cases。
- RAG Provider failure 和 source references。

## 修改纪律

- 一次只做一个小任务，优先来自 `docs/MVP_TASKS.md`。
- 不把 scaffold、schema、endpoint、AI/RAG logic 和 frontend UI 混进同一次任务，除非任务明确要求。
- 不修改 `apps/desktop` 来绕过缺失的 API。
- 不重写无关模块，不回滚用户已有改动。
- 新增依赖必须有任务必要性，并同步更新对应依赖文件。
- 完成后报告修改摘要、修改文件、测试命令、测试结果、未运行测试原因和建议后续任务。
