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

---

## v0.11.1 — Editor 与 Provider bug 速修

Scope：full-stack

状态：done

约束：

- 不新增 API 端点
- 不修改数据库 schema
- 不新增功能
- 仅修复 bug 和交互细节

解决的问题：

1. [Bug] 右侧面板缩到最小时 Send 按钮紧贴右边缘，缺少 padding
2. [Bug] 多 model provider 的 model role 下拉只显示第一个 model（代码路径验证正确，v0.10.2 已修复数据流）
3. [UX] Provider 卡片可点击选中出现绿色边框，改为仅 hover 时边框颜色变化
4. [Bug] Editor 顶部出现双重 Tab 栏（自定义 + Milkdown 原生），只保留 Milkdown 原生
5. [Bug] 打开 md 文件时 Editor 右上角显示 "could not read file"

主要变更：

- `SettingsPage.tsx`：移除 ProviderListItem 的 `onSelect`/`isSelected` 和 `<button>` 包裹，改为 `hover:border-pine/50`
- `ChatView.tsx`：flex row 添加 `pr-3` 确保 Send 按钮与输入框一致的右侧 padding
- `Editor.tsx`：`setError(null)` 移到 early-return guard 之前，使用 `useRef<Set>` 替代 `fileContent` 依赖
- `AppShell.tsx`：移除冗余 Tab Bar 和 `hasTabs`/`IconButton` 导入，Editor 内 Tab 栏为唯一 Tab 栏
- ModelRoleContext 数据流经代码审查验证正确，`providerModelNames` 正确映射所有 models

---

## v0.11.2 — Vault 管理与文件树增强

Scope：frontend

状态：done

约束：

- 不引入第三方文件树库（仅增强现有实现）
- 不修改后端 API
- 不修改数据库 schema
- 删除仓库仅 unlink（从列表移除），不删除磁盘文件
- 仓库配置目录使用 `.asteria`

解决的问题：

1. [Feature] 文件树不支持多级目录嵌套（文件夹下子文件夹）
2. [Bug] 重启程序后文件树显示 "Could not read directory"
3. [Bug + UX] 创建仓库报 "Could not create vault folder"，流程改为 Obsidian 风格（选已有文件夹 → 命名仓库）
4. [UX] 删除仓库当前可能删除本地文件，改为 unlink（仅从列表移除，保留磁盘所有文件含 `.asteria` 配置）

验收标准：

- [x] 文件树支持多级目录展开/折叠，文件夹内可嵌套子文件夹
- [x] 重启程序后文件树自动恢复，不再显示 "Could not read directory"
- [x] 创建仓库：用户选择已有本地文件夹 → 仓库名默认使用文件夹名（可手动修改）→ 注册到 Asteria
- [x] 创建仓库不再报 "Could not create vault folder"
- [x] 删除仓库仅从列表中移除，磁盘上所有文件（含 `.asteria` 配置目录）完整保留
- [x] 用户可重新打开同一文件夹恢复仓库（因 `.asteria` 配置保留）
- [x] `cd apps/desktop && npm run typecheck` 通过

主要变更：

- `useFileTree.ts`：展开状态持久化到 localStorage、目录缓存管理、路径错误恢复、`reloadExpandedDirs` 批量刷新、`toggleExpand` 移入 hook
- `FileBrowser.tsx`：移除本地 expanded/dirContents/toggleExpand 状态，改用 hook 提供
- `VaultManagerOverlay.tsx`：移除新建文件夹流程，改为 Obsidian 风格（选已有文件夹→命名→注册）、新增 `ensureVaultMarker` 创建 `.asteria` 标记目录、删除确认文案更新

---

## v0.11.3 — Editor 与文件树回归修复

Scope：frontend

状态：done

约束：

- 不新增后端 API
- 不修改数据库 schema
- 不强制引入第三方文件树库；仅在评估后确认为最小可维护方案时引入
- 不改变 Repository / Vault 与 Project 的独立概念线
- 不实现 Repository 后端注册能力（留到 v0.12.0）

