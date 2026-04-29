# Asteria / 星识 UI Interaction Guidelines

本文档是 Asteria / 星识 桌面端 UI 和交互设计的统一约束文件。任何修改 `apps/desktop` 的任务，都应先阅读本文件，并在最终回复中说明改动如何符合本规范。

本文件约束页面结构、页面 contract、组件行为、状态迁移、视觉语言和 AI 生成 UI 的边界；它不替代 `docs/PRD.md`、`docs/ARCHITECTURE.md`、`docs/DESKTOP_APP.md` 或 `docs/API_CONTRACT.md`。

## Product UI Principle

Asteria / 星识 是 desktop-first、AI-native、local-first 的个人知识工作台，不是 Web-first SaaS，也不是营销型页面集合。

UI 应满足：

- 清晰：用户始终知道自己在哪个页面、正在操作哪个对象、当前对象属于哪个 project 或上下文。
- 安静：界面避免过度装饰、强营销感、夸张 hero、炫技动画和大面积渐变。
- 密度适中：优先支持反复使用、扫描、编辑和比较，不追求空洞留白。
- 可回溯：AI 输出必须能回到知识来源、检索片段、模型上下文和本地数据对象。
- 本地感：界面应强调 local API、local database、provider configuration 和 desktop workflow，而不是账号、团队、云同步或 SaaS onboarding。

硬性边界：

- 前端不得直接访问 PostgreSQL 或执行 SQL。
- 前端不得直接调用 OpenAI、OpenAI-compatible endpoint、Provider SDK 或 Provider HTTP API。
- 前端不得实现 embedding 生成、retrieval、prompt 构造或 RAG orchestration。
- 前端只能通过本地 FastAPI / typed API client 获取应用数据和 AI 行为。

## Core Product Workflows

Asteria 的优秀交互应用应围绕三个稳定产品工作流组织，而不是围绕技术模块堆页面。

### 1. 沉淀知识

用户从 Knowledge 页面创建或编辑 knowledge unit，绑定 project 和 tags，并刷新 embeddings。

设计重点：

- 写作、整理和编辑是主流程。
- Tags、project、source URI、embedding status 是辅助上下文，不应压过正文编辑。
- 创建和编辑状态必须明确区分。
- 保存、归档、刷新 embeddings 必须有清楚反馈。

### 2. 组织上下文

Projects 和 Tags 是 conversations 与 knowledge units 的上下文框架。

设计重点：

- 当前筛选条件应始终可见。
- 用户应能快速判断一个 knowledge unit 或 conversation 属于哪个 project。
- Projects 页面负责管理上下文，不承载聊天、RAG 或 provider 配置。
- Tags 是知识组织工具，不应被设计成社交标签或公开分类体系。

### 3. 基于知识提问

Chat 页面以 message thread 为中心，通过 RAG 基于本地知识库回答问题。

设计重点：

- Message thread 是主视觉中心。
- Source references 必须靠近对应 assistant answer 展示。
- Provider、chat model、embedding model、retrieved chunks 是上下文信息，不应抢占主流程。
- 前端只发送用户问题和筛选条件；answer、sources、model metadata 由后端返回后渲染。

## Layout Zones

Asteria UI 采用 Obsidian 风格的多区域布局，由 AppShell 统一管理。所有区域职责固定，不按传统"页面"模式组织。

```
┌──────────────────────────────────────────────────────────────────┐
│  [file-a.md] [file-b.md]                          ← Tab Bar      │
├──────┬─────────────┬──────────────────┬──────────────────────────┤
│      │             │                  │  Chat: ┌───────────────┐ │
│ 工   │  文件浏览器  │   中央 Editor    │        │ Messages+Input│ │
│ 具   │  (可折叠)   │   AI-native     │        ├───────────────┤ │
│ 栏   │             │   工作台        │        │ History/      │ │
│      │  仓库文件树  │                 │        │ Project Mgr   │ │
│      │             │  · md 编辑      │        └───────────────┘ │
│      │  [Vault▾]  │  · AI 辅助      │  Other: ┌───────────────┐ │
│  ⚙️   │             │  · Knowledge 提取│       │ Knowledge/    │ │
│      │             │                 │        │ Outline/Graph │ │
├──────┴─────────────┴──────────────────┴──────────────────────────┤
│  Markdown · Ln 42, Col 18 · 1,280 字 · UTF-8      ← Status Bar  │
└──────────────────────────────────────────────────────────────────┘
```

