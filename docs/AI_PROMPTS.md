# AI 提示词模板

将占位符 `{{...}}` 替换为实际内容后粘贴给 AI。

---

## 模板 1：Review Diff

审查当前的 staged 和 unstaged diff，不提交。

```
Review 当前所有未提交的改动：

- 逻辑是否正确，是否存在潜在 bug。
- 是否有安全风险（SQL 注入、XSS、密钥泄露、命令注入等）。
- 是否引入了未使用的代码或多余的抽象。
- 是否超出了本次任务范围，改动了无关文件。
- 是否有遗漏的文件（应该改但没改的）。
- 是否存在重复代码可以复用现有组件或工具函数。

输出分为两部分：
1. 阻塞项（必须修）：会引入 bug、安全漏洞、破坏架构规则的问题。
2. 建议项（可选修）：命名、简化、风格等不影响功能的改进。

不要提交。我修复后再跑一次 review。
```

---

## 模板 2：Git 提交

仅当 review 通过后才使用。提交前我会提供版本号。

```
Review 通过，现在提交。版本号：[填写版本号，如 0.1.1]

生成 commit message 并执行提交：

- 按 Conventional Commits 格式（type(scope): description）。
- scope 从以下选择：api, desktop, ui, docs, dev, infra, rag。
- commit body 第一行注明版本号：Version: v[版本号]
- 结尾包含 Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## 模板 3：体验笔记 → Roadmap 草案

```
读取 docs/VERSION_NOTES.md 中当前版本的体验笔记，结合 docs/PRD.md 的产品范围，生成一份 Roadmap 草案，追加到 docs/ROADMAP.md。

要求：
- 固定格式：版本号、主题、约束、状态（planned/in_progress/done）。
- 每个版本有明确约束（如：只修 bug、只做导航优化），防止 scope creep。
- 按优先级和依赖排列版本，每个版本列出要解决的问题和验收标准。
- 版本之间语义化递增：bug 修复和体验优化放小版本（PATCH），新功能放大版本（MINOR）。
- 不要移除已标记为 done 的版本。
```

---

## 模板 4：Roadmap 版本 → 任务拆分

```
读取 docs/ROADMAP.md 中的 [版本号] 版本，拆分为可逐个执行的任务列表：

- 每个任务符合 docs/AI_WORKFLOW.md 的格式（Goal、Scope、Do Not、Acceptance Criteria、Test Command）。
- 任务之间标注依赖关系，优先排查数据库/API 层的任务。
- 估算每个任务的范围，确保一个 session 内可完成。
- 追加到 docs/MVP_TASKS.md 或输出到本轮会话中。
```

---

## 模板 5：任务完成后文档审查

任务完成后，检查本次改动是否需要同步更新项目文档。

```
Review 本次任务的所有改动，检查以下文档是否需要更新：

- docs/PRD.md — 用户流程、页面、MVP 范围发生变化。
- docs/ARCHITECTURE.md — 架构边界、数据流、组件关系变化。
- docs/DATABASE_SCHEMA.md — 表结构、字段、索引、约束变化。
- docs/API_CONTRACT.md — API 端点、请求/响应 schema 变化。
- docs/DESKTOP_APP.md — Tauri 与 FastAPI 协作方式变化。
- docs/UI_INTERACTION_GUIDELINES.md — 页面 archetype、交互状态、动作层级变化。
- docs/DEVELOPMENT_SMOKE_TEST.md — 启动步骤、验证流程变化。
- README.md — 技术栈、产品范围、快速启动步骤变化。
- CLAUDE.md（根目录及各子目录）— 架构规则、测试命令、工作边界变化。

对每个文件给出结论：
- 无需更新：改动不影响该文档覆盖的范围。
- 建议更新：[具体说明哪部分过时、缺少什么]。

只输出审查结论，不要修改文档。我会确认后再让 AI 执行更新。
```
