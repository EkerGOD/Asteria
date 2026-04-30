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

## 模板 1：体验笔记 → 需求澄清 → Roadmap

一段提示词，从头到尾不中断。AI 先提问澄清所有模糊点，确认完毕后自动写入 Roadmap。

```
读取整个 docs/VERSION_NOTES.md（包含所有版本的体验笔记）和 docs/PRD.md。

逐条分析我的笔记，对每条给出你的理解判断（bug / 架构缺陷 / 交互设计缺失 / 新功能需求）。对于存在多种解读、需要我决策的条目，使用 AskUserQuestion 工具给我 2-4 个选项，注明推荐项和简短理由。一次最多问 3 个问题。

识别笔记之间的关联——哪些问题是同一根因。确认无遗漏后，读取 docs/ROADMAP.md，提出版本合并/新建方案，说明优先级理由。

继续提问直到我确认所有需求清晰。确认完毕后，自动执行以下操作：

1. 将最终版本方案写入 docs/ROADMAP.md：
   - 优先合并到已有 planned 版本（主题匹配），无法匹配时才新建。
   - 格式：版本号、主题、约束、scope（frontend/backend/full-stack）、状态（planned/in_progress/done）。
   - 每个版本有明确约束和验收标准。
   - 按语义化版本递增：PATCH（bug/优化）< MINOR（新功能）< MAJOR（架构变更）。
   - 不删除已标记 done 的版本。
2. 清空 VERSION_NOTES.md 中已处理的笔记，只保留一个空白段落。

Claude Code：提问使用 AskUserQuestion 工具，写入使用 Edit 工具。
```

---

## 模板 2：执行 Roadmap 版本

从 ROADMAP 中选一个版本，一段提示词从头到尾。方案确认后自动执行，不中断。

```
读取 docs/ROADMAP.md 中的 [版本号] 版本。

1. 复述该版本的目标、约束、scope 和验收标准。
2. 分析问题依赖关系，提出执行顺序，说明涉及的 Layout Zone、Interaction States 和文档边界。
3. 如果版本太大无法一次会话完成，先拆成多轮。如果合适一次完成，列出将执行的任务清单。

然后使用 AskUserQuestion 问我是否同意该方案，给出选项：
- 同意执行（推荐）
- 调整优先级或顺序（说明你的想法）
- 补充遗漏项（说明补充什么）
- 拆得更细再确认

同意执行后，使用 TaskCreate 建立任务列表，立即开始逐任务执行。每个任务完成后自动执行以下审查：
- 调用 /simplify 或等效代码审查工具检查代码质量
- 检查逻辑、安全、范围、遗漏

通过后继续下一个任务，直到全部完成。全部完成后自动跑模板 4 的文档审查，然后提醒我版本完成可以提交。

Claude Code：确认方案用 AskUserQuestion，任务追踪用 TaskCreate，代码审查用 /simplify skill。
```

---

## 模板 3：Review Diff

代码修改完成后，审查改动但不提交。

```
Review 当前所有未提交的改动：

1. 先调用可用的代码审查工具/skill 检查代码质量、复用和效率。
2. 再做人工级审查：
   - 逻辑是否正确，是否存在潜在 bug。
   - 是否有安全风险（SQL 注入、XSS、密钥泄露、命令注入等）。
   - 是否超出了本次任务范围，改动了无关文件。
   - 是否有遗漏的文件（应该改但没改的）。

输出分为两部分：
1. 阻塞项（必须修）：会引入 bug、安全漏洞、破坏架构规则的问题。
2. 建议项（可选修）：命名、简化、风格等不影响功能的改进。

不要提交。我修复后会重新 review。

Claude Code：步骤 1 调用 /simplify skill。
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