| Zone | 位置 | 职责 | 可折叠 | Must Not |
| --- | --- | --- | :---: | --- |
| Tab Bar | 顶部 | 打开文件的 Tab 切换，Obsidian 细条风格 | 否 | 承载菜单栏、页面导航或设置入口 |
| VerticalToolbar | 最左侧 | 快捷操作图标（文件浏览器切换、右侧面板切换、命令面板入口），底部固定设置按钮 ⚙️ | 否 | 承载页面导航或业务内容 |
| FileBrowser | 左侧 | 纯文件管理：当前 Repository（Vault）的文件树、仓库切换器、管理仓库入口 | 是 | 涉及 Project 概念或 Project 管理 UI |
| Editor | 中央 | AI-native 工作台：md 编辑/预览、AI 辅助润色、Knowledge 提取、对话式协作 | 否 | 替代右侧面板的 Chat 或 Knowledge 功能 |
| RightPanel | 右侧 | 多功能面板：Chat / Knowledge / Outline / Graph 视图，顶部图标切换 | 是 | 承载文件管理或设置页面 |
| StatusBar | 底部 | 文件类型、行号/列号、字数统计、编码格式、后续扩展 | 否 | 承载主导航或主要操作 |
| SettingsOverlay | 浮层 | 所有配置子页面：Providers、Diagnostics 等，左下角 ⚙️ 进入 | — | 混入文件管理或对话功能 |

窄屏时左右面板可折叠，Editor 区域自动扩展。语义顺序：文件 → 编辑 → 上下文。

## Zone & View UI Contracts

本节定义各布局区域和视图的 contract。AI assistant 修改 UI 时，应先确定目标 zone/view contract，并只在该 contract 内设计交互。

### FileBrowser

Purpose:

- 纯文件管理：浏览当前 Repository（Vault）下的文件系统树，打开文件，切换仓库。

Data Source:

- 通过 Tauri file system API 或本地文件路径读取（后续实现）。当前为占位结构。

Primary Actions:

- 展开/折叠目录。
- 点击文件 → 在中央 Editor 以新 Tab 打开。
- 切换当前激活的 Repository（Vault）。

Secondary Actions:

- 新建/重命名/删除文件或文件夹。
- 拖拽移动文件。

Required States:

- vault 为空（新仓库无文件）。
- vault 已加载。
- 管理仓库页面（独立全屏）。

Layout Rules:

- 面板展开时占据左侧约 240-260px 宽度。
- 底部固定一行仓库切换器：`📁 VaultName ▾`，点击弹出菜单列出所有已创建仓库 + 底部「管理仓库…」入口。
- 文件树占剩余高度，可滚动。

Must Not:

- 不涉及任何 Project 概念或 Project 管理 UI。
- 不在此处展示对话、知识库或设置功能。
- Repository 和 Project 是两条独立概念线。

### Editor (中央工作台)

Purpose:

- AI-native 核心工作台：md 文件编辑/预览、AI 辅助润色、Knowledge 操作、对话式协作。

Data Source:

- 当前打开的文件内容（通过 Tauri file API 或 placeholder）。
- 选中文本时触发 Chat / Knowledge 操作的上下文。

Primary Actions:

- 编辑 md 文件。
- 编辑/预览模式切换。
- 选中文本 → Chat 对话（润色、改写、翻译、解释）。
- 选中文本 → 右键「提取为 Knowledge 单元」。

Secondary Actions:

- 语法高亮、自动补全。
- Chat 感知编辑上下文，参与修改和辅助思考。
- 查看/关联/更新与当前文件相关的 Knowledge。

Required States:

- 无打开文件（empty workspace）。
- 文件已打开，可编辑。
- 文件已打开，预览模式。
- Chat 对话中（AI 辅助操作进行中）。

Layout Rules:

- 占据中央弹性区域，左右面板折叠时自动扩展。
- 无文件打开时展示 empty workspace 占位。
- AI 辅助操作以 inline 或侧出形式呈现，不遮挡主编辑区。

