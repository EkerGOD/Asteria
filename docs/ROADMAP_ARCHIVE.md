# Roadmap Archive

已完成版本的归档记录。仅供查阅，不会被任何模板读取。

---

## v0.1.0 — MVP 核心骨架

MVP 核心骨架已完成：

- FastAPI 后端 8 个路由模块、AI Provider 抽象、RAG 编排、语义检索
- React 桌面 UI 5 个页面、类型化 API 客户端
- PostgreSQL + pgvector 数据库 schema、Alembic 迁移
- Docker Compose 开发环境、全链路 smoke test

---

## v0.8.3 — UI 修复与图标修正

约束：

- 不新增页面或组件
- 不修改后端 API
- 不引入新依赖

解决的问题：

1. [Bug] 左侧折叠按钮位于右侧，应移到左侧；右侧折叠按钮位于左侧，应移到右侧
2. [Bug] 左侧折叠面板图标错误，显示为上侧折叠面板图标
3. [Bug] 设置按钮使用太阳图标 ☀️，应改为齿轮图标 ⚙️
4. [UX] 文件状态栏位于应用顶端，应移到中央 Editor 区域上方，并随左右侧栏折叠自动调整位置

---

## v0.8.4 — 设置与面板布局优化

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

---

## v0.8.5 — 图标库引入与统一替换

约束：

- 不新增页面或组件
- 不修改后端 API
- 不修改数据库 schema
- 不新增功能
- 仅替换图标系统，不改动交互逻辑

方案：

- 引入 Codicons，风格对齐 Cursor / VS Code
- 建立统一的 `<Icon>` 组件或 icon 映射表
- 逐个替换所有 emoji 和内联 SVG 为 Codicons 对应图标

---

## v0.8.6 — AppShell 面板与交互 polish

约束：

- 不新增布局区域或业务视图
- 不修改后端 API
- 不修改数据库 schema
- 不新增依赖
- 仅修改 AppShell 面板折叠、展开、尺寸调节、图标按钮和分隔线视觉

解决的问题：

1. [UX] 左侧文件树面板折叠按钮冗余
2. [UX] 左侧面板展开/折叠交互与右侧面板不一致
3. [UX] 左侧文件树、中央 Editor、右侧多功能面板之间的分界不可左右拖拽
4. [Bug] 左下方设置按钮上方的分割线与 MyVault 上方分割线未齐平
5. [UX] 图标按钮 hover / active 背景尺寸不统一
6. [UX] 左右侧栏折叠/展开过于生硬，需要克制动效

---

## v0.8.7 — AppShell、Settings 外观与 Chat history polish

约束：

- 不新增后端 API 端点
- 不修改数据库 schema
- 不修改 Provider、RAG 或 Project 管理业务能力
- 主题仅作为本地 UI 偏好实现，不接 FastAPI
- 仅修改 AppShell、Settings、Chat history 相关前端 UI 与状态样式

解决的问题：

1. [Bug] Diagnostics 页面状态重复显示
2. [Bug] Providers 页面文本溢出容器
3. [UX] Chat 顶部显示 Project UUID
4. [UX] 左右侧面板折叠按钮额外占用空间
5. [UX] Settings 按钮和 MyVault 上方分割线视觉冗余
6. [Feature] Settings 需要 Appearance / 外观选项卡
7. [UX] Chat history hover / selected 状态会放大背景

---

## v0.8.8 — AppShell 与 Settings 视觉收口

主题：收敛 AppShell 面板控制与 Settings Desktop 概览布局的视觉细节。

约束：

- 不新增后端 API 端点
- 不修改数据库 schema
- 不新增页面、业务视图或大型组件
- 不引入新依赖

解决的问题：

1. [UX] resize handle 默认状态过于明显
2. [Bug] 右侧折叠按钮位置应在 tab row 最左侧
3. [UX] Settings Desktop 区域横向排列溢出

---

## v0.9.0 — 前后端集成、Provider 模型角色与基础 AI Chat

约束：

- 不修改 PRD 定义的 desktop-first 架构边界
- 前端只通过 typed API client 访问后端
- 模型角色首版仅支持 `chat` 和 `embedding`
- 不生成或刷新 embedding，不执行 semantic search，不展示 RAG source references

解决的问题：

1. [Feature] 前端 UI 与 FastAPI 后端衔接
2. [Architecture] Provider 配置不支持多模型角色
3. [Feature] 基础 Chat 流程：创建 conversation、发送 message、接收 AI 回复
4. [Feature] Conversation 归档和删除

---

