# Roadmap

基于 `docs/VERSION_NOTES.md` 和 `docs/PRD.md` 生成。每个版本有明确主题、约束和验收标准，按依赖排序。

已完成版本归档在 `docs/ROADMAP_ARCHIVE.md`，仅供查阅。

---

## 版本说明

| 字段 | 说明 |
|------|------|
| 版本 | 语义化版本号 vMAJOR.MINOR.PATCH |
| 主题 | 本版本的核心目标，一句话概括 |
| 约束 | 本版本不做什么，防止 scope creep |
| Scope | frontend / backend / full-stack |
| 状态 | planned / in_progress / done |

---

---

## v0.18.0 — File Operations Tauri Native

Scope：full-stack（Tauri Rust + React 前端）

状态：planned

约束：

- 不改变 Knowledge 关联、embedding 状态等文件元数据的 API 路径
- 不实现跨仓库文件拖拽或复制
- 不改变文件在磁盘上的存储格式
- 文件元数据（Knowledge 关联、embedding 状态）仍走 FastAPI

解决的问题：

1. [Architecture] 文件树通过 FastAPI 读取本地文件，导致后端不可用时文件树完全无法使用
2. [Feature] 文件树缺少拖拽移动文件功能
3. [Feature] 缺少从文件树拖拽文件到 Editor 打开的能力
4. [UX] 切换仓库时未关闭旧仓库的已打开文件 Tab

验收标准：

- [ ] 文件树读取/创建/删除/重命名使用 Tauri Rust command，不依赖 FastAPI
- [ ] 文件树内支持拖拽移动文件到子文件夹或上级目录
- [ ] 支持从文件树拖拽文件到 Editor 区域以在新 Tab 打开
- [ ] 切换仓库时弹出确认对话框，列出未保存文件，支持保存并关闭或放弃更改
- [ ] 确认后关闭所有旧仓库 Tab，Editor 区域重置为空状态
- [ ] 文件元数据（Knowledge 关联状态等）仍通过 FastAPI 获取
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---


## v0.15.0 — RAG 对话与 Project 管理

Scope：full-stack

状态：planned

约束：

- 不重新实现 v0.9.0 已完成的基础非 RAG Chat 流程
- 不实现多轮对话上下文之外的 Agent 自主行为
- 不实现对话分支或版本管理
- 不实现对话导出或分享
- Project 配置首版仅包含名称、描述、颜色、归档/删除

解决的问题：

1. [Feature] 基础 Chat 尚未升级为基于 Knowledge 的 RAG 问答
2. [Feature] 尚未实现基于 pgvector 的语义检索
3. [Feature] 尚未实现 RAG 问答流程
4. [Feature] 尚未实现 Chat 视图的 Project 选择器
5. [Feature] Chat 页面项目管理器尚不能创建 Project
6. [UX] Project 列表项缺少统一的 `...` 操作菜单
7. [UX] Project selector 无法通过点击外部取消
8. [Research] 探索 AI Tool / Function Calling 接入方案

验收标准：

- [ ] RAG user message 和 assistant message 正确保存并关联 conversation
- [ ] 用户提问时后端执行语义检索 → 构造 prompt → 调用 AI Provider
- [ ] 回答展示引用的 Knowledge source references
- [ ] Chat 视图 Project 选择器可切换/新建/不使用 Project
- [ ] Project selector 打开后点击外部区域自动关闭
- [ ] Project 列表项有 `...` 操作菜单（重命名、配置、归档/删除）
- [ ] Project 危险操作有确认或明确防误触机制
- [ ] 点击 Chat 顶部当前 Project 名称进入 Project 配置界面
- [ ] 产出 AI Tool calling 技术探索报告
- [ ] `cd apps/api && pytest` 通过
- [ ] `cd apps/desktop && npm run typecheck` 通过

---

## v0.15.1 — 代码审计与清理

Scope：frontend

状态：planned

约束：

- 不新增功能
- 不修改 API 接口定义
- 不修改数据库 schema

解决的问题：

1. [Audit] 前端经历较大变化后存在冗余代码和组件
2. [Audit] 前端 API client 接口需与后端实际接口进行兼容性核对
3. [Audit] 后端接口设计是否合理，是否需要调整

验收标准：

- [ ] 移除未使用的组件、类型和工具函数
- [ ] API client 类型定义与后端 OpenAPI schema 一致
- [ ] 后端接口路径、参数和响应格式经审查无遗留问题
- [ ] `cd apps/api && pytest` 通过
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---

## v0.16.0 — Command Palette 与快捷键管理

Scope：frontend

状态：planned

约束：

- 不实现插件市场或第三方命令扩展系统
- 不实现 OS 全局快捷键；首版仅管理 Asteria 应用窗口内快捷键
- 不重构 Settings 全部页面
- 不改变 desktop-first、本地 API 和后端权威边界

解决的问题：

1. [Feature] 需要 Command Palette 集中承载常用命令入口
2. [UX] `Ctrl+P` 触发默认打印行为，与未来命令入口冲突
3. [UX] 缺少统一快捷键管理位置

验收标准：

- [ ] Command Palette 可通过应用内注册快捷键打开
- [ ] `Ctrl+P` 被接管后不触发默认打印
- [ ] Settings 中新增 Shortcuts / Keyboard 页面或等价入口
- [ ] 快捷键设置页面列出命令名称、当前快捷键和可编辑入口
- [ ] 修改快捷键时能检测并阻止冲突
- [ ] 用户可恢复默认快捷键
- [ ] 快捷键配置通过本地设置持久化
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---

## v0.17.0 — UI 中英文切换

Scope：frontend

状态：planned

约束：

- 仅实现 UI 文案层面的 English / 中文切换
- 不改变 AI 输出语言、内容翻译或 prompt 行为
- 不新增账号、云同步或团队级语言偏好
- 不引入大型 i18n 框架，除非评估后确认为最小可维护方案

解决的问题：

1. [Feature] 应用尚未支持多语言 UI
2. [UX] 早期用户需要在 English 和中文之间切换界面语言
3. [Architecture] UI 文案缺少集中资源层

验收标准：

- [ ] 用户可在 English 和中文之间切换 UI 语言
- [ ] 语言偏好本地持久化，重启后保持
- [ ] 默认语言策略明确
- [ ] 缺失翻译有 fallback，不显示空白 key
- [ ] 已存在核心 UI 的用户可见文案使用 i18n 资源
- [ ] UI 语言切换不影响 AI 回复语言或 prompt 行为
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过