Must Not:

- 不替代右侧面板的 Chat 或 Knowledge 完整视图。
- 编辑区的 AI 辅助是轻量交互，完整对话在右侧 Chat 视图完成。
- 不作为文件管理器使用。

### RightPanel — Chat View

Purpose:

- 在右侧面板中进行 AI 对话，管理对话历史和 Project 上下文。参考 Cursor 风格。

Data Source:

- `GET /api/conversations`、`POST /api/conversations`
- `GET /api/conversations/{id}/messages`、`POST /api/rag/answer`
- `GET /api/projects`（用于 Project 选择器）

Primary Actions:

- 选择或创建 conversation。
- 发送 RAG 问题（支持 `@knowledge` 主动引用知识）。
- 切换/新建 Project（在 Chat 视图下半区操作）。

Secondary Actions:

- 刷新 conversation 列表和消息线程。
- 归档 conversation（需确认）。
- 查看 source references 和 model metadata。

Required States:

- no conversations。
- no selected conversation。
- conversation selected。
- loading conversations。
- loading messages。
- sending message。
- answer received。
- source references empty。
- API or Provider error。

Layout Rules:

- Chat 视图分为上下两区：上半为消息流 + 底部输入框，下半为 History / Project Manager。
- 上半占据主要高度，消息流可滚动，输入框固定在消息区底部。
- 下半为固定高度（约 160px）的 History / Project 管理器，仅在 Chat 视图显示。
- Composer 在未选择 conversation 时禁用。

Must Not:

- 不调用 Provider SDKs 或 Provider endpoints 直接。
- 不合成 assistant messages 或伪造 source references。
- 不在 React 中实现 RAG orchestration。
- 不将 Chat 做成通用社交/团队聊天产品。

### RightPanel — Chat 下半区: History / Project Manager

Purpose:

- 管理对话历史和 Project 上下文。**这是唯一管理 Project 的地方。**

Primary Actions:

- 浏览历史会话列表，点击切换当前 conversation。
- 新建 Chat（清空选中 conversation）。
- 切换 Project（下拉选择现有 Project / 不使用 Project）。
- 新建 Project（通过 Project 选择器底部的 + New Project）。

Secondary Actions:

- 归档 conversation（每项悬停出现归档按钮）。
- 后续：Project 独立配置入口。

Required States:

- 无历史会话。
- 已选择 Project / 未使用 Project。

Layout Rules:

- 固定高度约 160px，内部可滚动。
- 顶部标题行 "History" + 右侧 "+ New Chat" 按钮。
- Project 选择器在输入框下方工具栏中。

Must Not:

- 不在此处管理文件。
- Project 管理不与文件浏览器耦合。

### RightPanel — Knowledge View

Purpose:

- 浏览、搜索和管理 Knowledge 单元。Knowledge 是对话驱动的语义记忆层，脱离文件系统独立存在。

Data Source:

- `GET /api/knowledge-units`、`POST /api/knowledge-units`
- `GET /api/knowledge-units/{id}`、`PUT /api/knowledge-units/{id}`
- `DELETE /api/knowledge-units/{id}`
- `POST /api/knowledge-units/{id}/embeddings/refresh`
- Tag endpoints。

Primary Actions:

- 浏览 Knowledge 卡片/列表。
- 搜索和标签过滤。
- 新建 Knowledge 单元。
- 编辑和归档 Knowledge 单元。
- 切换卡片视图 ↔ 图谱视图。

Secondary Actions:

- 刷新 embeddings。
- 查看 Knowledge 来源对话。
- 关联/更新 Knowledge。

Required States:

- no knowledge units。
- 搜索结果为空。
- loading list。
- selected knowledge unit。
- creating / editing / saving。
- archiving。
- refreshing embeddings。
- validation error / API error。

Layout Rules:

- Knowledge 视图占据右侧面板全高（不上下分）。
- 顶部：卡片/图谱模式切换按钮 + 搜索框。
- 主体：卡片列表或图谱画布。
- 每条 Knowledge 可溯源至来源对话。

Must Not:

- 不暴露 raw embedding vectors。
- 不在无后端支持时创建文件导入/OCR/爬虫 UI。
- Knowledge 操作不与文件系统耦合。