## v0.9.1 — Chat 核心体验修复

约束：

- 不新增后端 API 端点（conversation 重命名除外）
- 不修改数据库 schema（conversation 重命名除外）
- 不引入新依赖
- 仅修复 Chat 视图状态保持、键盘交互和基础会话管理

解决的问题：

1. [Bug] 发送消息后切换视图再返回，消息历史丢失
2. [Bug] 输入框半输入内容在切换视图后丢失
3. [UX] Enter/Ctrl+Enter 键位相反
4. [Feature] Conversation 无法重命名
5. [UX] 打开长对话时从顶部滚动到底部

---

## v0.9.2 — Chat 消息渲染与交互增强

约束：

- 不修改 Provider 配置体系
- 不修改后端 AI 调用流程
- 不实现流式输出
- 仅做消息展示和用户交互增强

解决的问题：

1. [Feature] AI 返回 Markdown 渲染为纯文本
2. [Feature] 缺少消息快捷操作（复制、编辑、重试）
3. [UX] 输入框高度固定
4. [Bug] 缺少乐观更新
5. [UX] 对话列表操作按钮分散，应合并到 `...` 菜单

---

## v0.9.3 — 消息元数据与模型快捷切换

约束：

- 不修改 Provider 架构
- 不修改后端 AI 调用流程
- 不修改数据库 schema
- 仅做消息元数据展示配置和 Chat 模型快捷选择 UI

解决的问题：

1. [Feature] AI 回复缺少时间戳、token 消耗等元数据
2. [Feature] 缺少消息元数据显示配置入口
3. [Feature] Chat 输入区无法快捷切换模型

---

## v0.9.4 — Chat UI 视觉修复与交互收口

主题：Chat 视图 markdown 主题适配、加载体验、按钮布局、列表交互收敛。

约束：

- 不修改后端 API
- 不修改数据库 schema
- 不新增依赖
- 仅修改 Chat 视图相关前端组件和样式

解决的问题：

1. [Bug] Markdown 颜色不跟随主题
2. [Bug] scrollToBottom 存在可见滚动闪现
3. [UX] 消息操作按钮应移到气泡下方
4. [Bug] Chat 列表项 hover 时背景变大导致抖动
5. [Bug] 模型切换按钮中名称被截断

---

## v0.9.5 — Provider 创建 500 错误修复

约束：

- 不新增 API 端点
- 不修改数据库 schema
- 不修改 Provider 架构或 AI 调用流程
- 仅修复 Provider 创建流程中的异常处理和字段映射

解决的问题：

1. [Bug] 添加 Provider 时每次返回 500 Internal Server Error


---

## v0.10.0 — Provider 模型架构重构与流式输出

Scope：full-stack

状态：done

约束：

- 不修改 PRD 定义的 desktop-first 架构边界
- 不修改数据库 schema 中非 Provider/Model 相关部分
- 不实际运行本地 embedding 模型（仅做架构调整，本地模型集成延后到后续版本）
- 不实现 RAG 流程（留到 v0.13.0）
- 不实现 Tool calling（仅架构预留）
- 前端只通过 typed API client 访问后端

解决的问题：

1. [Architecture] Provider 页面仍区分 chat 和 embedding，但 Provider 只是 API 服务配置，不应按任务角色分类
2. [Architecture] Chat model 需要手动填写名称，无法从 Provider 已配置的模型列表中选择
3. [Architecture] 单个 Provider 只能配置一个模型，无法表达同一 Provider 的多个模型
4. [Architecture] Embedding model 配置混在 Provider 中，应改为本地化方案
5. [Feature] Chat 尚未实现流式输出，用户需等待完整回复

主要变更：

- 新增 ProviderModel 表，每个 Provider 支持多个模型（+/- 按钮管理）
- Provider 创建/编辑表单从 chat_model/embedding_model 改为统一的 models 列表
- Chat 模型角色从所有 Provider 的模型下拉列表中选择
- Embedding 模型角色改为本地模型方案入口（bge-m3 默认）
- 后端新增 SSE 流式输出端点 POST /api/chat/send/stream
- 前端 ChatView 接入流式输出，逐 token 渲染
- 流式中断时保存已生成内容并显示「Response interrupted」提示

---

## v0.10.1 — Provider 编辑 Bug 修复与布局修复

Scope：full-stack

状态：done

约束：

- 不新增 API 端点
- 不修改数据库 schema
- 不新增功能

解决的问题：

1. [Bug] Provider 编辑保存模型时报 409 Conflict（`_replace_provider_models` flush 顺序导致唯一约束误触发）
2. [Bug] 右侧面板折叠到最小时 Send 按钮被挤出视图

