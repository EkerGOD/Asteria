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

状态：done

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

状态：done

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

## v0.8.5 — 图标库引入与统一替换

状态：done

约束：

- 不新增页面或组件
- 不修改后端 API
- 不修改数据库 schema
- 不新增功能
- 仅替换图标系统，不改动交互逻辑

解决的问题：

1. [UX] 当前图标混用 emoji 和手写 SVG，视觉效果差，缺乏统一体系
2. [UX] 设置按钮图标辨识度低，需要专业级 gear 图标
3. [UX] 面板折叠箭头等图标风格不统一

方案：

- 引入 Codicons（`@vscode/codicons` 或 SVG 文件方式），风格对齐 Cursor / VS Code
- 建立统一的 `<Icon>` 组件或 icon 映射表
- 逐个替换所有 emoji 和内联 SVG 为 Codicons 对应图标

验收标准：

- [x] Codicons 成功引入，项目中有统一图标组件/映射
- [x] 所有 emoji 图标已替换为 Codicons 对应图标
- [x] 所有手写内联 SVG 图标已替换为 Codicons 对应图标
- [x] 设置按钮显示 `codicon-settings-gear`
- [x] 面板折叠箭头使用 Codicons 方向图标
- [x] 工具栏各按钮图标统一使用 Codicons
- [x] `cd apps/desktop && npm run typecheck` 通过
- [x] `cd apps/desktop && npm run lint` 通过

---

## v0.8.6 — AppShell 面板与交互 polish

状态：done

约束：

- 不新增布局区域或业务视图
- 不修改后端 API
- 不修改数据库 schema
- 不新增依赖
- 仅修改 AppShell 面板折叠、展开、尺寸调节、图标按钮和分隔线视觉

解决的问题：

1. [UX] 左侧文件树面板折叠按钮冗余：竖向工具栏和面板边缘各有一个，逻辑混乱
2. [UX] 左侧面板展开/折叠交互与右侧面板不一致
3. [UX] 左侧文件树、中央 Editor、右侧多功能面板之间的分界不可左右拖拽，无法像 Cursor 一样调整工作区宽度
4. [Bug] 左下方设置按钮上方的分割线与 MyVault 上方分割线未齐平
5. [UX] 图标按钮 hover / active 背景尺寸不统一，部分为长方形，且图标未在背景中居中
6. [UX] 左右侧栏折叠/展开过于生硬，需要克制的桌面应用动效

方案：

- 对齐右侧面板交互模式：面板折叠由面板边缘按钮负责，不由竖向工具栏控制
- 移除竖向工具栏上的文件浏览器面板折叠按钮
- 在左侧面板边缘添加折叠/展开按钮（与右侧面板风格一致）
- 在左侧文件浏览器与中央 Editor、中央 Editor 与右侧面板之间加入可拖拽分隔线
- 为左右面板设置最小/最大宽度，确保中央 Editor 始终保留可用编辑空间
- 对齐 VerticalToolbar 底部设置区和 FileBrowser 底部 Vault switcher 的分隔线高度
- 统一 icon-only button 的稳定正方形尺寸、hover / active 背景和图标居中规则
- 为左右面板折叠/展开加入短时、低干扰动画，不改变布局语义和可点击区域

验收标准：

- [x] 竖向工具栏不再包含文件浏览器面板的折叠/展开按钮
- [x] 左侧文件浏览器面板边缘有折叠/展开按钮，与右侧面板风格一致
- [x] 面板折叠后，边缘按钮仍然可见且可点击
- [x] 面板展开后，边缘按钮仍然可见可点击
- [x] 两侧面板折叠交互行为一致
- [x] 左侧文件浏览器宽度可通过拖拽分隔线调整
- [x] 右侧多功能面板宽度可通过拖拽分隔线调整
- [x] 拖拽时宽度受最小/最大值约束，中央 Editor 不被挤压到不可用
- [x] 左下设置区分隔线与 FileBrowser 底部 Vault switcher 分隔线在视觉上齐平
- [x] 所有 AppShell icon-only button 的 hover / active 背景为稳定正方形
- [x] 图标在按钮 hover / active 背景中水平和垂直居中
- [x] 左右侧栏折叠和展开具有克制动画，且不会造成布局跳动或按钮位置不可预测
- [x] `cd apps/desktop && npm run typecheck` 通过
- [x] `cd apps/desktop && npm run lint` 通过

