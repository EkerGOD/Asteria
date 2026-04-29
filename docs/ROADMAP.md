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

## v0.8.3 — UI 修复与图标修正

状态：planned

约束：

- 不新增页面或组件
- 不修改后端 API
- 不引入新依赖

解决的问题：

1. [Bug] 左侧折叠按钮位于右侧，应移到左侧；右侧折叠按钮位于左侧，应移到右侧
2. [Bug] 左侧折叠面板图标错误，显示为上侧折叠面板图标
3. [Bug] 设置按钮使用太阳图标 ☀️，应改为齿轮图标 ⚙️
4. [UX] 文件状态栏位于应用顶端，应移到中央 Editor 区域上方，并随左右侧栏折叠自动调整位置

验收标准：

- [ ] 左侧面板折叠按钮位于面板左侧边缘
- [ ] 右侧面板折叠按钮位于面板右侧边缘
- [ ] 各折叠按钮图标与对应面板方向一致
- [ ] 设置按钮显示齿轮图标
- [ ] 文件状态栏居中显示在 Editor 上方，左右位置随面板折叠自适应
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---

## v0.8.4 — 设置与面板布局优化

状态：planned

约束：

- 不新增后端 API 端点
- 不修改数据库 schema
- 仅修改 Settings 和面板相关组件

解决的问题：

1. [UX] 设置界面 Providers 和 Diagnostics 页面布局拥挤，未适配侧栏宽度
2. [UX] Edit Provider 表单一直显示，应在点击 Edit 按钮后才出现
3. [UX] 每个 Provider 缺少独立 Edit 按钮，无法直观编辑单个 Provider
4. [UX] Diagnostics 页面布局需要重新调整为竖排结构
5. [UX] Chat 视图中消息区和输入区之间分隔线不可拖动调整

验收标准：

- [ ] Providers 页面采用竖排布局，每个配置 section 用标题和边框区分
- [ ] Provider 列表项各有一个 Edit 按钮，点击后显示 Edit Provider 表单
- [ ] 点击 New 按钮时显示 New Provider 表单
- [ ] Desktop 总览数据界面位于 Providers 页面顶部
- [ ] Diagnostics 页面采用竖排布局，信息层次清晰不拥挤
- [ ] Chat 视图上下分区间分隔线可通过鼠标拖动调整高度
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---

## v0.9.0 — 前后端集成

状态：planned

约束：

- 不新增数据库表或迁移
- 不修改 PRD 定义的架构边界
- 前端只通过 typed API client 访问后端

解决的问题：

1. [Feature] 前端 UI 目前仅展示静态界面，未与 FastAPI 后端衔接
2. [Feature] Provider 配置需要通过 API 持久化而非本地 mock
3. [Feature] Settings 和 Diagnostics 数据需从后端实时获取

验收标准：

- [ ] Provider CRUD 通过前端 → API client → FastAPI 全链路可操作
- [ ] Settings 数据从后端读取并持久化
- [ ] Diagnostics 页面展示后端实时状态（数据库连接、Provider 连通性等）
- [ ] API client 类型与后端 OpenAPI schema 一致
- [ ] 前端不直接调用 PostgreSQL 或 AI Provider SDK
- [ ] `cd apps/api && pytest` 通过
- [ ] `cd apps/desktop && npm run typecheck` 通过

---

## v0.10.0 — 编辑器与文件系统

状态：planned

约束：

- 不实现实时协作编辑
- 不实现非 Markdown 文件的高级编辑
- 不引入 Monaco 或 CodeMirror 重型编辑器（先用 textarea/contenteditable）

解决的问题：

1. [Feature] 中央 Editor 区域尚未实现 Markdown 编辑功能
2. [Feature] 无法打开本地仓库并显示文件树
3. [Feature] 无法在 Editor 中以 Tab 形式打开文件

验收标准：

- [ ] 用户可通过左侧文件浏览器打开本地仓库（Repository/Vault）
- [ ] 文件树正确显示仓库目录结构（文件和文件夹）
- [ ] 点击文件在中央 Editor 打开新 Tab
- [ ] 支持 Markdown 文件编辑和预览模式切换
- [ ] 支持多 Tab 管理（打开、切换、关闭）
- [ ] 选中文本右键菜单包含「提取为 Knowledge 单元」入口（功能在 v0.11.0 实现）
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---

## v0.11.0 — Knowledge 核心

状态：planned

约束：

- 不实现自动知识图谱生成
- 不实现 PDF/Office/图片等文件解析
- 不实现 Agent 自动修改 Knowledge

解决的问题：

1. [Feature] 尚未实现 Knowledge 单元的创建、编辑、归档和列表查看
2. [Feature] 尚未实现 Knowledge 卡片/列表视图切换
3. [Feature] 尚未实现标签管理和 Knowledge 标记
4. [Feature] 尚未实现 Knowledge 单元的 embedding 生成

验收标准：

- [ ] 用户可手动创建、编辑、归档 Knowledge 单元
- [ ] Knowledge 视图支持卡片和列表两种展示模式
- [ ] 支持为 Knowledge 添加和管理标签
- [ ] 可通过关键词搜索 Knowledge 单元
- [ ] 可为 Knowledge 单元生成 embedding（调用后端 AI Provider）
- [ ] `cd apps/api && pytest` 通过（Knowledge CRUD + embedding 相关测试）
- [ ] `cd apps/desktop && npm run typecheck` 通过

---

## v0.12.0 — RAG 对话

状态：planned

约束：

- 不实现多轮对话上下文之外的 Agent 自主行为
- 不实现对话分支或版本管理
- 不实现对话导出或分享

解决的问题：

1. [Feature] 尚未实现对话和消息管理
2. [Feature] 尚未实现基于 pgvector 的语义检索
3. [Feature] 尚未实现 RAG 问答流程
4. [Feature] 尚未实现 Chat 视图的 Project 选择器

验收标准：

- [ ] 用户可创建 conversation 并发送消息
- [ ] 对话消息正确保存到数据库并关联 conversation
- [ ] 用户提问时后端执行语义检索 → 构造 prompt → 调用 AI Provider
- [ ] 回答展示引用的 Knowledge source references
- [ ] Chat 视图 Project 选择器可切换/新建 Project
- [ ] 支持 @knowledge 引用特定知识单元
- [ ] `cd apps/api && pytest` 通过（RAG service + retrieval 相关测试）
- [ ] `cd apps/desktop && npm run typecheck` 通过

---

## v0.12.1 — 代码审计与清理

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
