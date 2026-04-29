# Roadmap

基于 `docs/VERSION_NOTES.md` 和 `docs/PRD.md` 生成。每个版本有明确主题、约束和验收标准，按依赖排序。

---

## 版本说明

| 字段 | 说明 |
|------|------|
| 版本 | 语义化版本号 vMAJOR.MINOR.PATCH |
| 主题 | 本版本的核心目标，一句话概括 |
| 约束 | 本版本不做什么，防止 scope creep |
| 状态 | planned / in_progress / done |

---

## v0.1.0 — MVP 核心骨架

状态：done

MVP 核心骨架已完成：

- FastAPI 后端 8 个路由模块、AI Provider 抽象、RAG 编排、语义检索
- React 桌面 UI 5 个页面、类型化 API 客户端
- PostgreSQL + pgvector 数据库 schema、Alembic 迁移
- Docker Compose 开发环境、全链路 smoke test

---

<!--

后续版本在此处追加，格式如下：

## v0.1.1 — [主题]

状态：planned

约束：

- 不新增表/模型变更
- 不修改架构边界

解决的问题：

1. [Bug] ...
2. [UI] ...
3. [Feature] ...

验收标准：

- [ ] ...
- [ ] ...

-->