---

## v0.8.7 — AppShell、Settings 外观与 Chat history polish

状态：done

约束：

- 不新增后端 API 端点
- 不修改数据库 schema
- 不修改 Provider、RAG 或 Project 管理业务能力
- 不实现 Project 配置页面或 Project 管理能力
- 主题仅作为本地 UI 偏好实现，不接 FastAPI、不改 app settings API
- 仅修改 AppShell、Settings、Chat history 相关前端 UI 与状态样式

解决的问题：

1. [Bug] Diagnostics 页面中 Local API、Database、AI Provider 的状态重复显示；标题旁和检查项旁各有一个 `online`
2. [Bug] Providers 页面 Desktop 区域中的 API base URL 和 Active provider 文本会撑破所在容器
3. [UX] Chat 顶部显示当前 Project 的 UUID，日常使用不需要暴露该内部标识
4. [UX] 左右侧面板折叠按钮额外占用空间，应融入面板工具区域，而不是单独占用按钮轨道
5. [UX] Settings 按钮和 MyVault 上方分割线视觉冗余，应只移除分割线并保留原有功能
6. [Feature] Settings 需要 Appearance / 外观选项卡，支持浅色、深色、跟随系统主题
7. [UX] Chat history hover / selected 状态会放大背景，应改为只通过颜色区分状态

方案：

- Diagnostics 保留每个检查项旁边的状态，移除标题或分组旁边的重复状态
- Providers 中长 URL、长 provider 名称和 active provider 文本必须在容器内换行或截断，并保持可读
- Chat 顶部当前 Project 区域只展示用户可读的项目名称，不展示 project UUID
- 左侧折叠按钮融入 FileBrowser 顶部操作区，靠近 New File，并通过轻量视觉分隔与其他操作区分
- 右侧折叠按钮融入右侧面板 tab 区，靠近 Chat / Knowledge / Outline / Graph，并通过轻量视觉分隔与其他 tab 区分
- 移除专门承载左右折叠按钮的额外空间轨道
- 移除 Settings 按钮和 MyVault 上方分割线，不删除按钮、不改变 Vault switcher 功能
- Settings 新增 Appearance / 外观选项卡，提供 Light / Dark / System 三种本地 UI 主题偏好
- Chat history hover、selected 和 focus 状态保持尺寸稳定，只使用颜色区分
- Project 配置入口延后到 v0.12.0 实现

验收标准：

- [x] Diagnostics 每个检查项旁只显示一个状态标签，标题旁不再显示重复状态
- [x] Local API、Database、AI Provider 的状态仍可清楚区分 online/offline/error
- [x] Providers 页面中的 API base URL 不会撑破卡片或产生水平溢出
- [x] Providers 页面中的 Active provider 不会撑破卡片或产生水平溢出
- [x] Chat 顶部当前 Project 不显示 UUID
- [x] Chat 顶部当前 Project 名称仍清楚可读
- [x] 左侧折叠按钮位于 FileBrowser 顶部操作区，靠近 New File，并用轻量视觉分隔
- [x] 右侧折叠按钮位于右侧面板 tab 区，靠近 Chat / Knowledge / Outline / Graph，并用轻量视觉分隔
- [x] 不再出现额外专门承载折叠按钮的空间轨道
- [x] Settings 按钮和 MyVault 上方分割线被移除，按钮和 Vault 功能保留
- [x] Settings 包含 Appearance / 外观选项卡
- [x] 用户可选择 Light / Dark / System
- [x] 主题偏好本地持久化，重启后保持
- [x] System 模式跟随系统浅色 / 深色
- [x] Chat history hover / selected / focus 不改变尺寸，只通过颜色区分
- [x] `cd apps/desktop && npm run typecheck` 通过
- [x] `cd apps/desktop && npm run lint` 通过

---

## v0.8.8 — AppShell 与 Settings 视觉收口

状态：done

主题：

- 收敛 AppShell 面板控制与 Settings Desktop 概览布局的视觉细节，让当前桌面工作台更安静、更稳定。

约束：