### RightPanel — Outline View

Purpose:

- 展示当前 md 文件的大纲/标题结构树。

Data Source:

- 当前 Editor 打开文件的标题结构（客户端解析）。

Primary Actions:

- 点击标题 → 跳转到 Editor 对应位置。

Required States:

- 无打开文件（提示打开 md 文件）。
- 大纲为空（文件无标题）。
- 大纲已加载。

Must Not:

- 不编辑文件内容。
- 不承载 Chat 或 Knowledge 功能。

### RightPanel — Graph View

Purpose:

- 展示 Knowledge 节点 + 文件节点的关系图谱。

Data Source:

- Knowledge 单元及其关联关系（后续 API 支持）。

Primary Actions:

- 浏览图谱、缩放、拖拽节点。
- 点击节点查看详情。

Required States:

- 图谱为空（无 Knowledge 数据）。
- 图谱已加载。

Must Not:

- 不在此处编辑 Knowledge 或文件。

### SettingsOverlay

Purpose:

- 管理所有应用配置，通过左下角 ⚙️ 进入。当前子页面：Providers、Diagnostics。

Data Source:

- Providers: `GET/POST/PUT/DELETE /api/providers`、`POST /api/providers/{id}/activate`、`POST /api/providers/{id}/health-check`
- Diagnostics: `GET /health`、Provider health-check endpoints。

Primary Actions:

- Providers：Create / Edit / Activate / Health Check / Delete provider。
- Diagnostics：Refresh status、View API/database/provider status。

Required States:

- Providers: no providers / loading / selected / creating / editing / saving / activating / health checking / health ok / health error / validation error / API error。
- Diagnostics: checking / API online / API unavailable / database configured / database missing / provider reachable / provider error。

Layout Rules:

- 独立全屏浮层（z-50），带背景遮罩。
- 左侧子页面 Tab 栏（约 176px 宽），右侧内容区。
- 浮层有标题 "Settings" + 关闭按钮。
- API key 字段不显示已存储 key，仅通过 `has_api_key` 指示。

Must Not:

- 不在此处管理对话、文件或 Knowledge。
- 不暴露 raw `api_key`、`api_key_ciphertext` 或 Provider-specific payloads。
- 不将 Settings 做成账号、团队、云设置。

## Component Interaction Rules

Components should encode repeated interaction contracts. Do not copy inconsistent button, status, and layout behavior page by page.

### AppShell

- Owns global layout: Tab Bar, VerticalToolbar, FileBrowser, Editor, RightPanel, StatusBar, and SettingsOverlay.
- Manages panel visibility (left panel expanded/collapsed, right panel expanded/collapsed).
- Manages right panel active view (Chat / Knowledge / Outline / Graph).
- Manages open file tabs (add, close, switch active tab).
- Manages Settings overlay open/close state.
- Must not own domain data fetching except app-level local service health if explicitly required.
- Must preserve desktop-first navigation and avoid marketing layout patterns.

### VerticalToolbar

- Fixed width 40-48px, always visible, never collapsible.
- Top section: panel toggle buttons (file browser toggle, right panel toggle).
- Middle section: quick action buttons (command palette placeholder, extensible).
- Bottom section: settings gear button ⚙️, fixed at bottom.
- All icon buttons must have `aria-label` and title tooltip.
- Active state (panel open) must be visually distinct (e.g., pine tint background).

### TabBar

- Shows open file tabs as a horizontal row at the top of the layout.
- Each tab shows file name + close button.
- Active tab visually distinct from inactive tabs.
- Clicking a tab switches the active file in Editor.
- Closing a tab removes it; if the active tab is closed, the next tab (or none) becomes active.
- Obsidian style: thin bar (~36px), minimal, subtle borders.
- Must not contain menus, navigation, or settings.

### FileBrowser

- Collapsible left panel, ~240-260px wide when expanded.
- Shows file tree of the currently active Repository (Vault).
- Bottom: single-row vault switcher (`📁 VaultName ▾`), clicking opens a popup menu.
- Vault switcher menu lists all created vaults (checkmark on active) + "Manage Vaults…" at bottom.
- Must not show Project concepts, Chat functions, or settings.
- Must not mix file management with Project management.