解决的问题：

1. [Bug] 打开本地文件夹创建仓库后，重启程序文件树显示 `Could not read directory`
2. [Bug + UX] 文件树仍无法稳定展示多级目录
3. [Bug] 打开已存在的 `.md` 文件时右上角仍显示 `could not read file`
4. [Bug] Milkdown 深色模式下文本颜色正确，但相关图标为黑色导致不可读

验收标准：

- [x] 重启应用后，当前仓库文件树能自动恢复并读取目录
- [x] 文件树支持至少 3 级目录展开/折叠，展开状态和选中态稳定
- [x] 打开存在的 Markdown 文件不再误报 `could not read file`
- [x] 文件读取失败时显示具体路径/原因，并提供重试或刷新入口
- [x] Milkdown 深色模式下 toolbar、menu、icon、button 均符合主题颜色并可读
- [x] 回归验证覆盖空仓库、含多级目录仓库、含空目录仓库、含 Markdown 文件仓库
- [x] `cd apps/desktop && npm run typecheck` 通过
- [x] `cd apps/desktop && npm run lint` 通过

主要变更：

- `tauri-plugin-persisted-scope`：持久化 dialog 选择路径的文件系统 scope，修复重启后当前 Vault 无法读取的问题
- `useFileTree.ts`：补充路径拼接、目录级 loading/error、展开状态恢复与刷新重载
- `FileBrowser.tsx`：新增刷新入口、路径/原因错误展示、子目录重试、空目录状态和 active file 选中态
- `Editor.tsx`：区分读取失败与保存失败，读取失败时显示具体路径/原因并提供 Retry
- `styles.css`：将 Milkdown Crepe toolbar/menu/icon/button 颜色接入 Asteria 主题 token

---

## v0.12.0 — Repository 注册与新建仓库语义

Scope：full-stack

状态：done

约束：

- 不把 Repository / Vault 与 Project 耦合
- 不实现云同步、远程仓库或团队共享仓库
- 不删除磁盘文件；移除仓库仅 unlink 注册关系
- 不以前端 localStorage 作为 Repository 注册权威
- MVP 不依赖 `.asteria` 作为唯一权威配置；后端数据库注册为权威

解决的问题：

1. [Feature] 仓库管理缺少“新建仓库”入口
2. [Architecture] Repository / Vault 生命周期目前主要停留在前端状态，缺少后端注册权威
3. [UX] `Open Folder` 和“新建仓库”的语义未区分
4. [UX] 新建仓库应在指定父目录下创建对应名称文件夹，并注册为 Repository

验收标准：

- [x] 数据库 schema 定义 Repository / Vault 注册信息（名称、root path、当前状态、创建/更新时间）
- [x] 后端提供 create/list/update/unlink/select current Repository API
- [x] 新建仓库流程：选择父目录 → 输入仓库名 → 创建对应文件夹 → 注册到后端数据库
- [x] 打开本地仓库流程：选择已有文件夹 → 注册到后端数据库
- [x] 仓库切换以后，文件树和 Editor 使用当前 Repository root
- [x] 重启应用后，从后端注册信息恢复当前 Repository
- [x] 仓库名、路径重复、路径不可读、创建失败均有明确错误反馈
- [x] unlink 仓库只移除注册关系，不删除磁盘目录和文件
- [x] 更新 `docs/DATABASE_SCHEMA.md` 和 `docs/API_CONTRACT.md` 的 Repository 相关 contract
- [x] `cd apps/api && pytest` 通过
- [x] `cd apps/desktop && npm run typecheck` 通过
- [x] `cd apps/desktop && npm run lint` 通过（0 errors，2 warnings）

主要变更：