- 不新增后端 API 端点
- 不修改数据库 schema
- 不新增页面、业务视图或大型组件
- 不修改 Provider、RAG、Project、Repository 或文件系统业务能力
- 不引入新依赖
- 仅修改 AppShell、RightPanel、SettingsOverlay 相关前端 UI、布局和状态样式

解决的问题：

1. [UX] 左右面板与 Editor 之间的宽度调整线默认状态过于明显，应融入面板边界，hover / focus / dragging 时再清楚提示可拖拽
2. [Bug] 右侧折叠面板的折叠按钮位于上方 tab 选项卡最右侧，应调整到 RightPanel tab row 的最左侧
3. [UX] Settings 页面 Desktop 区域中的三项内容横向排列仍会显示不下，应改为始终竖向排列

验收标准：

- [x] 左侧文件浏览器与 Editor 之间的 resize handle 默认视觉权重降低，不再形成过强竖线
- [x] Editor 与右侧多功能面板之间的 resize handle 默认视觉权重降低，不再形成过强竖线
- [x] resize handle 在 hover、focus 或 dragging 状态下仍能明确表达可拖拽
- [x] 左右面板宽度仍可通过拖拽调整，且保留既有最小/最大宽度约束
- [x] 右侧折叠按钮位于 RightPanel 顶部 tab row 的最左侧
- [x] 右侧 Chat / Knowledge / Outline / Graph tab 的切换行为保持不变
- [x] 右侧面板折叠/展开后，折叠按钮仍可见且可点击
- [x] Settings 页面 Desktop 区域的三项内容始终竖向排列
- [x] Settings Desktop 区域不产生水平溢出，长 URL 或长 provider 名称仍可读或可截断
- [x] 不存在前端直接调用 PostgreSQL、AI Provider SDK 或 Provider endpoint 的新增路径
- [x] `cd apps/desktop && npm run typecheck` 通过
- [x] `cd apps/desktop && npm run lint` 通过

---

## v0.9.0 — 前后端集成、Provider 模型角色与基础 AI Chat

状态：done

约束：

- 不修改 PRD 定义的 desktop-first 架构边界
- 前端只通过 typed API client 访问后端
- 前端不直接调用 PostgreSQL、AI Provider SDK 或 Provider endpoint
- 模型角色首版仅支持 `chat` 和 `embedding`
- 基础 Chat 仅使用 `chat` 模型角色生成真实 AI 回复
- 不生成或刷新 embedding
- 不执行 semantic search
- 不展示 RAG source references
- 不实现重任务模型、上下文压缩模型或更多自定义角色
- 不实现 RAG 对话完整体验（RAG UI 留到 v0.13.0）

解决的问题：

1. [Feature] 前端 UI 目前仅展示静态界面，未与 FastAPI 后端衔接
2. [Architecture] 当前 Provider 配置把 chat model 和 embedding model 绑定在同一个 Provider 上，无法表达"不同任务角色使用不同 provider/model"
3. [UX] 一个 Provider 可能提供多个模型，配置中只有一个 chat model 和一个 embedding model 表达能力不足
4. [Feature] 尚未跑通创建 conversation、发送 message、接收真实 AI 回复的基础 Chat 流程
5. [Feature] 尚未提供 conversation 归档和删除能力
6. [UX] 删除或归档 conversation 需要确认或明确防误触机制

方案：

- 保留 OpenAI-compatible Provider 作为 provider 连接配置
- 增加模型角色配置层：`chat` 角色和 `embedding` 角色分别选择 provider 与 model
- Provider 配置支持记录该 Provider 可用或用户填写的模型名称，供模型角色配置选择
- 后端服务通过模型角色解析实际 provider/model；前端只渲染和提交配置，不直接调用 Provider
- 在 Chat 视图中先实现非 RAG 的真实 AI Chat：创建 conversation、发送用户消息、由 `apps/api` 调用 Provider abstraction 生成 assistant message、保存并渲染消息线程
- Conversation 管理首版包含 Archive 和 Delete；二者都必须有确认或明确防误触机制
- 如需 schema、API contract 或 migration 调整，应与本版本同步完成

验收标准：

**已完成（v0.9.0-b 基础 Chat 全链路）：**