### Editor

- Central work area, flexible width, expands when panels collapse.
- Renders open file tabs content; shows empty workspace placeholder when no files open.
- Supports md editing / preview mode toggle.
- AI-assisted interactions (selection → Chat) are lightweight triggers, not full Chat UI.
- Knowledge extraction actions triggered from context menu or shortcut.

### RightPanel

- Collapsible right panel, ~320px wide when expanded.
- Top: icon button row for view switching (Chat / Knowledge / Outline / Graph).
- Content area renders the active view.
- Chat view uses split layout (messages+input top, history/project manager bottom).
- All other views use full height.
- When collapsed, a narrow strip shows an expand toggle button.

### StatusBar

- Single row at the bottom of the layout, ~24px height.
- Left-aligned info: file type, line:col, word count, encoding.
- Extensible for future: git branch, AI status indicator, etc.
- Must not contain primary navigation or major actions.

### SettingsOverlay

- Full-screen overlay with backdrop blur, triggered by toolbar gear icon.
- Contains a left tab sidebar and right content area within a modal container.
- Tabs: Providers, Diagnostics (extensible for future settings pages).
- Close button (×) in header, Escape key dismisses.
- Must not duplicate as a page in any other zone.

### EmptyState

- Explains why the area is empty and what the next valid action is.
- Must distinguish true empty data from filtered no results.
- Must not use decorative illustration as a substitute for actionable text.

### ErrorState

- Shows what failed and what the user can do next.
- Must be close to the failed region.
- Must not expose Provider-specific raw payloads, stack traces, SQL errors, or secrets.

### LoadingState

- Indicates which region is loading.
- Must avoid shifting stable layout dimensions.
- Must not block unrelated regions when only one list, panel, or action is loading.

### ConfirmDialog

- Required for destructive or hard-to-reverse actions unless an equivalent two-step safeguard exists.
- Must have a clear title, explicit cancel action, explicit confirm action, and close affordance.
- Confirm button must describe the destructive action, such as "Archive knowledge" rather than "OK".

### Toast

- Used only for short-lived success or non-blocking status feedback.
- Must not replace field validation or region-level errors.
- Must not permanently occupy primary workspace.

### SourceReferenceCard

- Displays one RAG source reference from backend data.
- Must include source title, score when provided, chunk text or excerpt, and knowledge unit identity.
- Must appear near the assistant answer it grounds or in a clearly linked source region.
- Must not fabricate missing source data.

### ProviderStatusBadge

- Displays provider state such as active, idle, checking, reachable, or error.
- Must use text plus visual styling; color alone is insufficient.
- Must not reveal API keys or provider raw errors.

## Interaction State Model

对象管理页面必须显式表达以下状态，不允许靠隐含条件让用户猜当前模式。

- `empty`：没有对象或筛选无结果，应说明当前为空的原因和下一步动作。
- `loading`：页面级加载只影响当前数据区域，不应冻结整个 app shell。
- `error`：错误必须靠近出错区域展示，并提供 refresh、retry 或可操作说明。
- `selected`：列表中被选对象必须有明确视觉状态；详情区必须显示对应对象标题或标识。
- `creating`：新建模式必须与编辑模式有不同标题和主按钮文案。
- `editing`：编辑已有对象时，主按钮应表达保存已有对象，而不是笼统提交。
- `saving`：只锁定正在提交的表单和相关动作，按钮文案应变为进行中状态。
- `archiving`：归档或删除类动作必须有防误触设计。
- `success feedback`：成功提示应短暂、低打扰、靠近触发动作，不应长期占据主工作区。

状态命名可以在代码中不同，但 UI 行为必须覆盖以上语义。

## State Transition Rules

### Knowledge view: browse / search / manage flow

1. Knowledge 视图通过 API client 加载 knowledge units。
2. 列表为空时显示 EmptyState，引导用户新建或等待 Agent 对话驱动生成。
3. 默认为卡片/列表视图；可切换到图谱视图。
4. 搜索和标签过滤只影响当前视图数据，不冻结右侧面板其他区域。
5. 新建/编辑 Knowledge 在右侧面板知识视图内完成。
6. 归档需确认。
7. Refresh embeddings 仅对已存在的活跃 knowledge unit 可用，需显示后端返回摘要。
8. 图谱视图展示 Knowledge 节点及其关系边。