主要变更：

- `_replace_provider_models` 先显式删除旧模型条目并 flush，再插入新条目，消除唯一约束冲突
- `_commit_provider` 区分 IntegrityError 来源，仅对 name 冲突抛出 ProviderNameConflictError
- ChatView 输入区 Send 按钮和模型选择器添加 `shrink-0`，模型名称 `truncate` 溢出省略

---

## v0.10.2 — Provider 架构收口与文件空间调研

Scope：full-stack

状态：done

约束：

- 不新增 Provider 类型或 AI 能力
- 不修改 PRD 定义的架构边界
- 不实际实现本地 embedding 模型加载
- 文件空间调研仅产出文档，暂不写代码

解决的问题：

1. [Architecture] Provider 的 `is_active` 机制与 model role 职责重叠，应完全由 model role 决定
2. [UX] ChatView 模型选择器与 Settings Chat Model Role 未实时同步
3. [Research] 缺少应用数据目录与本地模型存放方案规划

主要变更：

- 从 Provider 模型、schema、API、UI 中彻底移除 `is_active` 字段
- 移除 `POST /api/providers/{id}/activate` 端点
- 移除 `activate_provider`、`get_active_provider`、`_deactivate_all_providers` 服务函数
- Chat 模型选择 100% 由 chat model role 决定，未配置时后端返回 400，ChatView 引导用户配置
- 新增 `ModelRoleContext`（React Context），ChatView 和 ModelRolesPage 共享 chat model 状态
- Chat 模型角色在 ModelRolesPage 中改为 dropdown 自选即存，无需额外 Save 按钮
- `get_embedding_provider` 改为返回首个 Provider，不再依赖 is_active
- 新增 `docs/APP_DATA_DIRECTORY.md` 调研报告（Tauri 2 路径 API、平台路径、目录布局、模型存储）
- 更新 `docs/API_CONTRACT.md`、`docs/DATABASE_SCHEMA.md` 移除 is_active 相关内容
- 新增 Alembic migration `20260430_0004_remove_is_active_from_ai_providers.py`

---

## v0.11.0 — 编辑器技术选型、Repository 文件系统与 Vault Manager

Scope：frontend

状态：done

约束：

- 不实现实时协作编辑
- 不实现非 Markdown 文件的高级编辑
- Knowledge 提取入口预留（右键菜单），功能延后到 v0.12.0
- 不把 Repository/Vault 与 Project 耦合
- Manage Vaults 为独立全屏浮层，非 Settings 子页面
- 编辑器已锁定 Milkdown Crepe（ProseMirror + Remark）

解决的问题：

1. [Feature] 中央 Editor 区域实现 Markdown 编辑（Milkdown Crepe，WYSIWYG + 源码模式）
2. [Feature] 实现 Tauri 文件系统集成，打开本地仓库并显示文件树
3. [Feature] 实现 Tab 形式打开文件
4. [Feature] 文件系统支持创建文件夹和新建 Markdown 文件
5. [Research] 编辑器组件方案完成系统评估（4 候选 × 6 维度）
6. [UX] Manage Vaults 打开独立全屏 Vault Manager
7. [Feature] 独立 Vault Manager：current vault、available vaults、create vault、open local vault

主要变更：

- 新增 Tauri 插件：`tauri-plugin-fs`、`tauri-plugin-dialog`（文件系统 + 原生对话框）
- 新增 Milkdown 编辑器：`@milkdown/crepe`、`@milkdown/react`、`@milkdown/preset-commonmark`
- 新增 `src/store/vaults.tsx`：Vault 类型、localStorage 持久化、React Context
- 新增 `src/hooks/useFileTree.ts`：Tauri fs 文件树懒加载 hook
- 新增 `src/components/VaultManagerOverlay.tsx`：独立全屏 Vault Manager
- 新增 `src/components/MarkdownEditor.tsx`：Milkdown Crepe React 封装
- 新增 `src/components/Editor.tsx`：编辑器容器、Tab 栏、Ctrl+S 保存、脏状态
- 新增 `src/components/ContextMenu.tsx`：可复用右键菜单
- 重写 `src/components/FileBrowser.tsx`：真实文件树、展开/折叠、新建文件/文件夹
- 更新 `src/components/AppShell.tsx`：集成 VaultProvider、Editor、VaultManagerOverlay
- 更新 `src/App.tsx`：移除 placeholder，Editor 接管中央区域
- 选型报告：`docs/EDITOR_EVALUATION.md`
