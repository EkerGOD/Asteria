# AI 提示词模板

按工作流顺序排列。将占位符 `[xxx]` 替换为实际内容后粘贴给 AI。

---

## 完整工作流

```
模板 1：VERSION_NOTES → 需求理解 → ROADMAP
    ↓
模板 2：执行 ROADMAP 版本（逐任务实现）
    ↓
模板 3：Review Diff（代码改完后审查）
    ↓
模板 4：文档审查（检查是否需要同步更新）
    ↓
模板 5：Git 提交（最后一步，带版本号）
```

---

## 模板 1：体验笔记 → 需求理解 → Roadmap

分两个阶段。第一阶段只讨论不生成，第二阶段才写入文件。

### 第一阶段：理解需求

```
读取整个 docs/VERSION_NOTES.md（包含所有版本的体验笔记），结合 docs/PRD.md 的产品范围，逐条分析我的需求：

1. 逐条复述你对每条笔记的理解，指出你判断的根因（bug 还是架构问题）。
2. 对于描述模糊、有多种可能解读、或需要我决策的条目，使用 AskUserQuestion 工具给出 2-4 个选项，包含推荐选项，每个选项有简短解释，让我选择。
3. 识别笔记之间的关联——哪些问题可能是同一个底层原因导致的。
4. 全部问题澄清后，检查 docs/ROADMAP.md 中已有的 planned 版本，哪些笔记可以合并到已有版本。
5. 提出最终的版本划分建议（合并/新建），说明优先级理由。

循环提问直到我确认需求完全清晰。不要生成 Roadmap 文件。
```

### 第二阶段：生成 Roadmap

```
理解确认完毕，现在生成 Roadmap 草案，更新 docs/ROADMAP.md。

要求：
- 先检查 ROADMAP.md 中已有的 planned 版本，如果新问题与已有版本主题匹配，合并到该版本而非新建。
- 新建版本仅在新问题与所有已有版本都无法归入时使用。
- 固定格式：版本号、主题、约束、状态（planned/in_progress/done）。
- 每个版本有明确约束（如：只修 bug、只做导航优化），防止 scope creep。
- 按优先级和依赖排列版本，每个版本列出要解决的问题和验收标准。
- 版本之间语义化递增：bug 修复和体验优化放小版本（PATCH），新功能放大版本（MINOR）。
- 不要移除已标记为 done 的版本。
- 写入 ROADMAP.md 后，清空 VERSION_NOTES.md 中已处理的笔记，只保留一个空白段落。
```

---

## 模板 2：执行 Roadmap 版本

从 ROADMAP 中选一个版本，对话确认方案后直接执行。

```
读取 docs/ROADMAP.md 中的 [版本号] 版本。

1. 复述该版本的目标、约束和验收标准。
2. 分析问题之间的依赖关系，提出执行顺序建议。
3. 说明每个子任务涉及的 Layout Zone、Interaction States 和文档边界（哪些 docs 需要参考）。
4. 如果该版本不够小、无法在一次会话中完成，提出拆分建议。

等我确认方案后，逐任务执行——每个任务完成后跑模板 3 review，通过后再做下一个。
全部完成后跑模板 4 检查文档，确认无误再模板 5 提交。
```

---

## 模板 3：Review Diff

代码修改完成后，审查改动但不提交。

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

不要提交。我修复后会重新 review。
```

---

## 模板 4：任务完成后文档审查

任务完成后，检查本次改动是否需要同步更新项目文档。

```
Review 本次任务的所有改动，检查以下文档是否需要更新：

- docs/PRD.md — 用户流程、页面、MVP 范围发生变化。
- docs/ARCHITECTURE.md — 架构边界、数据流、组件关系变化。
- docs/DATABASE_SCHEMA.md — 表结构、字段、索引、约束变化。
- docs/API_CONTRACT.md — API 端点、请求/响应 schema 变化。
- docs/DESKTOP_APP.md — Tauri 与 FastAPI 协作方式变化。
- docs/UI_INTERACTION_GUIDELINES.md — 页面 archetype、交互状态、动作层级变化。
- docs/AI_WORKFLOW.md — AI 协作流程、review 规则、测试纪律变化。
- docs/PACKAGING_NOTES.md — 打包假设或风险记录需要更新。
- docs/DEVELOPMENT_SMOKE_TEST.md — 启动步骤、验证流程变化。
- docs/AI_PROMPTS.md — 提示词模板本身需要调整。
- README.md — 技术栈、产品范围、快速启动步骤变化。
- CLAUDE.md（根目录及各子目录）— 架构规则、测试命令、工作边界变化。
- AGENTS.md（根目录及各子目录）— 与 CLAUDE.md 同步检查，确保内容一致。
- docs/ROADMAP.md — 版本状态需要在任务完成后更新（如 planned → done）。

对每个文件给出结论：
- 无需更新：改动不影响该文档覆盖的范围。
- 建议更新：[具体说明哪部分过时、缺少什么]。

只输出审查结论，不要修改文档。我会确认后再让 AI 执行更新。
```

---

## 模板 5：Git 提交

仅当 review 和文档审查都通过后才使用。

```
Review 通过，现在提交。版本号：[填写版本号，如 0.1.1]

生成 commit message 并执行提交：

- 按 Conventional Commits 格式（type(scope): description）。
- scope 从以下选择：api, desktop, ui, docs, dev, infra, rag。
- commit body 第一行注明版本号：Version: v[版本号]
- 结尾包含 Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```