### Chat view: send message / receive answer / render sources flow

1. Chat 视图加载 conversations 和 projects。
2. 未选择 conversation 时，composer 禁用，消息区提示选择或创建 conversation。
3. 选择 conversation → 加载消息线程。
4. 发送前验证非空内容 → `POST /api/rag/answer`。
5. 发送期间禁用 composer submit，显示 sending 状态，不冻结 history 列表。
6. 成功后追加或重载后端返回的 user message 和 assistant message。
7. Assistant answer 只渲染后端返回数据。
8. Source references 从后端 response 渲染，靠近 assistant answer 展示。
9. Provider/API 失败时：消息未被接受则保留用户输入；若后端已保存 user message 则重载消息反映持久化状态。
10. 不创建可能与后端持久化数据混淆的 fake assistant placeholder。

### Chat view: Project 管理 flow

1. Chat 输入框下方工具栏显示当前 Project 状态（使用 Project / 无 Project）。
2. 点击弹出菜单：列出已有 Projects（可切换）+ "+ New Project"。
3. 新建 Project 触发创建流程（可内联或弹出），保存后自动设为当前 Project。
4. Project 管理仅在 Chat 视图下半区进行，不涉及 FileBrowser。

### SettingsOverlay: provider configuration / health check / diagnostics flow

1. 打开 Settings（左下角 ⚙️ 或 FileBrowser 底部「管理仓库…」）。
2. Providers Tab：加载 provider list；无 provider 时显示 EmptyState 和创建表单。
3. 选择 provider → 表单进入编辑状态，清除 API key 输入。
4. 保存/激活/health check/删除 操作遵循原有 Settings 状态迁移规则。
5. Diagnostics Tab：展示本地 API/database/provider 状态，可刷新。
6. Diagnostics Tab 不承载编辑功能；缺失 Provider 时引导用户切换到 Providers Tab。
7. 点击关闭按钮或按 Escape 关闭 SettingsOverlay。

## Action Rules

页面动作必须遵守稳定层级。

- 主动作放在详情区或编辑区，例如 Save、Create、Send。
- 列表区只放选择、筛选、刷新和新建入口。
- 新建入口可以在列表区或详情区顶部，但进入后必须清楚切换到 creating 状态。
- Archive、Delete、Clear key 等危险动作必须使用红色语义、二次确认或明确的防误触模式。
- Refresh 只刷新当前区域数据；不要把 refresh 伪装成保存、重新生成或重新配置。
- Disabled 状态必须说明条件：例如未选择 conversation 时不能发送 message。
- 成功和错误反馈必须就近，不要只在页面底部或全局区域出现。

## Visual System

Asteria 的视觉风格应是 restrained、dense、scannable 的桌面工具。

基础规则：

- 使用中性背景、清楚边界、少量强调色。
- 使用现有 Tailwind 配置和本地组件风格，避免为单页任务引入新 UI 框架。
- 页面区块应服务工作流，不做装饰性 section。
- 卡片只用于真实信息单元、表单容器、列表项、状态块或 modal，不做无意义嵌套。
- 避免大面积渐变、装饰性图形、营销 hero、pricing/login/team admin 风格。
- 避免让页面被单一色系支配；强调色用于 active、focus、primary action 和 status。
- 字体层级应克制：页面标题最大，panel 标题紧凑，列表项和表单标签适合扫描。
- 固定格式区域应有稳定尺寸或响应式约束，避免 loading、hover、长文本导致布局跳动。

## Accessibility

Accessibility 是 UI contract 的一部分，不是后期 polish。

- 所有表单字段必须有可见 label。
- 表单错误必须与字段关联，例如通过 `aria-describedby`、错误文本 id 或等价语义结构。
- Icon-only button 必须有 `aria-label`。
- Dialog 必须有明确标题、关闭方式、取消动作和键盘可访问路径。
- 不能只靠颜色表达状态；必须同时使用文本、图标语义或可读标签。
- 列表项、按钮、输入框、select、textarea 和可点击卡片必须有可见 focus 状态。
- 按钮必须使用语义化 `button`，并有清楚文案或可访问名称。
- 错误信息应与字段或区域关联，不能只靠全局 toast 表达。
- 长文本、URL、ID 和 source snippets 必须可换行，不能撑破容器。
- Disabled 控件应有清楚原因或由周围上下文解释。