- 新增 `repositories` 数据库表、SQLAlchemy model 和 Alembic migration
- 新增 Repository FastAPI routes / schemas / service：create、list、get current、update、unlink、select current
- `current_repository_id` 通过 `app_settings` 持久化，用于应用重启后恢复当前仓库
- `VaultProvider` 改为从本地 FastAPI 加载仓库注册信息，不再用前端 localStorage 作为注册权威
- Vault Manager 区分 New Repository 和 Open Local Repository 两条流程
- FileBrowser 仓库切换改为调用后端 select current API
- AppShell 在当前 Repository 变化时清空旧 Editor tabs，避免继续使用旧 root 下的打开文件
- 更新 Repository 相关 API、schema、desktop 和 UI contract 文档

---

## v0.13.0 — 本地 Embedding 模型管理

Scope：full-stack

状态：done（2026-05-01）

约束：

- 不把 embedding 模型配置重新塞回 Provider 页面
- 不允许前端直接调用模型下载源、Provider SDK 或 embedding 执行逻辑
- 不实现完整模型市场或任意模型导入
- 不改变 chat model role 的远程 Provider 模型选择方式
- 模型文件存放在应用数据目录，不存放在具体 Repository 中

解决的问题：

1. [Feature] Model Roles 页面中 embedding 模型仍像自由输入，不是候选模型选择
2. [Feature] 用户选择本地 embedding 模型时，如果模型缺失，应提供下载能力
3. [Architecture] 本地 embedding 模型下载位置需要固定在应用数据目录，跟随软件而非污染知识库
4. [Architecture] Knowledge embedding pipeline 需要明确使用本地 embedding model role

验收标准：

- [x] Model Roles 页面中 embedding 角色使用候选模型 selector，不再使用自由文本输入
- [x] 首版候选模型至少包含默认 `bge-m3`，并展示维度、状态和本地路径摘要
- [x] 未下载模型显示可下载状态，下载中、成功、失败、重试状态完整
- [x] 模型下载到 `<app_data_dir>/models/embedding/<model_name>/`
- [x] FastAPI 通过配置读取 `ASTERIA_DATA_DIR` / `ASTERIA_MODELS_DIR` 或等价路径
- [x] 后端提供本地 embedding 模型状态查询和下载触发 API
- [x] embedding model role 保存 `provider_id = null`、`model_name` 和 `embedding_dimension`
- [x] 更新 `docs/API_CONTRACT.md`、`docs/DATABASE_SCHEMA.md` 和 `docs/APP_DATA_DIRECTORY.md`
- [x] `cd apps/api && pytest` 通过（134 passed）
- [x] `cd apps/desktop && npm run typecheck` 通过
- [x] `cd apps/desktop && npm run lint` 通过（0 errors）

修改文件：

- `apps/api/app/core/config.py` — `ASTERIA_DATA_DIR` / `ASTERIA_MODELS_DIR` / `embedding_models_dir`
- `apps/api/app/services/local_models.py` — 模型注册表 + HuggingFace 下载（新建）
- `apps/api/app/api/routes/local_models.py` — `GET /status` + `POST /{name}/download`（新建）
- `apps/api/app/main.py` — 注册 local_models 路由
- `apps/api/app/services/model_roles.py` — `resolve_embedding_model_role()`
- `apps/api/app/services/embeddings.py` — pipeline 接入 model_roles
- `apps/api/app/rag/retrieval.py` — RAG 检索同步接入 model_roles
- `apps/desktop/src/api/types.ts` — `LocalModelStatus` / `LocalModelItem` / `LocalModelsResponse`
- `apps/desktop/src/api/client.ts` — `listLocalModels()` / `downloadLocalModel()`
- `apps/desktop/src/pages/ModelRolesPage.tsx` — 候选模型 selector + 下载 UI
- `docs/API_CONTRACT.md` — Local Models API contract
- `docs/DATABASE_SCHEMA.md` — model_roles pipeline 使用说明
- `docs/APP_DATA_DIRECTORY.md` — 标记 v0.13.0 已实现

---

## v0.13.1 — Embedding 模型目录与下载诊断修复

Scope：full-stack

状态：done（2026-05-01）

约束：