- [x] Provider CRUD 通过前端 → API client → FastAPI 全链路可操作
- [x] Settings 数据从后端读取并持久化
- [x] Diagnostics 页面展示后端实时状态（数据库连接、Provider 连通性等）
- [x] API client 类型与后端 OpenAPI schema 一致
- [x] 用户可创建 conversation 并选择当前 conversation
- [x] 用户可在 selected conversation 中发送非空 message
- [x] 后端保存 user message，调用 Provider abstraction 生成 assistant message，并保存 assistant message
- [x] Chat 消息线程渲染后端持久化的 user / assistant messages
- [x] 基础 Chat 不展示 source references，不执行 retrieval，不依赖 embedding
- [x] 用户可归档 conversation；归档操作有确认或明确防误触机制
- [x] 用户可删除 conversation；删除操作有二次确认并明确删除后果
- [x] 归档后的 conversation 默认不出现在常规历史列表中，但不被硬删除
- [x] 不存在前端直接调用 PostgreSQL 或 AI Provider SDK 的路径
- [x] `cd apps/api && pytest` 通过
- [x] `cd apps/desktop && npm run typecheck` 通过

**已完成（v0.9.0-a/c 模型角色）：**

- [x] Settings 中可以分别配置 `chat` 和 `embedding` 两个模型角色
- [x] `chat` 模型角色可选择 provider 和 model
- [x] `embedding` 模型角色可选择 provider、model 和 embedding dimension
- [x] 后端调用 chat generation 时使用 `chat` 模型角色配置

---

## v0.9.1 — Chat 核心体验修复

状态：done

约束：

- 不新增后端 API 端点（conversation 重命名除外）
- 不修改数据库 schema（conversation 重命名除外）
- 不引入新依赖
- 不做消息渲染和视觉增强
- 仅修复 Chat 视图状态保持、键盘交互和基础会话管理

解决的问题：

1. [Bug] 发送消息等待回复中切换到别的界面，切回后消息历史丢失——必须退出重开才能看到
2. [Bug] 从 Chat 切换到别的页面再切回，对话重置为 No conversation selected
3. [Bug] 输入框半输入内容在切换视图后丢失
4. [UX] 发送消息应使用 Enter 发送、Ctrl+Enter 换行，当前键位相反
5. [Feature] Conversation 无法重命名
6. [UX] 打开长对话时页面从顶部滚动到底部，应直接定位到最新消息

方案：

- Chat 视图 mount/unmount 时保持消息列表和选中对话状态，不因视图切换销毁
- 视图重新挂载时从持久化状态（React 状态管理）恢复，不重新请求导致状态丢失
- 输入框内容在视图切换时保留在内存中
- 修改消息输入框键盘事件：Enter 发送，Ctrl+Enter 插入换行
- 添加 conversation 重命名 API 和 UI
- 对话打开时自动 scrollToBottom，无滚动动画

验收标准：

- [x] Chat 视图中发送消息后切换到其他视图再切回，消息历史完整保留
- [x] 从 Chat 切换到其他页面再切回，保持原选中的 conversation，不重置为 No conversation selected
- [x] 输入框半输入内容在视图切换后保留
- [x] Enter 键发送消息
- [x] Ctrl+Enter 在输入框中插入换行
- [x] 用户可重命名 conversation，新名称持久化并在 UI 中正确显示
- [x] 打开任意 conversation 时消息列表直接定位到最底部
- [x] `cd apps/desktop && npm run typecheck` 通过
- [x] `cd apps/desktop && npm run lint` 通过

---

## v0.9.2 — Chat 消息渲染与交互增强

状态：planned

约束：

- 不修改 Provider 配置体系
- 不修改后端 AI 调用流程
- 不实现流式输出
- 仅做消息展示和用户交互增强

解决的问题：

1. [Feature] AI 返回 Markdown 内容但渲染为纯文本，无法展示格式
2. [Feature] 用户发送的消息缺少快捷操作入口（复制、编辑）
3. [Feature] AI 回复消息缺少快捷操作入口（复制、重试）
4. [UX] 消息输入框高度固定，长文本输入不便

方案：

- 引入 react-markdown 或等价 Markdown 渲染库，在消息气泡中渲染 Markdown
- 支持常见 Markdown 语法：标题、列表、代码块（含语法高亮）、粗体、斜体、链接、表格
- 用户消息：hover 时底部显示隐藏动作按钮（复制、编辑）
- AI 回复：底部始终显示动作按钮（复制、重试），不依赖 hover
- 输入框：随内容增长高度直至最大限制后内部滚动，添加高度过渡动画
- 所有动作按钮使用 Codicons