## AI-Native Knowledge UX

AI 在 Asteria 中是知识查询、回溯和生成层，不是独立聊天娱乐功能。

必须遵守：

- Chat UI 不直接调用 OpenAI、OpenAI-compatible endpoint 或任何 Provider SDK。
- Assistant answer 和 source references 只渲染后端返回的数据。
- RAG source references 应靠近对应 assistant answer，至少展示 title、score、chunk text 和 knowledge unit identity。
- Provider/model/embedding metadata 是上下文状态，应帮助用户判断回答来源和可靠性。
- Provider failures 必须以可操作错误展示，不暴露 Provider-specific raw payload。
- 不伪造 sources、embedding 状态、provider health 或 model metadata。

## Change Scope Control

UI 修改必须小步、可验证、可回滚。不要用一次大重写掩盖交互决策。

- 一次任务只优化一个页面、一个 workflow 或一组明确共享组件。
- 不允许一次性重写所有页面、全局样式、导航和 API wiring。
- 不允许为了单个页面引入新的 UI 框架、状态管理框架、路由方案或设计系统。
- 不允许在 UI 任务中修改 backend schema、RAG logic、Provider adapter 或 database behavior，除非任务明确包含这些范围。
- 不允许重命名大量已有概念来追求视觉统一；术语应跟 PRD 和 API contract 一致。
- 如果需要新增共享组件，先抽取最小公共交互模式，再逐页迁移。
- 如果当前页面存在用户未提交改动，必须保留并顺着现有改动工作，不得回滚。
- 大型 UI 改造应拆为：规范更新、组件抽取、单页迁移、后续页面迁移、验证与 polish。

## Agent Workflow For UI Changes

任何 agent 修改 `apps/desktop` 前必须：

1. 阅读 `docs/PRD.md`、`docs/DESKTOP_APP.md`、`docs/ARCHITECTURE.md`、`docs/API_CONTRACT.md` 和本文档。
2. 明确本次任务对应哪个 Layout Zone 或 View UI Contract。
3. 明确本次任务涉及哪些 Component Interaction Rules。
4. 明确本次任务涉及哪些 Interaction State 和 State Transition Rules。
5. 确认不会改变 desktop-first、AI-native、local-first 的架构边界。
6. 确认不引入 Web-first、SaaS-first、multi-user、login、cloud sync 或 plugin marketplace 语义。

实现过程中必须：

- 只修改任务范围内的 zone、view 或组件。
- 优先复用现有 API client、types、Tailwind token 和本地组件。
- 不在前端增加数据库访问、Provider 调用、RAG orchestration 或 provider-specific payload。
- 不用长期 mock 代替缺失后端业务逻辑；缺失能力应作为后续任务记录。
- 保持 loading、empty、error、disabled、success states 完整。

完成后最终回复必须报告：

- 修改摘要。
- 修改文件。
- 运行的测试命令和结果。
- UI 规范符合性：说明符合的 Zone/View UI Contract、Component Interaction Rules、State Transition Rules 和 Action Rules。
- 未覆盖的后续 UI 改造建议。

## Acceptance Checklist

任意 UI 任务完成前，应能回答：

- 这个改动是否符合规定的 Layout Zone 或 View UI Contract？
- 用户是否能明确区分 empty、loading、error、selected、creating、editing、saving 和 success feedback？
- 主动作、次动作和危险动作是否层级清楚？
- RAG sources、provider context 和 local API 状态是否展示在正确位置（Chat 消息区、右侧面板内）？
- UI 是否仍然像本地知识工作台，而不是 SaaS 营销页面？
- 前端是否仍然只通过本地 FastAPI / API client 访问应用数据和 AI 行为？
- 本次改动是否 zone-by-zone 或 component-by-component，而不是无边界重写？
- 可访问性规则是否覆盖了 label、focus、aria、dialog、错误关联和非颜色状态表达？