- 不新增 embedding 模型目录/catalog（留到 v0.19.0）
- 不把 embedding 模型配置重新塞回 Provider 页面
- 不改变 chat model role 的远程 Provider 模型选择方式
- 不实现 RAG 流程、Knowledge embedding 批处理或模型推理优化
- 不依赖用户手动设置环境变量才能理解错误原因

解决的问题：

1. [Bug] 下载 embedding 模型时可能返回裸错误：`ASTERIA_DATA_DIR or ASTERIA_MODELS_DIR is not configured`
2. [UX] 用户无法从 Model Roles / Diagnostics 判断模型目录是否已配置、应如何恢复
3. [Architecture] 应用数据目录和模型目录缺少启动时可恢复的配置闭环

验收标准：

- [x] 后端在缺少 `ASTERIA_DATA_DIR` / `ASTERIA_MODELS_DIR` 时使用明确的默认应用数据目录，或返回结构化、可恢复的诊断错误
- [x] 模型下载 API 不再把底层环境变量错误原样暴露给用户
- [x] Model Roles 或 Diagnostics 能展示 data/models 目录状态、当前路径和恢复动作
- [x] 下载失败状态包含原因、重试入口和下一步提示
- [x] 更新 `docs/APP_DATA_DIRECTORY.md` 和 `docs/API_CONTRACT.md` 的目录 fallback / diagnostics 约定
- [x] `cd apps/api && pytest` 通过（138 passed）
- [x] `cd apps/desktop && npm run typecheck` 通过
- [x] `cd apps/desktop && npm run lint` 通过（0 errors，2 warnings）

主要变更：

- FastAPI 在未配置 `ASTERIA_DATA_DIR` / `ASTERIA_MODELS_DIR` 时解析平台默认 app data 目录
- `GET /health` 和 `GET /api/local-models/status` 返回 app data、models、embedding models 目录诊断
- 模型下载前预检并创建 embedding models 目录；目录不可用时返回结构化恢复错误
- 修正 local model 路径解析，避免出现 `models/embedding/embedding/<model_name>`
- Model Roles 展示 embedding models 目录状态、目标路径、下载失败原因和下一步
- Diagnostics 展示 data/models 目录状态、路径、来源、可写性和恢复动作
- 更新 app data 目录和 API contract 文档，并将 v0.13.1 从 ROADMAP 归档

修改文件：

- `apps/api/app/core/config.py` — 默认 app data 路径、models 路径解析和目录诊断
- `apps/api/app/api/routes/health.py` — health response 增加目录 diagnostics
- `apps/api/app/api/routes/local_models.py` — local models status/download 接入目录 diagnostics 和结构化错误
- `apps/api/app/services/local_models.py` — local model target path、失败 next step 和路径解析修复
- `apps/api/tests/test_config.py` — 默认目录解析测试
- `apps/api/tests/test_health.py` — health diagnostics 测试
- `apps/api/tests/test_local_models_api.py` — local model 目录诊断、路径和结构化错误测试
- `apps/desktop/src/api/types.ts` — 目录诊断和 local model response 类型
- `apps/desktop/src/api/client.ts` — 结构化错误 detail 读取
- `apps/desktop/src/pages/ModelRolesPage.tsx` — embedding models 目录状态和下载失败恢复 UI
- `apps/desktop/src/pages/DiagnosticsPage.tsx` — data/models 目录 diagnostics UI
- `docs/API_CONTRACT.md` — health/local models diagnostics contract
- `docs/APP_DATA_DIRECTORY.md` — directory fallback 与 diagnostics 约定
- `docs/ROADMAP_ARCHIVE.md` — 追加 v0.13.1 完成记录

---

## v0.14.0 — Knowledge 核心

Scope：full-stack

状态：done（2026-05-01）

约束：

- 不实现自动知识图谱生成
- 不实现 PDF/Office/图片等文件解析
- 不实现 Agent 自动修改 Knowledge
- 不实现本地 embedding 模型下载（依赖 v0.13.0）

解决的问题：