验收标准：

- [ ] AI 回复中的 Markdown 格式正确渲染（标题、列表、代码块、粗体、斜体、链接、表格）
- [ ] 代码块有语法高亮
- [ ] 用户消息 hover 时显示复制和编辑按钮，鼠标移出后隐藏
- [ ] AI 回复底部始终显示复制和重试按钮
- [ ] 复制按钮可复制消息纯文本内容到剪贴板
- [ ] 输入框高度随文本内容自适应增长
- [ ] 输入框达到最大高度后出现垂直滚动条
- [ ] 输入框高度变化有平滑过渡动画
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---

## v0.10.0 — Provider 模型架构重构与流式输出

状态：planned

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
3. [Architecture] 单个 Provider 只能配置一个模型，无法表达同一 Provider 的多个模型（如 deepseek-v4-pro 和 deepseek-v4-flash）
4. [Architecture] Embedding model 配置混在 Provider 中，应改为本地化方案
5. [Feature] Chat 尚未实现流式输出，用户需等待完整回复

方案：

- Provider 页面统一使用 Model 命名，不再区分 chat/embedding
- 每个 Provider 支持手动添加多个模型：通过 + 按钮动态增加输入框，- 按钮删除
- Chat 模型角色从所有 Provider 的模型列表中通过下拉菜单选择，不再手动填写
- Embedding 模型角色改为本地模型方案入口，不再依赖远程 Provider 配置
- 本地 embedding 模型（如 bge-m3）的实际运行和集成延后到后续版本
- 后端 Chat endpoint 支持 SSE 流式输出
- 前端 Chat 消息渲染支持逐 token 流式展示
- Provider 模型列表和 Chat 模型角色选择通过后端 API 持久化

验收标准：

- [ ] Provider 页面中模型配置使用 Model 命名，不出现 chat/embedding 标签区分
- [ ] 每个 Provider 可通过 + 按钮添加新模型输入框，- 按钮删除已有模型
- [ ] Provider 模型名称列表持久化保存
- [ ] Chat 模型角色配置可通过下拉菜单从所有 Provider 的模型中选择
- [ ] Embedding 模型角色不再出现在 Provider 配置页面
- [ ] Embedding 模型角色页面显示本地模型方案入口（实际运行延后）
- [ ] Chat 消息支持 SSE 流式输出，用户可看到逐 token 生成
- [ ] 流式输出中断或出错时正确回退到已生成内容并提示
- [ ] 不存在前端直接调用 PostgreSQL 或 AI Provider SDK 的路径
- [ ] `cd apps/api && pytest` 通过
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---

## v0.11.0 — 编辑器技术选型、Repository 文件系统与 Vault Manager

状态：planned

约束：

- 不实现实时协作编辑
- 不实现非 Markdown 文件的高级编辑
- 不实现 Knowledge 提取的后端创建流程（入口可预留，功能在 v0.12.0 实现）
- 不把 Repository / Vault 与 Project 概念耦合
- 不把 Manage Vaults 做成 SettingsOverlay 子页面
- 不提前实现无真实仓库能力的纯 UI 壳
- 编辑器方案暂不锁定，待选型评估后决定（不预设"先用 textarea"）

解决的问题：

1. [Feature] 中央 Editor 区域尚未实现 Markdown 编辑功能
2. [Feature] 无法打开本地仓库并显示文件树
3. [Feature] 无法在 Editor 中以 Tab 形式打开文件
4. [Feature] 文件系统尚不能创建文件夹或新建文件
5. [Research] 编辑器组件方案未经过系统评估，需先选型再动手
6. [UX] 点击 Manage Vaults 仍打开 Settings，未体现 Repository / Vault 管理的独立信息架构
7. [Feature] 尚未提供独立 Vault Manager，用于查看当前仓库、已注册仓库、新建仓库和打开本地仓库

方案（分两阶段）：

