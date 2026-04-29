# Asteria / 星识 Agent Instructions

本文档是 Asteria / 星识 仓库根目录的代理协作规则。任何 AI coding assistant 在修改本仓库前，都应先阅读本文件，再阅读与任务相关的 `docs` 文档和子目录 `AGENTS.md`。Claude Code 用户应阅读根目录 `CLAUDE.md`。

## 项目定位

Asteria / 星识 是 desktop-first 的 AI-native 个人知识系统，不是 Web-first SaaS。

核心架构不变量：

```text
Tauri + React UI -> Local FastAPI API -> PostgreSQL + AI Provider Abstraction
```

技术栈：

- Desktop: Tauri
- UI: React + Vite + TypeScript + Tailwind CSS
- Backend: FastAPI + Python
- Database: PostgreSQL + pgvector
- ORM: SQLAlchemy + Alembic
- AI: OpenAI-compatible Provider abstraction
- Development: Docker Compose

## 文档优先级

开始任务前，按需阅读：

- `docs/PRD.md`：产品定位、目标用户、MVP 范围、用户流程、页面和验收标准。
- `docs/ARCHITECTURE.md`：desktop-first 架构、前后端边界、RAG 流程、AI Provider 抽象。
- `docs/DATABASE_SCHEMA.md`：MVP 数据库表、字段、关系、索引和约束。
- `docs/MVP_TASKS.md`：适合一次开发 session 完成的小任务拆分。
- `docs/DESKTOP_APP.md`：Tauri 和 FastAPI 本地服务协作方式。
- `docs/AI_WORKFLOW.md`：如何与 AI coding assistant 协作、如何报告修改和测试。
- `docs/API_CONTRACT.md`：API contract 草案或接口约定。

如果文档之间出现冲突，优先保持以下原则：

- desktop-first 优先。
- `apps/api` 是数据库和 AI 行为的唯一权威层。
- `apps/desktop` 只通过本地 API 访问应用数据和 AI 功能。

## 工作边界

根目录主要用于：

- 项目说明和协作规则。
- workspace 级配置。
- docs。
- apps、packages、infra、scripts 的组织。

子目录职责：

- `apps/desktop`：Tauri 桌面壳和 React 前端。遵守 `apps/desktop/AGENTS.md`。
- `apps/api`：FastAPI 后端、数据库访问、RAG 和 AI Provider 抽象。遵守 `apps/api/AGENTS.md`。
- `packages/api-client`：未来共享 API client 或类型。
- `packages/shared`：未来共享类型、常量或工具。
- `infra`：Docker Compose、PostgreSQL、pgvector 等开发基础设施。
- `scripts`：开发和维护脚本。
- `docs`：产品、架构、schema、任务和流程文档。

## 硬性架构规则

- 前端不得直接连接 PostgreSQL。
- 前端不得直接调用 AI Provider、OpenAI SDK 或 OpenAI-compatible endpoint。
- 所有数据库访问必须位于 `apps/api`。
- 所有 AI Provider 调用必须通过 `apps/api` 中的 Provider abstraction。
- Tauri commands 只能用于桌面原生能力，不得绕过后端业务逻辑。
- 不要引入 Next.js 或 Web-first 架构。
- 不要引入多用户、登录、云同步、团队协作或插件市场，除非任务明确要求并更新 PRD。

## Desktop UI Work Rules

任何修改 `apps/desktop` 页面、组件、样式、前端状态或前端 API 调用的任务，都必须遵守以下规则：

- 开始前必须阅读 `docs/UI_INTERACTION_GUIDELINES.md`，并结合 `docs/PRD.md`、`docs/DESKTOP_APP.md` 和 `docs/API_CONTRACT.md` 判断页面职责和 API 边界。
- 开始编码前，必须说明本次任务对应哪个 Page Archetype 或 Page UI Contract。
- 开始编码前，必须明确本次涉及哪些 Interaction States，例如 loading、empty、error、selected、creating、editing、saving、archiving、disabled 或 success feedback。
- 不允许发明新的页面结构，除非任务明确要求先修改 `docs/UI_INTERACTION_GUIDELINES.md`。
- 不允许引入 Web-first、SaaS-first、marketing landing page、login、team admin、cloud sync、plugin marketplace 等语义。
- 不允许前端直接调用 Provider SDK、Provider endpoint、数据库、SQL、embedding、retrieval、prompt 构造或 RAG orchestration。
- 前端只能通过本地 FastAPI / typed API client 获取应用数据和 AI 行为。
- 不允许用长期 mock 掩盖后端缺失能力；缺失的 API、状态或业务能力应记录为 follow-up。

UI 任务完成前必须满足：

- loading、empty、error、disabled 和 success states 完整。
- 主动作、次动作、危险动作层级清晰。
- archive、delete、clear key 等危险操作有确认或明确防误触机制。
- 优先复用现有本地组件、API client、types、Tailwind token 和既有视觉风格。
- `cd apps/desktop && npm run typecheck` 通过。
- `cd apps/desktop && npm run lint` 通过。
- 最终回复必须报告 UI 规范符合性，包括对应的 Page UI Contract、Interaction States、主要动作层级和任何未覆盖的 follow-up。

## 任务规则

一次只做一个小任务。

每个任务都应明确：

- Goal
- Scope
- Do Not
- Acceptance Criteria
- Test Command
- Relevant Docs

优先选择 `docs/MVP_TASKS.md` 中的任务。不要把 scaffold、schema、backend endpoint、frontend UI、RAG logic 混在一个任务里。

完成后必须报告：

- 修改摘要。
- 修改文件。
- 运行的测试命令。
- 测试结果。
- 未能运行的测试及原因。
- 建议拆到后续任务的事项。

## 修改纪律

- 只修改任务范围内的文件。
- 不重写无关文件。
- 不回滚用户已有改动。
- 不做破坏性 git 操作，除非用户明确要求。
- 不添加大依赖，除非任务需要并说明理由。
- 代码变更应配套测试。
- 架构、schema、流程变化时同步更新 docs。
- 文档任务不要实现业务代码或创建项目脚手架，除非用户明确要求。

## 测试命令参考

根据任务范围选择最小有效验证：

- Docs only: `git diff -- docs AGENTS.md README.md`
- API tests: `cd apps/api && pytest`
- API migration check: `cd apps/api && alembic current`
- Desktop typecheck: `cd apps/desktop && npm run typecheck`
- Desktop lint: `cd apps/desktop && npm run lint`
- Database startup: `docker compose up -d db`

如果项目尚未 scaffold，导致测试命令无法运行，应在最终回复中明确说明。

## 当前阶段提醒

仓库仍处于 MVP 早期阶段。很多目录可能只是占位，不代表对应项目已经完整可运行。

在没有明确任务前，不要主动创建前后端项目、数据库迁移或业务代码。先使用 `docs/MVP_TASKS.md` 中的小任务推进。