1. [Feature] 尚未实现 Knowledge 单元的创建、编辑、归档和列表查看
2. [Feature] 尚未实现 Knowledge 卡片/列表视图切换
3. [Feature] 尚未实现标签管理和 Knowledge 标记
4. [Feature] 尚未实现 Knowledge 单元的 embedding 生成

验收标准：

- [x] 用户可手动创建、编辑、归档 Knowledge 单元
- [x] Knowledge 视图支持卡片和列表两种展示模式
- [x] 支持为 Knowledge 添加和管理标签
- [x] 可通过关键词搜索 Knowledge 单元
- [x] 可为 Knowledge 单元生成 embedding（调用后端 AI Provider）
- [x] `cd apps/api && pytest` 通过（139 passed）
- [x] `cd apps/desktop && npm run typecheck` 通过
- [x] `cd apps/desktop && npm run lint` 通过（0 errors，2 warnings）
- [x] `cd apps/desktop && npm run build` 通过（存在 chunk size warning）

主要变更：

- `GET /api/knowledge-units` 增加 `q` 关键词过滤，支持 title、content 和 source URI 搜索
- RightPanel Knowledge View 接入真实 API，支持 cards/list 视图、搜索、标签过滤、选择、新建、编辑、归档和 embedding refresh
- Knowledge 标签管理支持创建标签、颜色 swatch、绑定和解绑
- API contract 补充 Knowledge filters、Knowledge tag endpoints 和 Tag API，并修正 Search API keyword contract
- UI interaction contract 对齐 Knowledge View 的 cards/list 模式，图谱继续由独立 Graph View 承载
- 将 v0.14.0 从 ROADMAP 归档

修改文件：

- `apps/api/app/api/routes/knowledge.py` — Knowledge list 接收 `q` 查询参数
- `apps/api/app/services/knowledge.py` — Knowledge keyword search 查询逻辑
- `apps/api/tests/test_knowledge_api.py` — keyword search API 测试
- `apps/desktop/src/api/client.ts` — `listKnowledgeUnits()` 支持 `q`
- `apps/desktop/src/components/KnowledgeView.tsx` — RightPanel Knowledge 核心管理 UI
- `docs/API_CONTRACT.md` — Knowledge filters、Tag API 和 Search API contract 更新
- `docs/UI_INTERACTION_GUIDELINES.md` — Knowledge View cards/list contract 对齐
- `docs/ROADMAP.md` — 移除 v0.14.0 planned 条目
- `docs/ROADMAP_ARCHIVE.md` — 追加 v0.14.0 done 记录

---

## v0.15.0 — RAG 对话与 Project 管理

状态：done（2026-05-01）

RAG 集成到主 Chat 流程并通过 Project 管理增强交互。

### 完成内容

**后端**：
- `/api/chat/send` 和 `/api/chat/send/stream` 新增可选 RAG 参数（`enable_rag`、`project_id`、`tag_slugs`、`top_k`、`min_score`）
- 启用 RAG 时自动执行语义检索 → 构造 grounded prompt → 调用 AI Provider
- 回答的 `retrieval_metadata` 保存检索上下文和 source references
- 流式端点 `done` SSE 事件返回 `sources`、`embedding_model`、`embedding_dimension`
- `rag/chat.py` 的 prompt 构建函数公开化（`build_grounded_user_prompt`、`build_retrieval_metadata`）供 chat service 复用

**前端**：
- ChatView 新增 RAG 开关（默认启用），Project selector 支持切换/新建/不使用项目
- Project selector 关闭时支持外部点击 dismiss
- Project 列表项有 `...` 操作菜单（Rename、Archive），Archive 有 ConfirmDialog 确认
- 点击消息区顶部 Project 名称进入配置面板（名称、描述、颜色、归档）
- 新建项目支持 inline 输入创建
- 启用 RAG 时 assistant message 展示 source references（来源标题、相关性得分、文本摘要）