**阶段 1：技术选型评估**
1. 候选方案：CodeMirror 6、TipTap/ProseMirror、Milkdown、Monaco Editor 等（≥3 个）
2. 评估维度：Markdown 语法高亮、编辑/预览切换、WYSIWYG、轻量程度（bundle size/性能）、Tauri/webview 兼容性、AI 辅助可扩展性（inline suggestion、选中文本操作等）
3. 产出推荐方案及理由，用户确认后锁定约束

**阶段 2：编辑器与文件系统实现**
按选型结果实现 Markdown 编辑功能，范围包括文件树、文件/文件夹创建、Tab 管理、编辑/预览切换，以及独立 Vault Manager。

验收标准（选型阶段）：

- [ ] 候选方案列表完整（≥3 个），覆盖轻量到全功能
- [ ] 每个方案按 6 个需求维度给出明确评估
- [ ] 给出推荐方案和理由
- [ ] 用户确认推荐方案后，更新 ROADMAP v0.11.0 约束

验收标准（实现阶段）：

- [ ] 用户可通过左侧文件浏览器打开本地仓库（Repository/Vault）
- [ ] 文件树正确显示仓库目录结构（文件和文件夹）
- [ ] 点击 FileBrowser 底部菜单中的 Manage Vaults 进入独立全屏 Vault Manager，而不是打开 Settings
- [ ] Vault Manager 清楚区分 current vault、available vaults、create vault 和 open local vault actions
- [ ] 用户可在 Vault Manager 中创建新仓库并注册为 Repository
- [ ] 用户可在 Vault Manager 中打开已有本地文件夹并注册为 Repository
- [ ] 用户可在已注册仓库之间切换，FileBrowser 显示当前仓库的文件树
- [ ] Vault Manager 不展示 Project 概念，不承载 Provider、Diagnostics 或 Settings 功能
- [ ] 用户可在当前仓库中新建文件夹
- [ ] 用户可在当前仓库中新建 Markdown 文件
- [ ] 点击文件在中央 Editor 打开新 Tab
- [ ] 支持 Markdown 文件编辑和预览模式切换
- [ ] 支持多 Tab 管理（打开、切换、关闭）
- [ ] 选中文本右键菜单包含「提取为 Knowledge 单元」入口（功能在 v0.12.0 实现）
- [ ] 文件操作提供 loading、empty、error、disabled 和 success feedback
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---

## v0.12.0 — Knowledge 核心

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

## v0.13.0 — RAG 对话与 Project 管理

状态：planned

约束：

- 不重新实现 v0.9.0 已完成的基础非 RAG Chat 流程
- 不实现多轮对话上下文之外的 Agent 自主行为
- 不实现对话分支或版本管理
- 不实现对话导出或分享
- 不实现多用户、团队、权限、云同步或 Project 成员管理
- Project 管理仅限 Chat 视图下半区和当前 Project 配置入口
- Project 配置首版仅包含名称、描述、颜色、归档/删除等轻量字段和危险操作

解决的问题：

1. [Feature] 基础 Chat 尚未升级为基于 Knowledge 的 RAG 问答
2. [Feature] 尚未实现基于 pgvector 的语义检索
3. [Feature] 尚未实现 RAG 问答流程
4. [Feature] 尚未实现 Chat 视图的 Project 选择器
5. [Feature] Chat 页面项目管理器尚不能创建 Project，只能创建 Chat
6. [UX] Project 列表项当前只暴露删除操作，缺少统一的 `...` 操作菜单承载重命名、配置和归档/删除
7. [UX] 当前 Project 名称可以作为配置入口，但不应展示 project UUID
8. [UX] Project selector 必须选择 No project 或 New project 才能关闭，无法通过点击外部取消
9. [Research] 探索 AI Tool / Function Calling 接入方案，评估技术可行性和实现路径

方案：

- 实现 RAG 流程：用户消息 → 语义检索 Knowledge → 构造 prompt → 调用 AI Provider → 展示回答和引用
- 实现 Project 选择器、创建、配置和操作菜单
- 同步探索 AI Tool calling 技术方案（如 OpenAI function calling），评估与 RAG 的结合方式
- Tool calling 的正式实现延后到后续版本，本版本仅做技术探索和方案评估

验收标准：

