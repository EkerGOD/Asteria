# AI Coding Assistant Workflow

## 目的

本文档说明如何与 AI coding assistant（如 Claude Code、Codex 等）协作开发 Asteria / 星识。

Asteria / 星识 应该以小步、可审查、可验证的方式开发。每次开发 session 只处理一个明确的小任务，完成后说明改了什么、如何测试、还剩什么。

## 核心规则

- 一次只做一个小任务。
- 优先选择 `docs/MVP_TASKS.md` 中的任务。
- 修改前先阅读相关 docs。
- 保持 desktop-first 架构。
- 不引入 Web-first 假设。
- 不让前端直接访问 PostgreSQL。
- 不让前端直接调用 AI Provider。
- 不创建无关抽象。
- 不做大范围重构。
- 不把 scaffolding、schema、backend endpoint、frontend UI 混在一个任务里，除非任务明确要求。

## 推荐 Prompt 格式

给 AI coding assistant 派发实现任务时，建议使用：

```text
Goal:
Scope:
Do Not:
Acceptance Criteria:
Test Command:
Relevant Docs:
```

示例：

```text
Goal:
Implement the Projects API.

Scope:
- Add create/list/update/archive endpoints in apps/api.
- Add request and response schemas.
- Add backend tests.

Do Not:
- Implement knowledge unit CRUD.
- Add frontend UI.
- Add AI provider behavior.

Acceptance Criteria:
- Projects can be created and listed.
- Archived projects are excluded by default.
- Tests cover validation.

Test Command:
cd apps/api && pytest

Relevant Docs:
- docs/ARCHITECTURE.md
- docs/DATABASE_SCHEMA.md
- docs/MVP_TASKS.md
```

## 每次完成后必须输出

每次任务结束时，AI coding assistant 必须列出：

- 修改摘要。
- 修改文件。
- 已运行的测试命令。
- 测试结果。
- 未能运行的测试及原因。
- 建议拆到后续任务的事项。

## 文件修改纪律

AI coding assistant 应该：

- 将改动限制在任务范围内。
- 避免重写与任务无关的文件。
- 保留已有用户改动。
- 破坏性操作前先确认。
- 除非依赖变更需要，否则不修改 generated lockfiles。

## 测试纪律

应运行与任务最匹配的最小验证命令。

推荐命令：

- Docs only：`git diff -- docs`
- API tests：`cd apps/api && pytest`
- API migration check：`cd apps/api && alembic current`
- Desktop typecheck：`cd apps/desktop && npm run typecheck`
- Desktop lint：`cd apps/desktop && npm run lint`
- Database startup：`docker compose up -d db`

如果命令因项目尚未 scaffold 而无法运行，应明确说明原因，不能假装通过。

## Review Checklist

任务结束前，应检查：

- 改动符合本次 Scope。
- 改动没有违反 desktop-first 架构。
- 前端只调用 API。
- 后端拥有数据库访问和 AI Provider 访问。
- 代码变更有对应测试。
- 架构、schema 或流程变化时，同步更新文档。