**研究**：
- 产出 `docs/research/ai-tool-calling.md`：对比 OpenAI Function Calling、MCP、Custom Tool Registry 三种方案，推荐分阶段采用 Function Calling

### 验收标准达成

- [x] RAG user/assistant message 正确保存并关联 conversation
- [x] 用户提问时后端执行语义检索 → 构造 prompt → 调用 AI Provider
- [x] 回答展示引用的 Knowledge source references
- [x] Chat 视图 Project 选择器可切换/新建/不使用 Project
- [x] Project selector 打开后点击外部区域自动关闭
- [x] Project 列表项有 `...` 操作菜单（重命名、归档）
- [x] Project 危险操作有确认或明确防误触机制
- [x] 点击 Chat 顶部当前 Project 名称进入 Project 配置界面
- [x] 产出 AI Tool calling 技术探索报告
- [x] `cd apps/api && pytest` 通过（139 passed）
- [x] `cd apps/desktop && npm run typecheck` 通过
- [x] `cd apps/desktop && npm run lint` 通过（0 errors）

### 修改文件

- `apps/api/app/schemas/chat.py` — ChatSendRequest 新增 RAG 参数、ChatSendResponse 新增 sources/embedding 字段
- `apps/api/app/services/chat.py` — send_message() 支持 RAG 检索、stream_message_events() 支持 grounded prompt 和 sources
- `apps/api/app/rag/chat.py` — build_grounded_user_prompt / build_retrieval_metadata 公开化
- `apps/api/app/api/routes/chat.py` — 透传 sources/embedding_model/embedding_dimension
- `apps/desktop/src/api/types.ts` — ChatSendRequest/ChatSendResponse 新增 RAG 字段
- `apps/desktop/src/api/client.ts` — sendChatStream 捕获 SSE done 事件中的 sources
- `apps/desktop/src/components/ChatView.tsx` — RAG 开关、Project selector 完整交互、source references 展示、Project 配置面板
- `docs/research/ai-tool-calling.md` — 新增 AI Tool Calling 探索报告
- `docs/ROADMAP.md` — 移除 v0.15.0 planned 条目
- `docs/ROADMAP_ARCHIVE.md` — 追加 v0.15.0 done 记录


---

## v0.15.1 — 代码审计与清理

Scope：frontend

状态：done

约束：

- 不新增功能
- 不修改 API 接口定义
- 不修改数据库 schema

### 审计结果

**后端 API 审查**：35 个端点，路径命名一致，错误处理规范，无严重设计缺陷。

**前端 API client 修复**：
- 修复 `deleteProvider` 返回类型 `Promise<Provider>` → `Promise<void>`（后端返回 204）
- 新增 `requestJson` 204 No Content 处理
- 新增 `getProvider`、`getProject`、`getRepository`、`getKnowledgeUnit` GET-by-id 函数
- 新增 `searchSemantic` 函数 + `SemanticSearchRequest`/`SemanticSearchResponse` 类型

**死代码清理**：
- 移除 6 个未使用的 exported type 关键字（类型本身保留，仅移除不必要的 export）

### 验收标准达成

- [x] 移除未使用的组件、类型和工具函数
- [x] API client 类型定义与后端 OpenAPI schema 一致
- [x] 后端接口路径、参数和响应格式经审查无遗留问题
- [x] `cd apps/api && pytest` 通过（139 passed）
- [x] `cd apps/desktop && npm run typecheck` 通过
- [x] `cd apps/desktop && npm run lint` 通过（0 errors）

### 修改文件

- `apps/desktop/src/api/types.ts` — 新增 `SemanticSearchRequest`、`SemanticSearchResponse`；移除 4 个不必要的 export
- `apps/desktop/src/api/client.ts` — 修复 `deleteProvider` 返回类型；新增 5 个 API 函数；204 处理
- `apps/desktop/src/components/ConfirmDialog.tsx` — 移除 `ConfirmDialogProps` 多余的 export
- `apps/desktop/src/components/IconButton.tsx` — 移除 `IconButtonProps` 多余的 export
