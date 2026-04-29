# AI 提示词模板

将占位符 `{{...}}` 替换为实际内容后粘贴给 AI。

---

## 模板 1：Review Diff + 提交

```
Review 当前的 staged 和 unstaged diff：

- 检查：逻辑是否正确、是否有安全风险、是否引入未使用的代码、是否超出任务范围。
- 检查：是否有遗漏的文件或不应该改动的文件。
- 按 Conventional Commits 格式（type(scope): description）草拟 commit message。
- 将审查结论和推荐的 commit message 输出给我确认。

确认后，我回复 "commit" 你再执行 git commit。
```

### 变体 1A：审查但不提交

```
Review 当前的 staged 和 unstaged diff：

- 检查：逻辑正确性、安全风险、未使用代码、是否超出任务范围。
- 检查：是否有遗漏或误改的文件。
- 输出审查结论和建议，不要提交。
```

### 变体 1B：审查并直接提交

```
Review 当前的 staged 和 unstaged diff，然后直接提交：

- 按 Conventional Commits 格式生成 commit message。
- scope 从以下选择：api, desktop, ui, docs, dev, infra, rag。
- 提交前确认 diff 没有安全风险、不超出任务范围。
```

---

## 模板 2：体验笔记 → Roadmap 草案

```
根据以下使用笔记，生成一份 Roadmap 草案：

[粘贴你的使用笔记、发现的 bug、UI 问题、想要的功能]

要求：
- 按阶段拆分，每个阶段有主题和约束（如：只修 bug、只做导航优化）。
- 每个阶段列出要解决的问题和验收标准。
- 阶段之间考虑依赖关系。
- 输出到 docs/ROADMAP.md。
```

---

## 模板 3：阶段拆分任务列表

```
将 Roadmap 中的 [阶段名称] 拆分为可逐个执行的任务列表：

- 每个任务符合 docs/AI_WORKFLOW.md 的格式。
- 任务之间标注依赖关系。
- 估算每个任务的范围，确保一个 session 内可完成。
- 输出到 docs/MVP_TASKS.md 或对应阶段的任务文件。
```