- [ ] 用户可在已有 conversation 中发送 RAG 问题
- [ ] RAG user message 和 assistant message 正确保存到数据库并关联 conversation
- [ ] 用户提问时后端执行语义检索 → 构造 prompt → 调用 AI Provider
- [ ] 回答展示引用的 Knowledge source references
- [ ] Chat 视图 Project 选择器可切换已有 Project / 新建 Project / 选择不使用 Project
- [ ] Project selector 打开后点击外部区域会自动关闭
- [ ] Project selector 点击外部关闭时保持原 Project 状态，不强迫用户选择 No project 或 New project
- [ ] Project 列表项悬停或聚焦时显示 `...` 操作菜单
- [ ] Project `...` 菜单包含 Rename、Configure、Archive/Delete 等操作
- [ ] Project 危险操作有确认或明确防误触机制
- [ ] 点击 Chat 顶部当前 Project 名称可进入 Project 配置界面
- [ ] Project 配置界面支持编辑名称、描述、颜色，并提供归档/删除入口
- [ ] Chat 顶部和 Project 配置入口均不显示 project UUID
- [ ] 支持 @knowledge 引用特定知识单元
- [ ] 产出 AI Tool calling 技术探索报告，评估与当前架构的集成方案
- [ ] `cd apps/api && pytest` 通过（RAG service + retrieval + Project 管理相关测试）
- [ ] `cd apps/desktop && npm run typecheck` 通过

---

## v0.13.1 — 代码审计与清理

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

## v0.14.0 — Command Palette 与快捷键管理

状态：planned

约束：

- 不实现插件市场或第三方命令扩展系统
- 不实现 Prompt Studio、复杂自动化流程或 Agent 自主执行能力
- 不实现 OS 全局快捷键；首版仅管理 Asteria 应用窗口内快捷键
- 不重构 Settings 全部页面，仅新增快捷键配置所需入口和视图
- 不改变 desktop-first、本地 API 和后端权威边界

解决的问题：

1. [Feature] 需要后期添加 Command Palette，集中承载常用命令入口
2. [UX] 当前按 `Ctrl+P` 会触发浏览器/默认打印行为，和未来命令入口存在冲突
3. [UX] 缺少统一快捷键管理位置，无法查看、修改或检查快捷键冲突

验收标准：

- [ ] Command Palette 可通过应用内注册快捷键打开
- [ ] `Ctrl+P` 等被 Asteria 接管的快捷键不会触发默认打印行为
- [ ] Settings 中新增 Shortcuts / Keyboard 页面或等价入口
- [ ] 快捷键设置页面列出命令名称、当前快捷键和可编辑入口
- [ ] 修改快捷键时能检测并阻止同一作用域内的冲突
- [ ] 用户可恢复默认快捷键
- [ ] 快捷键配置通过本地设置持久化，不依赖云账号或团队设置
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---

## v0.15.0 — UI 中英文切换

状态：planned

约束：

- 仅实现 UI 文案层面的 English / 中文切换
- 不改变 AI 输出语言、内容翻译或 prompt 行为
- 不新增账号、云同步或团队级语言偏好
- 不重构 AppShell 信息架构
- 不引入大型 i18n 框架，除非评估后确认为最小可维护方案

解决的问题：

1. [Feature] 应用尚未支持多语言 UI
2. [UX] 早期用户需要在 English 和中文之间切换界面语言
3. [Architecture] UI 文案缺少集中资源层，后续新增页面容易继续散落硬编码文案

方案：

- 建立最小 i18n 资源层，首版只覆盖 English 和中文
- 将 AppShell、Settings、Chat、Knowledge、FileBrowser、Vault Manager 等已存在或 planned UI 的用户可见文案迁移到语言资源
- 在 Settings 或等价本地偏好入口中提供语言切换
- 语言偏好通过本地 app settings 持久化，缺失翻译时回退到默认语言

验收标准：

- [ ] 用户可在 English 和中文之间切换 UI 语言
- [ ] 语言偏好本地持久化，重启应用后保持
- [ ] 默认语言策略明确（例如跟随系统或默认 English / 中文）
- [ ] 缺失翻译有 fallback，不显示空白 key 或破碎占位
- [ ] 已存在核心 UI 的用户可见文案使用 i18n 资源，而不是散落硬编码
- [ ] UI 语言切换不影响 AI 回复语言、知识内容、Provider 配置或 prompt 行为
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过
